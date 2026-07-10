import { supabase } from "./supabase";

// ─── Firestore REST (sem SDK) ─────────────────────────────────────────────────
const FIREBASE_PROJECT = "gestao-de-tempo";
const FIREBASE_API_KEY = "AIzaSyCVJtHQ_nzIWGKoMYVCk81Dz67L1zvTvuA";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

type FsValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { integerValue: string };

function fsField(v: FsValue | undefined): string | boolean | null {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("integerValue" in v) return v.integerValue;
  return null;
}

async function fsGetAll(collection: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let pageToken: string | null = null;

  do {
    const url = new URL(`${FS_BASE}/${collection}`);
    url.searchParams.set("key", FIREBASE_API_KEY);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Firestore ${collection}: ${res.status}`);
    const json = await res.json();

    for (const doc of json.documents ?? []) {
      const f = doc.fields ?? {};
      rows.push(
        Object.fromEntries(
          Object.entries(f).map(([k, v]) => [k, fsField(v as FsValue)])
        )
      );
    }

    pageToken = json.nextPageToken ?? null;
  } while (pageToken);

  return rows;
}

// ─── Tipos Supabase ───────────────────────────────────────────────────────────
export interface CrmStatus {
  documento: string;
  empresa: string;
  status_crm: string;
  motivo_perda?: string | null;
  concorrente?: string | null;
  lembrete_data?: string | null;
  vendedor?: string | null;
  vendedor_codigo?: string | null;
  endereco_obra?: string | null;
  fechamento_previsto?: string | null;
  entrega_prevista?: string | null;
  updated_at?: string;
  itens_estoque?: string[] | null;
  itens_preco?: string[] | null;
  // Timestamp de quando o alerta de "PERDA DE ORÇAMENTO" foi enviado por WhatsApp.
  // Usado como trava de idempotência para não reenviar o mesmo orçamento.
  perda_notificada_em?: string | null;
}

export interface CrmConversa {
  id?: string;
  documento: string;
  empresa: string;
  obs: string;
  enviado_por?: string | null;
  enviado_por_nome: string;
  enviado_por_foto?: string | null;
  timestamp?: string;
  lida?: boolean;
  fechada?: boolean;
  // null = sem destinatário resolvido (ex: vendedor ainda sem responsável definido) — a mensagem
  // fica registrada, mas não aparece na caixa de entrada de ninguém.
  destino?: string | null;
}

// ─── Supabase helpers ────────────────────────────────────────────────────────
export async function getCrmStatus(documento: string): Promise<CrmStatus | null> {
  const { data } = await supabase
    .from("crm_status")
    .select("*")
    .eq("documento", documento)
    .single();
  return data ?? null;
}

export async function upsertCrmStatus(payload: CrmStatus): Promise<void> {
  await supabase
    .from("crm_status")
    .upsert(
      { ...payload, updated_at: new Date().toISOString() },
      { onConflict: "documento,empresa" }
    );
}

export async function getConversas(documento: string): Promise<CrmConversa[]> {
  const { data } = await supabase
    .from("crm_conversas")
    .select("*")
    .eq("documento", documento)
    .order("timestamp", { ascending: true });
  return data ?? [];
}

// Fecha (esconde) conversas no banco marcando fechada=true — persiste entre
// dispositivos/sessões, sem apagar o histórico. Uma nova mensagem reabre a conversa.
export async function fecharConversas(documentos: string[]): Promise<void> {
  const docs = [...new Set(documentos.filter(Boolean))];
  if (docs.length === 0) return;
  const CHUNK = 200; // evita URL longa demais no filtro .in()
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = docs.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("crm_conversas")
      .update({ fechada: true })
      .in("documento", batch);
    if (error) {
      console.error("[CRM] erro ao fechar conversas:", error.message);
      throw error;
    }
  }
}

export async function addConversa(conversa: Omit<CrmConversa, "id">): Promise<void> {
  const { error } = await supabase
    .from("crm_conversas")
    .insert({
      ...conversa,
      timestamp: conversa.timestamp ?? new Date().toISOString(),
    });

  if (error) {
    console.error("[CRM] erro ao adicionar conversa:", error.message, error.details);
    throw error;
  }
}

// ─── Migração Firebase → Supabase (completa) ──────────────────────────────────
export async function migrarDoFirebase(): Promise<{ status: number; conversas: number }> {
  // 1. crm_status
  const statusRows = await fsGetAll("crm_status");
  let statusCount = 0;
  if (statusRows.length > 0) {
    const { error } = await supabase.from("crm_status").upsert(
      statusRows.map((r) => ({
        documento: String(r.documento ?? ""),
        empresa: String(r.empresa ?? "001"),
        status_crm: String(r.status_crm ?? "Emitido"),
        motivo_perda: r.motivo_perda ?? null,
        concorrente: r.concorrente ?? null,
        lembrete_data: r.lembrete_data ?? r.lembreteData ?? r.proximo_contato ?? null,
        vendedor: r.vendedor ?? null,
        vendedor_codigo: r.vendedor_codigo ?? null,
        endereco_obra: r.endereco_obra ?? null,
        fechamento_previsto: r.fechamento_previsto ?? null,
        entrega_prevista: r.entrega_prevista ?? null,
        updated_at: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
      })),
      { onConflict: "documento,empresa" }
    );
    if (!error) statusCount = statusRows.length;
  }

  // 2. crm_notificacoes → crm_conversas
  const notifRows = await fsGetAll("crm_notificacoes");
  let conversasCount = 0;
  if (notifRows.length > 0) {
    const { error } = await supabase.from("crm_conversas").upsert(
      notifRows
        .filter((r) => r.documento && r.obs)
        .map((r) => ({
          documento: String(r.documento),
          empresa: String(r.empresa ?? "001"),
          obs: String(r.obs),
          enviado_por: r.enviado_por ? String(r.enviado_por) : null,
          enviado_por_nome: String(r.enviado_por_nome ?? "Sistema"),
          enviado_por_foto: r.enviado_por_foto ? String(r.enviado_por_foto) : null,
          timestamp: r.timestamp ? String(r.timestamp) : new Date().toISOString(),
          lida: Boolean(r.lida),
          fechada: Boolean(r.fechada),
          destino: String(r.destino ?? "todos"),
        })),
      { ignoreDuplicates: true }
    );
    if (!error) conversasCount = notifRows.length;
  }

  return { status: statusCount, conversas: conversasCount };
}

// ─── Sincroniza apenas lembrete_data faltante do Firestore → Supabase ────────
export async function sincronizarLembreteData(): Promise<{ atualizados: number; erros: number }> {
  const fsRows = await fsGetAll("crm_status");
  let atualizados = 0;
  let erros = 0;

  const comLembrete = fsRows.filter((r) =>
    r.lembrete_data ?? r.lembreteData ?? r.proximo_contato
  );

  for (const r of comLembrete) {
    const documento = String(r.documento ?? "");
    if (!documento) continue;
    const lembrete = String(r.lembrete_data ?? r.lembreteData ?? r.proximo_contato);

    const { error } = await supabase
      .from("crm_status")
      .update({ lembrete_data: lembrete })
      .eq("documento", documento)
      .is("lembrete_data", null);

    if (error) erros++;
    else atualizados++;
  }

  return { atualizados, erros };
}

// ─── Responsável (líder direto) de um vendedor ───────────────────────────────
// Cada vendedor tem um "responsável" (usuarios.responsavel_id) que substitui o
// antigo centralizador único global: agora cada um recebe as mensagens só dos
// seus próprios subordinados. Aceita tanto o código de operador do ERP (ex:
// "058") quanto o uuid do usuário (algumas mensagens antigas guardam o uuid
// em enviado_por/destino), por isso tenta os dois formatos.
export async function getResponsavelIdForVendedor(
  sellerCodeOrId?: string | null
): Promise<string | null> {
  const raw = String(sellerCodeOrId || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/^0+/, "");
  if (!normalized) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("id, operator_code, responsavel_id")
    .not("responsavel_id", "is", null);

  const match = (data || []).find((u) => {
    if (u.id === raw) return true;
    const code = String(u.operator_code || "").trim().replace(/^0+/, "");
    return !!code && code === normalized;
  });

  return match?.responsavel_id || null;
}

export async function getCrmStatusMap(
  documentos: string[]
): Promise<Map<string, CrmStatus>> {
  if (!documentos || documentos.length === 0) return new Map();

  // Divide em blocos de 500 para evitar limites de query do Supabase/Postgrest
  const chunks: string[][] = [];
  for (let i = 0; i < documentos.length; i += 500) {
    chunks.push(documentos.slice(i, i + 500));
  }

  const map = new Map<string, CrmStatus>();

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("crm_status")
      .select("documento,empresa,status_crm,motivo_perda,lembrete_data,fechamento_previsto,entrega_prevista,endereco_obra,vendedor,vendedor_codigo,updated_at")
      .in("documento", chunk);

    if (error) {
      console.error("[CRM] getCrmStatusMap error:", error.code, error.message, error.details);
      continue;
    }

    if (!data || data.length === 0) {
      console.warn(`[CRM] No data found for chunk of ${chunk.length} items. First ID: ${chunk[0]}`);
    }

    for (const row of data ?? []) {
      map.set(row.documento.trim(), row);
    }
  }

  return map;
}

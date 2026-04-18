import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zwfvrmqffxcqurxpfewi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDMwMzksImV4cCI6MjA5MjAxOTAzOX0.6Q02L0XYE7xWtn0AcCwN2KDTvRaYQgGwoTPLblR-VgE";

const FIREBASE_PROJECT = "gestao-de-tempo";
const FIREBASE_API_KEY = "AIzaSyCVJtHQ_nzIWGKoMYVCk81Dz67L1zvTvuA";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fsField(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("integerValue" in v) return v.integerValue;
  if ("nullValue" in v) return null;
  return null;
}

async function fsGetAll(collection) {
  const rows = [];
  let pageToken = null;

  do {
    const url = new URL(`${FS_BASE}/${collection}`);
    url.searchParams.set("key", FIREBASE_API_KEY);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore ${collection}: ${res.status} - ${text}`);
    }
    const json = await res.json();

    for (const doc of json.documents ?? []) {
      const f = doc.fields ?? {};
      rows.push(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fsField(v)])));
    }

    pageToken = json.nextPageToken ?? null;
  } while (pageToken);

  return rows;
}

async function migrar() {
  console.log("🔥 Buscando crm_status do Firebase...");
  const statusRows = await fsGetAll("crm_status");
  console.log(`   → ${statusRows.length} registros encontrados`);

  if (statusRows.length > 0) {
    const payload = statusRows
      .filter((r) => r.documento)
      .map((r) => ({
        documento: String(r.documento),
        empresa: String(r.empresa ?? "001"),
        status_crm: String(r.status_crm ?? "Emitido"),
        motivo_perda: r.motivo_perda ?? null,
        concorrente: r.concorrente ?? null,
        lembrete_data: r.lembrete_data ?? null,
        vendedor: r.vendedor ?? null,
        vendedor_codigo: r.vendedor_codigo ?? null,
        endereco_obra: r.endereco_obra ?? null,
        fechamento_previsto: r.fechamento_previsto ?? null,
        entrega_prevista: r.entrega_prevista ?? null,
        updated_at: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
      }));

    const { error } = await supabase
      .from("crm_status")
      .upsert(payload, { onConflict: "documento,empresa" });

    if (error) console.error("   ❌ Erro ao salvar crm_status:", error.message);
    else console.log(`   ✅ ${payload.length} status salvos no Supabase`);
  }

  console.log("\n🔥 Buscando crm_notificacoes do Firebase...");
  const notifRows = await fsGetAll("crm_notificacoes");
  console.log(`   → ${notifRows.length} registros encontrados`);

  if (notifRows.length > 0) {
    const payload = notifRows
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
      }));

    const BATCH = 50;
    let saved = 0;
    for (let i = 0; i < payload.length; i += BATCH) {
      const chunk = payload.slice(i, i + BATCH);
      const { error } = await supabase.from("crm_conversas").insert(chunk);
      if (error) { console.error(`   ❌ Lote ${i}-${i + BATCH}:`, error.message); break; }
      saved += chunk.length;
      process.stdout.write(`\r   → ${saved}/${payload.length} inseridos...`);
    }
    console.log(`\n   ✅ ${saved} conversas salvas no Supabase`);
  }

  console.log("\n✅ Migração concluída!");
}

migrar().catch(console.error);

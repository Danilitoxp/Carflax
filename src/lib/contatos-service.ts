// ── Serviço de Contatos Comerciais ───────────────────────────────────────────
// Log de contatos/ações dos vendedores (Supabase). Base do módulo de
// Performance de Recuperação. A "recuperação" é derivada no frontend cruzando
// created_at do contato com a última compra do cliente (dado do ERP/FRV).
import { supabase } from "./supabase";

export type ContatoTipo = "ligacao" | "visita" | "whatsapp" | "email" | "outro";
export type ContatoResultado = "realizado" | "agendado" | "negociando" | "sem_interesse" | "sem_contato";

export interface ContatoComercial {
  id: string;
  cliente_id: string;
  cliente_nome: string | null;
  vendedor_cod: string | null;
  vendedor_nome: string | null;
  tipo: ContatoTipo;
  resultado: ContatoResultado;
  observacao: string | null;
  valor_potencial: number | null;
  score_no_contato: number | null;
  autor_id: string | null;
  autor_nome: string | null;
  created_at: string;
}

export type NovoContato = Omit<ContatoComercial, "id" | "created_at">;

export const TIPO_LABEL: Record<ContatoTipo, string> = {
  ligacao: "Ligação",
  visita: "Visita",
  whatsapp: "WhatsApp",
  email: "E-mail",
  outro: "Outro",
};

export const RESULTADO_LABEL: Record<ContatoResultado, string> = {
  realizado: "Contato realizado",
  agendado: "Visita/retorno agendado",
  negociando: "Em negociação",
  sem_interesse: "Sem interesse",
  sem_contato: "Não conseguiu contato",
};

export async function registrarContato(contato: NovoContato): Promise<void> {
  const { error } = await supabase.from("contatos_comerciais").insert([contato]);
  if (error) {
    console.error("[Contatos] erro ao registrar:", error.message, error.details);
    throw error;
  }
}

// Lista contatos dos últimos N dias (padrão 180), mais recentes primeiro.
export async function listarContatos(dias = 180): Promise<ContatoComercial[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const { data, error } = await supabase
    .from("contatos_comerciais")
    .select("*")
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Contatos] erro ao listar:", error.message, error.details);
    throw error;
  }
  return (data || []) as ContatoComercial[];
}

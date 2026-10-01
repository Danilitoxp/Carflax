import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ─── Acessos às telas do HUB ─────────────────────────────────────────────────
// Duas coisas diferentes, de propósito:
// 1. registrarAcesso → grava em hub_acessos (histórico: o que mais é usado).
// 2. atualizarPresenca → canal de presença do Realtime (quem está online e em
//    qual tela AGORA). Não grava nada no banco; some quando a aba fecha.

export interface PerfilAcesso {
  id?: string;
  name?: string;
  department?: string;
}

// Link do inventário de ferramentas (artefato publicado no Claude).
export const INVENTARIO_FERRAMENTAS_URL = "https://claude.ai/artifact/L7iKSt4bNQR9zoN3u72vxc";

// Mesma tela aberta de novo em menos de 2 min (F5, voltar do chat, etc.) não
// conta como novo acesso — senão o ranking premia quem dá mais refresh.
const JANELA_DEDUPE_MS = 2 * 60 * 1000;
let ultimo: { secao: string; em: number } | null = null;

export async function registrarAcesso(secao: string, perfil: PerfilAcesso | null | undefined, origem = "hub") {
  if (!secao || !perfil?.id) return;
  const agora = Date.now();
  if (ultimo && ultimo.secao === secao && agora - ultimo.em < JANELA_DEDUPE_MS) return;
  ultimo = { secao, em: agora };
  const { error } = await supabase.from("hub_acessos").insert({
    user_id: perfil.id,
    user_nome: perfil.name ?? null,
    departamento: perfil.department ?? null,
    secao,
    origem,
  });
  // Nunca atrapalha o uso do HUB: se falhar, só registra no console.
  if (error) console.warn("[acessos] Não foi possível registrar o acesso:", error.message);
}

// ─── Presença (online agora) ─────────────────────────────────────────────────
export interface PresencaInfo {
  user_id: string;
  nome: string;
  departamento?: string | null;
  secao: string;
  desde: string; // ISO — quando entrou nesta tela
}

// Canal único por aba: o App rastreia a própria presença e a tela Uso do HUB
// só escuta. Dois channel() com o mesmo nome no mesmo cliente se atrapalham.
let canal: RealtimeChannel | null = null;
let inscrito = false;
let atual: PresencaInfo | null = null;
const ouvintes = new Set<(lista: PresencaInfo[]) => void>();

function listaAtual(): PresencaInfo[] {
  if (!canal) return [];
  const estado = canal.presenceState<PresencaInfo>();
  // Uma pessoa com duas abas aparece duas vezes: fica a tela mais recente.
  const porUsuario = new Map<string, PresencaInfo>();
  Object.values(estado).flat().forEach((p) => {
    const ant = porUsuario.get(p.user_id);
    if (!ant || p.desde > ant.desde) porUsuario.set(p.user_id, p);
  });
  return Array.from(porUsuario.values());
}

function garantirCanal(chave: string) {
  if (canal) return canal;
  canal = supabase.channel("hub-presenca", { config: { presence: { key: chave } } });
  canal
    .on("presence", { event: "sync" }, () => {
      const lista = listaAtual();
      ouvintes.forEach((cb) => cb(lista));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        inscrito = true;
        if (atual) await canal!.track(atual);
      }
    });
  return canal;
}

export function atualizarPresenca(perfil: PerfilAcesso | null | undefined, secao: string) {
  if (!perfil?.id || !secao) return;
  atual = {
    user_id: perfil.id,
    nome: perfil.name || "Sem nome",
    departamento: perfil.department ?? null,
    secao,
    desde: new Date().toISOString(),
  };
  const ch = garantirCanal(perfil.id);
  if (inscrito) ch.track(atual).catch(() => {});
}

export function ouvirPresenca(cb: (lista: PresencaInfo[]) => void) {
  ouvintes.add(cb);
  if (canal) cb(listaAtual());
  return () => {
    ouvintes.delete(cb);
  };
}

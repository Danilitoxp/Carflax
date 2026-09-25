import { supabase } from "@/lib/supabase";

// Quem deve ser avisado de mensagem nova no WhatsApp.
//
// Antes, todo atendente com acesso ao WhatsApp recebia aviso de TODA mensagem,
// inclusive de cliente que outro atendente já estava atendendo. A regra agora:
//   - cliente com atendente (`vendedor_id`) → só esse atendente é avisado;
//   - cliente sem atendente (lead novo)      → todos são avisados, porque
//     alguém precisa pegar.
//
// O dono é lido do banco na hora da mensagem (e não de um estado da tela)
// porque a conversa pode ter sido assumida em outra aba ou por outra pessoa
// segundos antes. Guarda por alguns segundos para não consultar a cada
// mensagem de uma rajada ("oi", "tudo bem?", "preciso de…").

const CACHE_MS = 15_000;
const cache = new Map<string, { dono: string | null; em: number }>();

async function donoDaConversa(remoteJid: string): Promise<string | null> {
  const guardado = cache.get(remoteJid);
  if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado.dono;

  const { data } = await supabase
    .from("marketing_clientes")
    .select("vendedor_id")
    .eq("remote_jid", remoteJid)
    .maybeSingle();
  const dono = data?.vendedor_id ? String(data.vendedor_id) : null;
  cache.set(remoteJid, { dono, em: Date.now() });
  return dono;
}

export async function deveNotificarWhatsapp(
  remoteJid: string,
  usuarioId: string | undefined | null,
): Promise<boolean> {
  if (!remoteJid || !usuarioId) return false;
  try {
    const dono = await donoDaConversa(remoteJid);
    return !dono || dono === String(usuarioId);
  } catch {
    // Sem conseguir saber o dono, é melhor avisar do que deixar o cliente sem resposta.
    return true;
  }
}

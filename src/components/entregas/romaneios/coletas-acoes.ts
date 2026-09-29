import { supabase } from "@/lib/supabase";

/** Marca a coleta como feita (o motorista já buscou no fornecedor). */
export async function marcarColetada(id: string, usuarioId?: string) {
  await supabase
    .from("coletas")
    .update({ status: "coletada", coletada_em: new Date().toISOString(), coletada_por: usuarioId ?? null })
    .eq("id", id);
}

/** Tira do romaneio: a coleta volta para a fila da aba Coletas. */
export async function tirarDoRomaneio(id: string) {
  await supabase
    .from("coletas")
    .update({
      status: "solicitada",
      rom_code: null,
      rom_date: null,
      driver_cod: null,
      driver_name: null,
      programada_em: null,
      programada_por: null,
      sort_order: null,
    })
    .eq("id", id);
}

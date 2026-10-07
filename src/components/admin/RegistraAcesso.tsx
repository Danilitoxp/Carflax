import { useEffect } from "react";
import { atualizarPresenca, registrarAcesso, type PerfilAcesso } from "@/lib/acessos";

/** Grava o acesso de telas que vivem fora do HUB (Gestor, Vendedor no celular). */
export function RegistraAcesso({ secao, perfil, origem }: { secao: string; perfil: PerfilAcesso | null | undefined; origem: string }) {
  useEffect(() => {
    if (!perfil?.id) return;
    registrarAcesso(secao, perfil, origem);
    atualizarPresenca(perfil, secao);
    // App instalado no celular fica aberto em segundo plano: voltar para ele
    // não recarrega a página, então só o primeiro uso era contado (diretoria
    // abria o Gestor várias vezes por dia e aparecia 1 acesso). Cada volta ao
    // app conta; o dedupe de 2 min de registrarAcesso evita contar troca rápida.
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      registrarAcesso(secao, perfil, origem);
      atualizarPresenca(perfil, secao);
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, secao]);
  return null;
}

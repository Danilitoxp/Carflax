import { useEffect } from "react";
import { atualizarPresenca, registrarAcesso, type PerfilAcesso } from "@/lib/acessos";

// Para telas que vivem fora do HUB principal (/gestor, /vendedor): registra o
// acesso e a presença assim que o perfil carrega. Não renderiza nada.
export function RegistraAcesso({ secao, perfil, origem }: { secao: string; perfil: PerfilAcesso | null | undefined; origem: string }) {
  useEffect(() => {
    if (!perfil?.id) return;
    registrarAcesso(secao, perfil, origem);
    atualizarPresenca(perfil, secao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, secao]);
  return null;
}

import { useEffect, useState } from "react";
import { trimestresPendentes } from "@/components/crm/campanhas/casa-nova";

/** Disparado quando alguém escolhe/apaga um prêmio trimestral: a bolinha recalcula. */
export const EVENTO_ESCOLHA_TRIMESTRAL = "carflax-casa-nova-escolha";

const INTERVALO_MS = 30 * 60 * 1000;

/**
 * Quantos trimestres fechados o vendedor logado ganhou e ainda não escolheu o
 * prêmio (projeto "Você de Casa Nova"). Vira a bolinha vermelha em
 * Comercial › Campanhas e no card do Prêmio Especial.
 *
 * Só consulta para quem tem código de vendedor; a conta de metas é a mesma da
 * janela do Prêmio Especial.
 */
export function usePremioTrimestralPendente(operatorCode?: string | null): number {
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    if (!operatorCode) return;
    let vivo = true;
    const verificar = () =>
      trimestresPendentes(String(operatorCode))
        .then((lista) => vivo && setPendentes(lista.length))
        .catch(() => {});
    const inicial = setTimeout(verificar, 0);
    const t = setInterval(verificar, INTERVALO_MS);
    window.addEventListener(EVENTO_ESCOLHA_TRIMESTRAL, verificar);
    return () => {
      vivo = false;
      clearTimeout(inicial);
      clearInterval(t);
      window.removeEventListener(EVENTO_ESCOLHA_TRIMESTRAL, verificar);
    };
  }, [operatorCode]);

  return operatorCode ? pendentes : 0;
}

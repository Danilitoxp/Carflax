import { cn } from "@/lib/utils";

/** Caminho único da foto — usado também como `avatar` do autor das mensagens. */
export const CARLINHOS_AVATAR = "/carlinhos.webp";

/**
 * Rosto do Carlinhos no lugar do ícone genérico de robô.
 *
 * Fica em componente próprio porque a foto aparece em quatro telas (barra da
 * conversa, balão da mensagem, funil e configuração) e, espalhada, cada uma
 * acabaria com um tamanho e um arredondamento diferentes.
 */
export function CarlinhosAvatar({ className, title = "Carlinhos" }: { className?: string; title?: string }) {
  return (
    <img
      src={CARLINHOS_AVATAR}
      alt=""
      title={title}
      aria-hidden="true"
      draggable={false}
      // object-contain e fundo transparente: a imagem é um recorte do rosto, e
      // object-cover cortaria o cabelo e o queixo nos tamanhos pequenos.
      className={cn("object-contain shrink-0 select-none", className)}
    />
  );
}

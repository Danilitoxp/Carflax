import { useEffect, useRef, useState } from "react";
import { Star, Loader2, AlertCircle } from "lucide-react";
import { registrarScan, getGoogleReviewUrl } from "@/lib/avaliacoes";

// Página pública (sem login) aberta por QR. Duas origens:
//   /avaliar?vendedor=COD  → atendimento de um vendedor
//   /avaliar?canal=ID      → canal avulso, ex. cupom da NF
// Registra o scan e MANDA DIRETO para o Google — sem formulário, sem clique.
export function AvaliarPublicView() {
  const [erro, setErro] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const cod = params.get("vendedor")?.trim() || "";
  const canalId = params.get("canal")?.trim() || "";
  // Evita registrar dois scans / redirecionar duas vezes se o React remontar.
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;

    (async () => {
      if (!cod && !canalId) { setErro("Link inválido."); return; }

      // Registra o scan e busca o link em paralelo. Aguarda o scan para não
      // perder a contagem quando o redirect trocar de página.
      let url = "";
      try {
        const [link] = await Promise.all([
          getGoogleReviewUrl(),
          registrarScan(cod ? { vendedor_cod: cod } : { canal_id: canalId }),
        ]);
        url = link;
      } catch {
        // Se algo falhar, ainda tentamos redirecionar — não travar o cliente.
      }

      if (url) {
        // replace: a página intermediária não fica no histórico (voltar não volta pra cá).
        window.location.replace(url);
      } else {
        setErro("A campanha ainda não configurou o link de avaliação do Google.");
      }
    })();
  }, [cod, canalId]);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/40">
          <Star className="w-8 h-8 text-white fill-current" />
        </div>

        {erro ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm font-bold text-white/80">{erro}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <h1 className="text-lg font-black text-white tracking-tight">Abrindo a avaliação no Google...</h1>
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Aguarde um instante 💙</p>
          </div>
        )}
      </div>
    </div>
  );
}

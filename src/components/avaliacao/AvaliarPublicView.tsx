import { useEffect, useRef, useState } from "react";
import { Star, Loader2, AlertCircle } from "lucide-react";
import {
  resolverVendedor, registrarScan, getGoogleReviewUrl,
} from "@/lib/avaliacoes";

// Página pública (sem login) aberta por QR. Duas origens:
//   /avaliar?vendedor=COD  → atendimento de um vendedor (mostra nome + form)
//   /avaliar?canal=ID      → canal avulso, ex. cupom da NF (sem vínculo a vendedor)
// Registra o scan e leva o cliente ao Google.
export function AvaliarPublicView() {
  const [vendedorNome, setVendedorNome] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [indo, setIndo] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const cod = params.get("vendedor")?.trim() || "";
  const canalId = params.get("canal")?.trim() || "";
  const isCanal = !cod && !!canalId;
  // Evita registrar dois scans se o React remontar (StrictMode/refresh interno).
  const scanFeito = useRef(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!cod && !canalId) { setErro("Link inválido."); setLoading(false); return; }
      try {
        const url = await getGoogleReviewUrl();
        // Resolve o nome só para vendedor (o canal não mostra atendente).
        const vNome = cod ? (await resolverVendedor(cod)).nome : null;
        if (cod && !vNome) {
          // valida, mas segue — canal não precisa disso
        }
        if (cancel) return;
        setVendedorNome(vNome);
        setReviewUrl(url);
        if (!scanFeito.current) {
          scanFeito.current = true;
          registrarScan(cod
            ? { vendedor_cod: cod, vendedor_nome: vNome }
            : { canal_id: canalId });
        }
      } catch {
        if (!cancel) setErro("Não foi possível carregar. Tente novamente.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [cod, canalId]);

  const irParaGoogle = async () => {
    setIndo(true);
    // Vendedor: se o cliente se identificou, grava um scan com os dados.
    if (cod && (nome.trim() || telefone.trim())) {
      await registrarScan({
        vendedor_cod: cod, vendedor_nome: vendedorNome,
        cliente_nome: nome.trim() || null, cliente_telefone: telefone.trim() || null,
      });
    }
    if (reviewUrl) {
      window.location.href = reviewUrl;
    } else {
      setErro("A campanha ainda não configurou o link de avaliação do Google.");
      setIndo(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/40">
          <Star className="w-8 h-8 text-white fill-current" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Carregando...</span>
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm font-bold text-white/80">{erro}</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Sua opinião vale muito</p>
            <h1 className="text-xl font-black text-white tracking-tight mb-1">Avalie a Carflax no Google</h1>
            {vendedorNome && (
              <p className="text-[12px] font-bold text-white/60 mb-6">
                Atendimento de <span className="text-white">{vendedorNome}</span>
              </p>
            )}

            {!isCanal && (
              <div className="space-y-3 text-left mb-6">
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1 ml-1">Seu nome (opcional)</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como você se chama"
                    className="w-full px-4 py-3 text-sm font-bold bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/25 outline-none focus:border-blue-500/60"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1 ml-1">Telefone (opcional)</label>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    inputMode="tel"
                    placeholder="(11) 9...."
                    className="w-full px-4 py-3 text-sm font-bold bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/25 outline-none focus:border-blue-500/60"
                  />
                </div>
              </div>
            )}
            {isCanal && <div className="mb-6" />}

            <button
              onClick={irParaGoogle}
              disabled={indo}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {indo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-current" />}
              Avaliar no Google
            </button>
            <p className="text-[9px] font-bold text-white/30 mt-4 leading-relaxed">
              Você será levado à página de avaliações do Google. Leva menos de um minuto. 💙
            </p>
          </>
        )}
      </div>
    </div>
  );
}

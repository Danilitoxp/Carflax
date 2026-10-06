import { useEffect, useId, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankingSeller } from "./ranking-events";
import { tocarAceleracao } from "./som-motor";
import { coresDoCarro, ordenarFaixas, type Garagem, type PecaId } from "./garagem";

/**
 * Modo corrida do Ranking do dia — "Grande Prêmio Carflax".
 *
 * Cada vendedor é um carro de F1 (visto de cima) na sua faixa, com a foto dele
 * no cockpit. A posição é o % da meta diária; a linha de chegada quadriculada,
 * no fim da pista, é a meta do dia (100%). Quem cruza ganha troféu e brilho.
 *
 * Os carros andam a cada atualização do telão (15 s), com animação de mola,
 * então parece corrida ao vivo sem consulta extra ao ERP.
 */

// Largura da coluna de pilotos (à esquerda) e da área depois da chegada:
// quem bate a meta diária estaciona ALI, do outro lado da linha, com o % e o troféu.
const COLUNA_PILOTO = 220;
const DEPOIS_CHEGADA = 290;
const LARGURA_CARRO = 132;

const MEDALHA = ["from-amber-300 to-amber-500 text-amber-950", "from-slate-200 to-slate-400 text-slate-900", "from-orange-300 to-orange-600 text-orange-950"];

/** Fração da pista percorrida: 100% da meta diária = na linha de chegada. */
const posicao = (pct: number) => Math.max(0, Math.min(pct, 100)) / 100;

/** O carro da pista — o mesmo que a garagem mostra, com as peças compradas. */
export function CarroF1({
  cor,
  escura,
  numero,
  avatar,
  iniciais,
  pecas,
}: {
  cor: string;
  escura: string;
  numero: number;
  avatar?: string;
  iniciais: string;
  pecas?: Set<PecaId>;
}) {
  const id = useId().replace(/:/g, "");
  const tem = (p: PecaId) => !!pecas?.has(p);
  return (
    <svg viewBox="0 0 220 80" className="w-full h-full overflow-visible" aria-hidden="true">
      {/* neon: brilho ciano no asfalto, pulsando */}
      {tem("neon") && (
        // Gradiente radial no lugar de filter: blur — o blur era refeito a cada quadro.
        <>
          <defs>
            <radialGradient id={`n${id}`}>
              <stop offset="0" stopColor="#22d3ee" stopOpacity="0.9">
                <animate attributeName="stop-color" values="#22d3ee;#a855f7;#ec4899;#22d3ee" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="112" cy="40" rx="118" ry="44" fill={`url(#n${id})`}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite" />
          </ellipse>
        </>
      )}
      {/* turbo: chamas saindo da traseira */}
      {tem("turbo") && (
        <g>
          <path d="M4 30 L-30 40 L4 50 Z" fill="#f97316">
            <animate attributeName="d" values="M4 30 L-30 40 L4 50 Z;M4 31 L-44 40 L4 49 Z;M4 30 L-30 40 L4 50 Z" dur="0.25s" repeatCount="indefinite" />
          </path>
          <path d="M4 34 L-18 40 L4 46 Z" fill="#fde047" />
        </g>
      )}
      <defs>
        <linearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cor} />
          <stop offset="0.5" stopColor={cor} />
          <stop offset="1" stopColor={escura} />
        </linearGradient>
        <clipPath id={`a${id}`}>
          <circle cx="112" cy="40" r="13" />
        </clipPath>
      </defs>
      {/* sombra no asfalto */}
      <ellipse cx="112" cy="44" rx="104" ry="30" fill="#000" opacity="0.35" />
      {/* aerofólio traseiro */}
      {tem("aerofolio") ? (
        <>
          {/* aerofólio de corrida: mais largo, dois planos e ponteiras douradas */}
          <rect x="0" y="0" width="22" height="80" rx="3" fill="#0f172a" />
          <rect x="3" y="3" width="7" height="74" rx="2" fill={escura} />
          <rect x="12" y="3" width="7" height="74" rx="2" fill={cor} />
          <rect x="0" y="0" width="22" height="5" rx="2" fill="#fbbf24" />
          <rect x="0" y="75" width="22" height="5" rx="2" fill="#fbbf24" />
        </>
      ) : (
        <>
          <rect x="4" y="8" width="16" height="64" rx="3" fill="#0f172a" />
          <rect x="6" y="10" width="12" height="60" rx="2" fill={escura} />
        </>
      )}
      {/* pneus traseiros */}
      <rect x="26" y="2" width="34" height="18" rx="6" fill="#111" />
      <rect x="26" y="60" width="34" height="18" rx="6" fill="#111" />
      <rect x="30" y="6" width="26" height="3" rx="1.5" fill="#facc15" opacity="0.8" />
      <rect x="30" y="71" width="26" height="3" rx="1.5" fill="#facc15" opacity="0.8" />
      {/* pneus dianteiros */}
      <rect x="150" y="4" width="30" height="16" rx="6" fill="#111" />
      <rect x="150" y="60" width="30" height="16" rx="6" fill="#111" />
      {/* rodas douradas: aro aparecendo no pneu */}
      {tem("rodas") &&
        [[43, 11], [43, 69], [165, 12], [165, 68]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x - 11} y={y - 5} width="22" height="10" rx="4" fill="#fcd34d" stroke="#a16207" strokeWidth="1.5" />
            <line x1={x} y1={y - 5} x2={x} y2={y + 5} stroke="#a16207" strokeWidth="1.5" />
          </g>
        ))}
      {/* braços da suspensão */}
      <path d="M60 20 L80 30 M60 60 L80 50 M150 18 L135 32 M150 62 L135 48" stroke="#334155" strokeWidth="3" />
      {/* carroceria */}
      <path d="M18 30 L60 24 L96 20 L150 26 L190 34 L206 37 L206 43 L190 46 L150 54 L96 60 L60 56 L18 50 Z" fill={`url(#c${id})`} stroke="#0f172a" strokeWidth="1.5" />
      {/* sidepods */}
      <path d="M64 24 Q80 14 104 18 L104 24 Z M64 56 Q80 66 104 62 L104 56 Z" fill={escura} />
      {/* faixa do bico */}
      <path d="M150 37 L206 39 L206 41 L150 43 Z" fill="#fff" opacity="0.9" />
      {/* aerofólio dianteiro */}
      <rect x="196" y="12" width="14" height="56" rx="3" fill="#0f172a" />
      <rect x="198" y="14" width="10" height="52" rx="2" fill={cor} />
      {/* número */}
      <circle cx="166" cy="40" r="9" fill="#fff" />
      <text x="166" y="44" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="Arial, sans-serif" fill="#0f172a">{numero}</text>
      {/* cockpit + halo */}
      <ellipse cx="112" cy="40" rx="20" ry="16" fill="#020617" />
      <path d="M94 28 Q112 18 130 28" stroke="#cbd5e1" strokeWidth="3" fill="none" />
      <path d="M94 52 Q112 62 130 52" stroke="#cbd5e1" strokeWidth="3" fill="none" />
      {/* piloto: foto do vendedor */}
      {avatar ? (
        <image href={avatar} x="99" y="27" width="26" height="26" clipPath={`url(#a${id})`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <>
          <circle cx="112" cy="40" r="13" fill={cor} />
          <text x="112" y="44" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="Arial, sans-serif" fill="#fff">{iniciais}</text>
        </>
      )}
      <circle cx="112" cy="40" r="13" fill="none" stroke={tem("ouro") ? "#fcd34d" : "#fff"} strokeWidth="2" />
      {/* aerofólio: faixa de LED vermelha pulsando */}
      {tem("aerofolio") && (
        <rect x="19" y="4" width="3" height="72" rx="1.5" fill="#ff1744">
          <animate attributeName="opacity" values="1;0.35;1" dur="0.8s" repeatCount="indefinite" />
        </rect>
      )}
      {/* kit ouro: reflexo passando pela lataria + brilhos */}
      {tem("ouro") && (
        <>
          <path d="M18 30 L60 24 L96 20 L150 26 L190 34 L206 37 L206 43 L190 46 L150 54 L96 60 L60 56 L18 50 Z" fill="none" stroke="#fef3c7" strokeWidth="1.5" opacity="0.8" />
          <rect x="-40" y="0" width="22" height="80" fill="#fff" opacity="0.18" transform="skewX(-20)">
            <animate attributeName="x" values="-40;240" dur="2.2s" repeatCount="indefinite" />
          </rect>
          {[[70, 14, 0], [140, 66, 0.5], [190, 22, 1], [36, 44, 1.5]].map(([x, y, d]) => (
            <path key={`${x}`} d={`M${x} ${y - 6} L${x + 1.5} ${y - 1.5} L${x + 6} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 6} L${x - 1.5} ${y + 1.5} L${x - 6} ${y} L${x - 1.5} ${y - 1.5} Z`} fill="#fffbeb">
              <animate attributeName="opacity" values="0;1;0" dur="2s" begin={`${d}s`} repeatCount="indefinite" />
            </path>
          ))}
        </>
      )}
    </svg>
  );
}

export function RankingCorrida({
  linhas,
  meuCodigo,
  onAbrirGaragem,
  garagens,
}: {
  linhas: RankingSeller[];
  meuCodigo?: string;
  onAbrirGaragem?: (cod: string) => void;
  garagens?: Map<string, Garagem>;
}) {
  // Match exato (sem tirar zeros): vendedor "050" e motorista "00050" colidem.
  // Mesma regra do avatar-by-code: exato primeiro; sem zeros só se não for ambíguo.
  const cod = String(meuCodigo || "").trim();
  const semZeros = (s: string) => s.trim().replace(/^0+/, "") || s.trim();
  const porNorma = linhas.filter((l) => cod && semZeros(l.cod) === semZeros(cod));
  const meu = linhas.some((l) => l.cod.trim() === cod)
    ? cod
    : porNorma.length === 1
      ? porNorma[0].cod.trim()
      : "";
  // Ronco de motor quando algum carro avança desde a última atualização.
  // A primeira carga não toca (seria todo mundo "andando" de uma vez).
  const anteriorRef = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const atual = new Map(linhas.map((l) => [l.cod, l.percentual]));
    const anterior = anteriorRef.current;
    anteriorRef.current = atual;
    if (!anterior) return;
    let maiorAvanco = 0;
    for (const [cod, pct] of atual) {
      const antes = anterior.get(cod);
      if (antes != null) maiorAvanco = Math.max(maiorAvanco, pct - antes);
    }
    // Só acelera em salto de mais de 10% da meta diária de uma vez: venda
    // pequena (1%, 2%) fazia barulho o dia inteiro. Avanço maior = acelerada
    // mais longa e aguda.
    if (maiorAvanco > 10) tocarAceleracao(Math.min(1, maiorAvanco / 30));
  }, [linhas]);

  // Faixas em ordem fixa (por nome): o carro não troca de faixa quando a
  // classificação muda — quem ultrapassa, ultrapassa na pista.
  const faixas = ordenarFaixas(linhas);
  const classificacao = [...linhas].sort((a, b) => b.percentual - a.percentual).map((l) => l.cod);

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0f1c]">
      <div
        className="relative flex-1 min-h-0 flex flex-col"
        style={{
          backgroundColor: "#2b2f36",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.25) 1px, transparent 1px)",
          backgroundSize: "6px 6px, 9px 9px",
          backgroundPosition: "0 0, 3px 4px",
        }}
      >
        {/* Grid de largada */}
        <div className="pointer-events-none absolute inset-y-0 z-[5] w-2 bg-white/80" style={{ left: COLUNA_PILOTO }} />
        {/* Linha de chegada (meta diária) */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[5] w-7 shadow-[0_0_24px_rgba(255,255,255,0.25)]"
          style={{
            right: DEPOIS_CHEGADA - 28,
            backgroundImage: "repeating-conic-gradient(#f8fafc 0% 25%, #0f172a 0% 50%)",
            backgroundSize: "14px 14px",
          }}
        />

        {faixas.map((l, i) => {
          const pos = posicao(l.percentual);
          const lugar = classificacao.indexOf(l.cod) + 1;
          const chegou = l.percentual >= 100;
          const andando = l.percentual > 0 && !chegou;
          const garagem = garagens?.get(l.cod.trim());
          const [cor, escura] = coresDoCarro(i, garagem);
          return (
            <div key={l.cod} className="relative flex-1 min-h-[34px] flex items-center">
              {/* separador tracejado entre faixas */}
              {i > 0 && (
                <div
                  className="pointer-events-none absolute top-0 right-0 h-[2px]"
                  style={{ left: COLUNA_PILOTO, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 26px, transparent 26px 52px)" }}
                />
              )}

              {/* Piloto */}
              <div className="relative z-10 shrink-0 h-full flex items-center gap-3 pl-4 pr-3 bg-[#0d1322] border-r border-white/5" style={{ width: COLUNA_PILOTO }}>
                <span
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black tabular-nums shrink-0",
                    lugar <= 3 ? `bg-gradient-to-b ${MEDALHA[lugar - 1]}` : "bg-white/10 text-white/70",
                  )}
                >
                  {lugar}º
                </span>
                {l.avatar ? (
                  <img src={l.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 shrink-0" style={{ borderColor: cor }} />
                ) : (
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 shrink-0 text-white" style={{ borderColor: cor }}>
                    {l.nome.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 text-sm font-black uppercase tracking-tight text-white truncate">{l.nome.split(" ")[0]}</span>
              </div>

              {/* Pista */}
              <div className="relative z-10 flex-1 h-full" style={{ marginRight: DEPOIS_CHEGADA }}>
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 flex items-center gap-3"
                  initial={false}
                  animate={{
                    left: chegou
                      ? "calc(100% + 40px)" // cruzou: depois da linha quadriculada
                      : `max(8px, calc(${pos * 100}% - ${LARGURA_CARRO}px))`,
                  }}
                  transition={{ type: "spring", stiffness: 22, damping: 12 }}
                >
                  {/* rastro de velocidade */}
                  {andando && (
                    <div className="absolute right-full top-1/2 -translate-y-1/2 flex flex-col gap-1.5 mr-1">
                      {[0, 1, 2].map((k) => (
                        // scaleX em vez de width: só compositor, sem recalcular layout
                        // (eram ~39 traços animando largura ao mesmo tempo).
                        <motion.span
                          key={k}
                          className="block h-[3px] w-[46px] origin-right rounded-full will-change-transform"
                          style={{ background: `linear-gradient(90deg, transparent, ${cor})` }}
                          animate={{ scaleX: [0.4, 1, 0.4], opacity: [0.2, 0.75, 0.2] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: k * 0.15 }}
                        />
                      ))}
                    </div>
                  )}
                  {(() => {
                    const carro = <CarroF1 cor={cor} escura={escura} numero={i + 1} avatar={l.avatar} iniciais={l.nome.slice(0, 2).toUpperCase()} pecas={garagem?.pecas} />;
                    const classe = cn("relative shrink-0", chegou && "drop-shadow-[0_0_18px_rgba(251,191,36,0.9)]");
                    const tamanho = { width: LARGURA_CARRO, height: LARGURA_CARRO * (80 / 220) };
                    const ehMeu = !!meu && l.cod.trim() === meu && !!onAbrirGaragem;
                    if (!ehMeu) return <div className={classe} style={tamanho}>{carro}</div>;
                    return (
                      <button
                        type="button"
                        onClick={() => onAbrirGaragem(l.cod)}
                        aria-label="Abrir minha garagem"
                        title="Abrir minha garagem"
                        className={cn(classe, "cursor-pointer rounded-lg transition-transform hover:scale-110 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]")}
                        style={tamanho}
                      >
                        {carro}
                      </button>
                    );
                  })()}
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-sm font-black tabular-nums",
                      chegou ? "bg-amber-400 text-amber-950" : "bg-black/50 text-white",
                    )}
                  >
                    {l.percentual.toFixed(0)}%
                  </span>
                  {chegou && <Trophy className="w-6 h-6 text-amber-300 drop-shadow" />}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

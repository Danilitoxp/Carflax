import { memo, useId } from "react";
import { Flag, Flame, Crown, Lightbulb, Shield, Sparkles, Wind, Zap } from "lucide-react";
import { PECAS, NEONS, PILOTOS, DESENHOS, TURBOS, RODAS, CARROCERIAS, AEROFOLIOS, type PecaId } from "./garagem";

/** Miniaturas vetoriais usam os mesmos perfis do modelo 3D. */
export const MiniaturaPeca = memo(function MiniaturaPeca({ id, cor }: { id: PecaId; cor: string; emoji?: string }) {
  const uid = useId().replace(/:/g, "");
  const neon = NEONS.find((p) => p.id === id);
  const piloto = PILOTOS.find((p) => p.id === id);
  const desenho = DESENHOS.find((p) => p.id === id);
  const turbo = TURBOS.find((p) => p.id === id);
  const roda = RODAS.find((p) => p.id === id);
  const corpo = CARROCERIAS.find((p) => p.id === id);
  const carroceria = corpo || id === "listras" || id === "cromo";
  const acabamento = id === "cromo" ? "#e2e8f0" : corpo?.cor ?? "#f8fafc";
  const peca = PECAS.find((p) => p.id === id);
  const Icone = id === "antena" ? Flag : id === "coroa" ? Crown : id === "turbo" ? Flame : id === "ouro" ? Sparkles : peca?.categoria === "Iluminação" ? Lightbulb : peca?.categoria === "Piloto" ? Shield : peca?.categoria === "Aerodinâmica" ? Wind : Zap;
  const asa = AEROFOLIOS.find((p) => p.id === id) ?? (id === "aerofolio" ? { largura: 2, planos: 2, cor: "#e2e8f0" } : undefined);
  return <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_top,_#25334c,_#0a1020)]">
    {neon ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="68" rx="51" ry="9" fill={neon.cor} opacity="0.18" className="motion-safe:animate-pulse" style={{animationDuration: `${2/neon.ritmo}s`}} />
      <path d="M27 41 L56 26 H105 L135 43 V58 H27 Z" fill="#182437" stroke="#64748b" strokeWidth="2" />
      <path d="M34 61 H128 M40 67 H120" stroke={neon.cor} strokeWidth="4" strokeLinecap="round" className="motion-safe:animate-pulse" style={{animationDuration: `${2/neon.ritmo}s`}} />
      {[40,120].map(x=><circle key={x} cx={x} cy="55" r="9" fill="#020617" stroke={neon.cor} />)}
      <path d="M58 30 H101 L116 41 H44 Z" fill="#0a1020" />
    </svg> : piloto ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="77" rx="32" ry="4" fill="#020617" />
      <path d="M49 69 Q51 54 67 54 H93 Q109 54 111 69" fill={piloto.cor} stroke={piloto.viseira} strokeWidth="2" />
      <path d="M52 49 V39 Q52 14 80 14 Q108 14 108 39 V53 H57 Z" fill={piloto.cor} stroke="#e2e8f0" strokeWidth="2" />
      <path d="M56 33 H106 V43 L74 48 H56 Z" fill="#0b1020" stroke={piloto.viseira} strokeWidth="3" />
      {Array.from({length:1+piloto.padrao%3},(_,i)=><path key={i} d={`M${66+i*9} 17 L${70+i*9} 29`} stroke={piloto.viseira} strokeWidth="3" />)}
      <path d="M65 38 H96" stroke={piloto.viseira} strokeWidth="2" className="motion-safe:animate-pulse" />
    </svg> : turbo ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="77" rx="44" ry="4" fill="#020617" />
      <path d="M86 30 Q108 10 120 30 V58 Q103 77 86 56 Z" fill="#334155" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="95" cy="43" r="19" fill="#111827" stroke={turbo.cor} strokeWidth="3" />
      <g className="motion-safe:animate-spin" style={{transformOrigin:'95px 43px',animationDuration:`${3/turbo.ritmo}s`}}>{Array.from({length:6},(_,i)=><path key={i} d="M95 43 L96 27 L105 32 Z" fill={turbo.cor} transform={`rotate(${i*60} 95 43)`} />)}</g>
      <path d={`M72 33 Q${45-turbo.potencia*6} 23 22 43 Q48 63 72 54 Z`} fill={turbo.cor} opacity="0.8" className="motion-safe:animate-pulse" style={{animationDuration:`${1/turbo.ritmo}s`}} />
      <path d="M70 40 L38 43 L70 48" fill="#f8fafc" />
    </svg> : desenho ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <defs><pattern id={`d${uid}`} width="24" height="32" patternUnits="userSpaceOnUse">
        {desenho.padrao===0 ? <path d="M0 10 H24 M0 22 H24" stroke={desenho.cor} strokeWidth="3" /> : desenho.padrao===1 ? <path d="M4 0 L19 12 L10 18 L22 32" fill="none" stroke={desenho.cor} strokeWidth="3" /> : desenho.padrao===2 ? <path d="M2 32 Q19 15 12 0 Q35 20 20 32" fill={desenho.cor} /> : desenho.padrao===3 ? <><rect width="12" height="16" fill={desenho.cor}/><rect x="12" y="16" width="12" height="16" fill={desenho.cor}/></> : desenho.padrao===4 ? <path d="M2 0 L20 16 L2 32" fill="none" stroke={desenho.cor} strokeWidth="3"/> : desenho.padrao===5 ? <path d="M0 26 H12 V6 H24" fill="none" stroke={desenho.cor} strokeWidth="3"/> : desenho.padrao===6 ? <path d="M0 16 Q6 0 12 16 T24 16" fill="none" stroke={desenho.cor} strokeWidth="3"/> : desenho.padrao===7 ? <path d="M12 2 L15 11 L24 12 L17 18 L20 28 L12 22 L4 28 L7 18 L0 12 L9 11 Z" fill={desenho.cor}/> : desenho.padrao===8 ? <path d="M12 2 L23 9 V23 L12 30 L1 23 V9 Z" fill="none" stroke={desenho.cor} strokeWidth="2"/> : <path d="M0 8 H18 M6 16 H24 M0 24 H14" stroke={desenho.cor} strokeWidth="3"/>}
      </pattern></defs>
      <ellipse cx="80" cy="77" rx="50" ry="4" fill="#020617" />
      <path d="M26 27 L111 21 L138 40 L119 64 L26 60 Z" fill="#162237" stroke="#64748b" strokeWidth="2" />
      <path d="M26 27 L111 21 L138 40 L119 64 L26 60 Z" fill={`url(#d${uid})`} className="motion-safe:animate-pulse" style={{animationDuration:'3s'}} />
    </svg> : roda || id === "rodas" || id === "slick" ? <svg viewBox="0 0 140 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="70" cy="77" rx="32" ry="4" fill="#020617" />
      <circle cx="70" cy="43" r="32" fill="#090d15" stroke="#253044" strokeWidth="3" />
      <circle cx="70" cy="43" r="25" fill="#111827" stroke={roda?.aro ?? (id === "slick" ? "#ef4444" : "#fcd34d")} strokeWidth="2" />
      <circle cx="70" cy="43" r="20" fill="#475569" />
      <rect x="83" y="34" width="5" height="18" rx="2" fill="#ef4444" />
      {roda?.raios === 0 ? <circle cx="70" cy="43" r="22" fill={roda.cor} /> : Array.from({ length: roda?.raios ?? 5 }, (_, i) => <path key={i} d="M67 43 L68 20 L72 20 L73 43 Z" fill={roda?.cor ?? "#fcd34d"} transform={`rotate(${i * 360 / (roda?.raios ?? 5)} 70 43)`} />)}
      <circle cx="70" cy="43" r="5" fill="#e2e8f0" stroke="#64748b" />
    </svg> : carroceria ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="78" rx="55" ry="4" fill="#020617" />
      <g transform={`translate(80 45) scale(1 ${corpo?.largura ?? 1}) translate(-80 -45)`}>
        <path d="M25 35 L60 27 L90 29 L136 40 L140 45 L136 50 L90 61 L60 63 L25 55 Z" fill={id === "cromo" ? "#94a3b8" : cor} stroke={acabamento} strokeWidth="2" />
        {id === "listras" && <path d="M28 40 L62 34 L94 36 L136 43 M28 50 L62 56 L94 54 L136 47" fill="none" stroke="#f8fafc" strokeWidth="3" />}
        <path d="M32 39 H70 M32 51 H70 M102 44 H136" stroke={acabamento} strokeWidth="3" />
      </g>
      {[30, 111].map((x) => <g key={x}><rect x={x} y="16" width="16" height="14" rx="4" fill="#020617" /><rect x={x} y="60" width="16" height="14" rx="4" fill="#020617" /></g>)}
      <ellipse cx="83" cy="45" rx="15" ry="10" fill="#020617" stroke="#94a3b8" /><circle cx="83" cy="45" r="6" fill={acabamento} />
    </svg> : asa ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="76" rx="50" ry="4" fill="#020617" />
      <path d="M59 65 V40 M101 65 V40" stroke="#64748b" strokeWidth="4" />
      {Array.from({ length: asa.planos }, (_, i) => <path key={i} d={`M${80 - asa.largura * 23} ${47 - i * 9} L${80 + asa.largura * 23} ${38 - i * 9} L${80 + asa.largura * 23} ${44 - i * 9} L${80 - asa.largura * 23} ${53 - i * 9} Z`} fill={i === 0 ? cor : "#334155"} stroke={asa.cor} strokeWidth="1" />)}
      <path d={`M${80 - asa.largura * 23} 29 v29 M${80 + asa.largura * 23} 20 v29`} stroke={asa.cor} strokeWidth="5" />
    </svg> : <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="77" rx="32" ry="4" fill="#020617" />
      <rect x="49" y="14" width="62" height="56" rx="16" fill="#111827" stroke="#334155" strokeWidth="2" />
      <Icone x="59" y="23" width="42" height="38" color={peca?.categoria === "Iluminação" ? "#22d3ee" : peca?.categoria === "Piloto" ? "#e2e8f0" : cor} strokeWidth="1.8" />
    </svg>}
  </div>;
});

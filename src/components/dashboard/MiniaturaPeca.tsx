import { memo } from "react";
import { RODAS, CARROCERIAS, AEROFOLIOS, type PecaId } from "./garagem";

/** Miniaturas vetoriais usam os mesmos perfis do modelo 3D. */
export const MiniaturaPeca = memo(function MiniaturaPeca({ id, cor, emoji }: { id: PecaId; cor: string; emoji: string }) {
  const roda = RODAS.find((p) => p.id === id);
  const corpo = CARROCERIAS.find((p) => p.id === id);
  const asa = AEROFOLIOS.find((p) => p.id === id);
  return <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_top,_#25334c,_#0a1020)]">
    {roda || id === "rodas" || id === "slick" ? <svg viewBox="0 0 140 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="70" cy="77" rx="32" ry="4" fill="#020617" />
      <circle cx="70" cy="43" r="32" fill="#090d15" stroke="#253044" strokeWidth="3" />
      <circle cx="70" cy="43" r="25" fill="#111827" stroke={roda?.aro ?? (id === "slick" ? "#ef4444" : "#fcd34d")} strokeWidth="2" />
      <circle cx="70" cy="43" r="20" fill="#475569" />
      <rect x="83" y="34" width="5" height="18" rx="2" fill="#ef4444" />
      {roda?.raios === 0 ? <circle cx="70" cy="43" r="22" fill={roda.cor} /> : Array.from({ length: roda?.raios ?? 5 }, (_, i) => <path key={i} d="M67 43 L68 20 L72 20 L73 43 Z" fill={roda?.cor ?? "#fcd34d"} transform={`rotate(${i * 360 / (roda?.raios ?? 5)} 70 43)`} />)}
      <circle cx="70" cy="43" r="5" fill="#e2e8f0" stroke="#64748b" />
    </svg> : corpo ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <g transform={`translate(80 45) scale(1 ${corpo.largura}) translate(-80 -45)`}>
        <path d="M25 35 L60 27 L90 29 L136 40 L140 45 L136 50 L90 61 L60 63 L25 55 Z" fill={cor} stroke={corpo.cor} strokeWidth="2" />
        <path d="M32 39 H70 M32 51 H70 M102 44 H136" stroke={corpo.cor} strokeWidth="3" />
      </g>
      {[30, 111].map((x) => <g key={x}><rect x={x} y="16" width="16" height="14" rx="4" fill="#020617" /><rect x={x} y="60" width="16" height="14" rx="4" fill="#020617" /></g>)}
      <ellipse cx="83" cy="45" rx="15" ry="10" fill="#020617" stroke="#94a3b8" /><circle cx="83" cy="45" r="6" fill={corpo.cor} />
    </svg> : asa ? <svg viewBox="0 0 160 90" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="76" rx="50" ry="4" fill="#020617" />
      <path d="M59 65 V40 M101 65 V40" stroke="#64748b" strokeWidth="4" />
      {Array.from({ length: asa.planos }, (_, i) => <path key={i} d={`M${80 - asa.largura * 23} ${47 - i * 9} L${80 + asa.largura * 23} ${38 - i * 9} L${80 + asa.largura * 23} ${44 - i * 9} L${80 - asa.largura * 23} ${53 - i * 9} Z`} fill={i === 0 ? cor : "#334155"} stroke={asa.cor} strokeWidth="1" />)}
      <path d={`M${80 - asa.largura * 23} 29 v29 M${80 + asa.largura * 23} 20 v29`} stroke={asa.cor} strokeWidth="5" />
    </svg> : <span className="text-3xl drop-shadow-lg" aria-hidden="true">{emoji}</span>}
  </div>;
});

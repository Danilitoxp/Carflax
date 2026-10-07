import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { coresDoCarro, ordenarFaixas, pecasDoCarro } from "./garagem";
import { liberarObjeto, montarF1 } from "./modeloF1";
import type { RankingCorridaProps } from "./RankingCorrida";

// A chegada (meta 100%) fica sempre no fim da pista: quem passou da meta para
// na linha e o % real aparece na etiqueta, sem a escala esticar até 200%.
const MARCAS = [0, 25, 50, 75, 100];
// Espaço depois da chegada: quem bateu a meta cruza a linha e para aqui,
// com a etiqueta do % e a coroa.
const MARGEM_CHEGADA = 300;
const MEDALHAS = ["from-[#ffe783] to-[#e7a814] text-[#372100]", "from-[#d9e4ed] to-[#7c93aa] text-[#142334]", "from-[#ffc27b] to-[#e6792e] text-[#422009]"];
const percentualNaPista = (pct: number) => {
  const valor = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return valor / 100;
};
const pontoDaPista = (pct: number, largura: number) => 43 + percentualNaPista(pct) * (largura - 43 - MARGEM_CHEGADA);

/** Pista compacta: interface nítida em HTML, todos os carros em um único canvas. */
export function RankingCena3D({ linhas, garagens, meuCodigo, onAbrirGaragem, onIndisponivel }: RankingCorridaProps & { onIndisponivel: () => void }) {
  const faixas = useMemo(() => [...linhas].sort((a, b) => b.percentual - a.percentual || a.nome.localeCompare(b.nome) || a.cod.localeCompare(b.cod)), [linhas]);
  // Cor e número continuam pertencendo ao piloto quando ele muda de posição.
  const indices = useMemo(() => new Map(ordenarFaixas(linhas).map((l, i) => [l.cod, i])), [linhas]);
  const cod = String(meuCodigo || "").trim();
  const semZeros = (s: string) => s.trim().replace(/^0+/, "") || s.trim();
  const correspondentes = faixas.filter((l) => cod && semZeros(l.cod) === semZeros(cod));
  const meu = faixas.some((l) => l.cod.trim() === cod) ? cod : correspondentes.length === 1 ? correspondentes[0].cod.trim() : "";
  const host = useRef<HTMLDivElement>(null);
  const etiquetas = useRef(new Map<string, HTMLDivElement>());
  const botoes = useRef(new Map<string, HTMLButtonElement>());
  const rastros = useRef(new Map<string, HTMLDivElement>());
  const marcas = useRef(new Map<number, HTMLSpanElement>());
  const grades = useRef(new Map<number, HTMLDivElement>());
  const sombras = useRef(new Map<string, HTMLDivElement>());
  const chegada = useRef<HTMLDivElement>(null);
  const dados = useRef({ faixas, indices, garagens, onIndisponivel });
  const atualizar = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { dados.current.onIndisponivel(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);
    const cena = new THREE.Scene();
    // Reflexos de estúdio gerados localmente e compartilhados entre os carros.
    const luzCanvas = document.createElement("canvas"); luzCanvas.width = 256; luzCanvas.height = 128;
    const ctxLuz = luzCanvas.getContext("2d")!;
    const gradiente = ctxLuz.createLinearGradient(0, 0, 0, 128);
    gradiente.addColorStop(0, "#122038"); gradiente.addColorStop(0.3, "#7c92b3");
    gradiente.addColorStop(0.47, "#e2e8f0"); gradiente.addColorStop(0.6, "#465a79"); gradiente.addColorStop(1, "#020617");
    ctxLuz.fillStyle = gradiente; ctxLuz.fillRect(0, 0, 256, 128);
    ctxLuz.fillStyle = "#fff"; ctxLuz.fillRect(25, 24, 7, 62); ctxLuz.fillRect(155, 30, 11, 54);
    const ambiente = new THREE.CanvasTexture(luzCanvas); ambiente.colorSpace = THREE.SRGBColorSpace;
    ambiente.mapping = THREE.EquirectangularReflectionMapping;
    cena.environment = ambiente; cena.environmentIntensity = 0.7;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    // De lado e de cima (~27°): mostra a lateral e o topo da carroceria, com as
    // quatro rodas no mesmo nível. Vista de frente-cima (x=8) escondia o pneu
    // dianteiro e erguia a traseira; de perfil puro (y=7) sumia o topo.
    camera.position.set(0, 15, 30); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const direita = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    cena.add(new THREE.AmbientLight(0xffffff, 1.2));
    const luz = new THREE.DirectionalLight(0xffffff, 3); luz.position.set(-12, 25, 30); cena.add(luz);
    const recorte = new THREE.DirectionalLight(0x8aa9ff, 1.5); recorte.position.set(12, 8, -25); cena.add(recorte);
    type Carro = ReturnType<typeof montarF1> & {
      chave: string; x: number; y: number; alvoX: number; alvoY: number; largura: number;
      rodas: THREE.Object3D[]; pct: number; fase: number; giro: number; ultimoX: number; balanco: number;
    };
    const carros = new Map<string, Carro>();
    let frame = 0;
    let ultimo = -Infinity;
    let tempo = 0;
    let ultimoEfeito = -Infinity;
    let sujo = true;
    let encerrado = false;
    let larguraAnterior = 0;
    let alturaAnterior = 0;
    // Telão de ranking: anima sempre, mesmo com "efeitos de animação" desligados no
    // Windows (que vira prefers-reduced-motion e deixava a pista toda parada).
    // O ranking 2D antigo, em SVG, também ignorava essa preferência.
    const movimentoReduzido = { matches: false };
    const posicionar = (cod: string, modelo: Carro) => {
      modelo.carro.position.copy(direita).multiplyScalar(modelo.x - el.clientWidth / 2);
      modelo.carro.position.addScaledVector(cima, el.clientHeight / 2 - modelo.y - modelo.largura * 0.08 + modelo.balanco);
      modelo.carro.scale.setScalar(modelo.largura / 5.1);
      const etiqueta = etiquetas.current.get(cod);
      if (etiqueta) etiqueta.style.transform = `translate3d(${modelo.x + modelo.largura * 0.5 + 5}px,${modelo.y - 7}px,0)`;
      const botao = botoes.current.get(cod);
      if (botao) {
        botao.style.width = `${modelo.largura}px`;
        botao.style.transform = `translate3d(${modelo.x - modelo.largura / 2}px,${modelo.y - 22}px,0)`;
      }
      const sombra = sombras.current.get(cod);
      if (sombra) { sombra.style.width = `${modelo.largura * 0.95}px`; sombra.style.transform = `translate3d(${modelo.x - modelo.largura / 2}px,${modelo.y + 10}px,0)`; }
      const rastro = rastros.current.get(cod);
      if (rastro) {
        const larguraRastro = Math.min(170, Math.max(15, modelo.x - modelo.largura / 2 - 12));
        rastro.style.width = `${larguraRastro}px`;
        rastro.style.transform = `translate3d(${Math.max(12, modelo.x - modelo.largura / 2 - larguraRastro)}px,${modelo.y - 9}px,0)`;
      }
    };
    const solicitar = () => { if (encerrado) return; sujo = true; if (!frame && !document.hidden) frame = requestAnimationFrame(animar); };
    const animar = (agora: number) => {
      frame = 0;
      if (encerrado || document.hidden) return;
      let continua = false;
      // 60 fps: agora os carros animam o tempo todo (rodas/motor), e no telão
      // 120 fps só gastaria GPU.
      if (agora - ultimo >= 1000 / 60 - 1) {
        const dt = Number.isFinite(ultimo) ? Math.min((agora - ultimo) / 1000, 0.1) : 0;
        ultimo = agora; tempo += dt;
        const atualizarEfeitos = agora - ultimoEfeito >= 1000 / 30 - 1;
        for (const [cod, modelo] of carros) {
          const dx = modelo.alvoX - modelo.x;
          const dy = modelo.alvoY - modelo.y;
          if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
            const fator = movimentoReduzido.matches ? 1 : 1 - Math.exp(-dt * 7);
            modelo.x += dx * fator; modelo.y += dy * fator;
            sujo = true; continua = !movimentoReduzido.matches;
          } else { modelo.x = modelo.alvoX; modelo.y = modelo.alvoY; }
          if (modelo.anim.length && !movimentoReduzido.matches) {
            continua = true;
            if (atualizarEfeitos) { modelo.anim.forEach((f) => f(tempo)); sujo = true; }
          }
          // Carro "vivo": rodas girando (mais rápido quanto mais perto da meta,
          // e muito mais quando está andando), motor tremendo e balanço leve.
          if (!movimentoReduzido.matches) {
            const andou = Math.abs(modelo.x - modelo.ultimoX); modelo.ultimoX = modelo.x;
            const velocidade = 3 + Math.max(0, Math.min(modelo.pct, 150)) / 12 + andou * 2.5;
            modelo.giro -= velocidade * dt;
            for (const r of modelo.rodas) r.rotation.z = modelo.giro;
            const t = tempo + modelo.fase;
            const tremor = modelo.pct > 0 ? 0.012 : 0.004;
            modelo.carro.rotation.z = Math.sin(t * 9) * tremor * 0.6 + (andou > 0.3 ? 0.02 : 0);
            modelo.balanco = Math.sin(t * 23) * tremor * modelo.largura * 0.08;
            continua = true; sujo = true;
          }
          if (sujo) posicionar(cod, modelo);
        }
        if (atualizarEfeitos) ultimoEfeito = agora;
        if (sujo) { renderer.render(cena, camera); sujo = false; }
      } else continua = true;
      if (continua || sujo) frame = requestAnimationFrame(animar);
    };
    atualizar.current = () => {
      const { faixas, indices, garagens } = dados.current;
      const w = Math.max(1, el.clientWidth); const h = Math.max(1, el.clientHeight);
      const linhaAltura = h / Math.max(1, faixas.length);
      const carroLargura = Math.min(145, Math.max(82, linhaAltura * 1.82));
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2; camera.updateProjectionMatrix();
      if (w !== larguraAnterior || h !== alturaAnterior) { renderer.setSize(w, h); larguraAnterior = w; alturaAnterior = h; }
      const ativos = new Set(faixas.map((l) => l.cod));
      for (const [cod, modelo] of carros) if (!ativos.has(cod)) { cena.remove(modelo.carro); liberarObjeto(modelo.carro); carros.delete(cod); }
      faixas.forEach((l, i) => {
        const indice = indices.get(l.cod) ?? i;
        const g = garagens?.get(l.cod.trim());
        const [cor, escura] = coresDoCarro(indice, g);
        const pecas = pecasDoCarro(g);
        const chave = [cor, escura, indice, l.avatar, l.nome, [...pecas].sort().join()].join("|");
        // Bico do carro encosta no ponto do %. Bateu a meta: cruza a linha e a
        // traseira fica depois dela — quanto mais %, mais à frente (até 200%).
        const linha = pontoDaPista(100, w);
        const x = l.percentual >= 100
          ? linha + 14 + carroLargura / 2 + Math.min(1, (l.percentual - 100) / 100) * Math.max(0, MARGEM_CHEGADA - carroLargura - 120)
          // Abaixo da meta: 0% = traseira na largada, 100% = bico na chegada, e
          // o meio proporcional. Antes o bico ia no ponto do % e, como o carro é
          // mais largo que esse trecho, todo mundo até ~15% ficava travado na largada.
          : pontoDaPista(0, w) + carroLargura / 2 + percentualNaPista(l.percentual) * Math.max(0, linha - pontoDaPista(0, w) - carroLargura);
        const y = (i + 0.5) * linhaAltura;
        let modelo = carros.get(l.cod);
        if (modelo?.chave !== chave) {
          const anterior = modelo;
          if (modelo) { cena.remove(modelo.carro); liberarObjeto(modelo.carro); }
          const novo = montarF1({ cor, escura, numero: indice + 1, avatar: l.avatar, iniciais: l.nome.slice(0, 2).toUpperCase(), pecas }, solicitar, "pista");
          const rodas: THREE.Object3D[] = [];
          novo.carro.traverse((o) => { if (o.userData.roda) rodas.push(o); });
          modelo = {
            ...novo, chave, x: anterior?.x ?? x, y: anterior?.y ?? y, alvoX: x, alvoY: y, largura: carroLargura,
            rodas, pct: l.percentual, fase: anterior?.fase ?? Math.random() * 10, giro: anterior?.giro ?? 0,
            ultimoX: anterior?.x ?? x, balanco: 0,
          };
          carros.set(l.cod, modelo); cena.add(modelo.carro);
        }
        modelo.alvoX = x; modelo.alvoY = y; modelo.largura = carroLargura; modelo.pct = l.percentual;
        posicionar(l.cod, modelo);
      });
      for (const [pct, marcador] of marcas.current) marcador.style.left = `${pontoDaPista(pct, w)}px`;
      for (const [pct, grade] of grades.current) grade.style.left = `${pontoDaPista(pct, w)}px`;
      if (chegada.current) chegada.current.style.left = `${pontoDaPista(100, w)}px`;
      solicitar();
    };
    const observador = new ResizeObserver(() => atualizar.current?.()); observador.observe(el);
    const visibilidade = () => { cancelAnimationFrame(frame); frame = 0; ultimo = -Infinity; if (!document.hidden) solicitar(); };
    const contextoPerdido = (event: Event) => { event.preventDefault(); dados.current.onIndisponivel(); };
    document.addEventListener("visibilitychange", visibilidade);
    renderer.domElement.addEventListener("webglcontextlost", contextoPerdido);
    atualizar.current();
    return () => {
      encerrado = true; atualizar.current = null; cancelAnimationFrame(frame); observador.disconnect();
      document.removeEventListener("visibilitychange", visibilidade);
      renderer.domElement.removeEventListener("webglcontextlost", contextoPerdido);
      liberarObjeto(cena); ambiente.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);

  useEffect(() => { dados.current = { faixas, indices, garagens, onIndisponivel }; atualizar.current?.(); }, [faixas, indices, garagens, onIndisponivel]);

  return <div className="flex min-h-0 flex-1 overflow-auto rounded-[14px] border border-[#193d61] bg-[#061225] shadow-[0_15px_50px_#0006]">
    <div className="relative grid w-full min-w-[900px] flex-1 overflow-hidden" style={{ gridTemplateColumns: "clamp(132px,12.6%,220px) 1fr", gridTemplateRows: "32px 1fr", minHeight: Math.max(320, faixas.length * 49 + 40) }}>
      <div className="z-20 flex items-center gap-7 border-b border-[#193447] pl-4 text-[9px] font-medium uppercase tracking-wide text-[#7399bd]"><span>#</span><span>Vendedor</span></div>
      <div className="relative z-20 border-b border-[#193447] bg-gradient-to-b from-[#07172d] to-[#071326]">
        {MARCAS.map((pct) => <span key={pct} ref={(el) => { if (el) marcas.current.set(pct, el); else marcas.current.delete(pct); }} className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold", pct === 100 ? "rounded bg-gradient-to-b from-[#ffe99b] to-[#eebd4a] px-2 py-1 font-black text-[#1b1e21] shadow-[0_0_15px_#facc1520]" : pct === 0 ? "text-white" : "text-[#9ebcde]")}>{pct === 100 ? "META · 100%" : `${pct}%`}</span>)}
      </div>
      <div className="relative z-10 flex flex-col bg-gradient-to-r from-[#07182c] to-[#061224]">
        {faixas.map((l, i) => {
          const [cor] = coresDoCarro(indices.get(l.cod) ?? i, garagens?.get(l.cod.trim()));
          return <div key={l.cod} className="flex min-h-[42px] flex-1 items-center gap-2 border-b border-[#214055]/60 bg-[#061426] px-2" data-piloto={l.cod}>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black shadow-[inset_0_1px_1px_#ffffff25]", i < 3 ? `bg-gradient-to-b ${MEDALHAS[i]}` : "bg-[#142b45] text-[#a8bfdc]")} style={{ width: "clamp(24px,2.3vw,36px)", height: "clamp(24px,2.3vw,36px)", fontSize: "clamp(12px,1vw,16px)" }}>{i + 1}</span>
            {l.avatar ? <img src={l.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full border-2 object-cover" style={{ borderColor: i === 0 ? "#ffda60" : "#36b5e8", width: "clamp(34px,3vw,48px)", height: "clamp(34px,3vw,48px)" }} /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-[#10253b] text-[10px] font-bold text-white" style={{ borderColor: i === 0 ? "#ffda60" : cor, width: "clamp(34px,3vw,48px)", height: "clamp(34px,3vw,48px)" }}>{l.nome.slice(0, 2).toUpperCase()}</span>}
            <span className="min-w-0 truncate text-[10px] font-extrabold uppercase text-white" style={{ fontSize: "clamp(10px,0.9vw,15px)" }} title={l.nome}>{l.nome.split(" ")[0]}{l.cod.trim() === meu && <span className="mt-0.5 block w-fit rounded bg-[#ffda60] px-1 text-[8px] font-black leading-[13px] text-[#1c2230]">VOCÊ</span>}</span>
          </div>;
        })}
      </div>
      <div className="relative min-h-0 bg-[#071427]">
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#142335", backgroundImage: "radial-gradient(#70819716 0.7px, transparent 0.7px),linear-gradient(110deg,#172638,#101d2c 65%,#182637)", backgroundSize: "4px 4px,100% 100%" }}>
          <div className="absolute inset-x-0 top-0 h-[5px] border-y border-[#cdd6df80]" style={{ background: "repeating-linear-gradient(90deg,#e4414d 0 22px,#e1e7ed 22px 44px)" }} />
          <div className="absolute inset-x-0 bottom-1 h-[5px] border-y border-[#cdd6df80]" style={{ background: "repeating-linear-gradient(90deg,#e4414d 0 22px,#e1e7ed 22px 44px)", transform: "rotate(.25deg)", transformOrigin: "left" }} />
          {MARCAS.filter((p) => p !== 100).map((pct) => <div key={pct} ref={(el) => { if (el) grades.current.set(pct, el); else grades.current.delete(pct); }} className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-[#5683a54d]" data-grade={pct} />)}
          {faixas.map((l, i) => {
            const [cor] = coresDoCarro(indices.get(l.cod) ?? i, garagens?.get(l.cod.trim()));
            const rastroCor = l.percentual >= 100 ? "#ffe091" : cor;
            return <div key={l.cod}>
              <div className="pointer-events-none absolute inset-x-0 border-b border-[#60809a55]" style={{ top: `${i / Math.max(1, faixas.length) * 100}%`, height: `${100 / Math.max(1, faixas.length)}%`, background: i % 2 ? "#06132018" : "#26394c12" }}>
                <div className="absolute inset-x-0 top-[62%] h-px opacity-55" style={{ background: "repeating-linear-gradient(90deg,#9cb3c4 0 14px,transparent 14px 30px)" }} />
                <div className="absolute top-1 bottom-1 w-[5px]" style={{ left: 0, background: i === 0 ? "#ffda60" : cor }} />
              </div>
              {l.percentual > 0 && <div ref={(el) => { if (el) rastros.current.set(l.cod, el); else rastros.current.delete(l.cod); }} className="pointer-events-none absolute left-0 top-0 h-[20px]" style={{ background: `linear-gradient(90deg,transparent 15%,${rastroCor}00 50%,${rastroCor}22 85%,${rastroCor}80)`, maskImage: "linear-gradient(180deg,transparent,#000 45%,#000 55%,transparent)" }}>
                <div className="absolute bottom-[9px] right-0 h-px w-[65%] animate-pulse" style={{ background: `linear-gradient(90deg,transparent,${rastroCor})`, boxShadow: `0 0 7px 2px ${rastroCor}70` }} />
              </div>}
            </div>;
          })}
          <div ref={chegada} className="pointer-events-none absolute inset-y-0 z-[2] w-[14px] shadow-[0_0_16px_#ffe18c35]" style={{ backgroundImage: "repeating-conic-gradient(#f7df88 0% 25%,#172536 0% 50%)", backgroundSize: "14px 14px" }} />
        </div>
        <div ref={host} className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true" />
        {faixas.map((l) => <div key={l.cod}>
          <div ref={(el) => { if (el) sombras.current.set(l.cod, el); else sombras.current.delete(l.cod); }} className="pointer-events-none absolute left-0 top-0 z-[2] h-3" style={{ background: "radial-gradient(ellipse,#0009,transparent 72%)" }} />
          <div ref={(el) => { if (el) etiquetas.current.set(l.cod, el); else etiquetas.current.delete(l.cod); }} className="pointer-events-none absolute left-0 top-0 z-[4] flex items-center gap-2">
            <span className={cn("rounded border px-1.5 py-0.5 text-[12px] font-black leading-4 tabular-nums shadow-md", l.percentual >= 100 ? "border-[#ffda60] bg-gradient-to-b from-[#ffe991] to-[#ffc83d] text-[#111d2e] shadow-[0_0_14px_#ffd44b55]" : "border-[#496782] bg-[#071426] text-[#eff5ff]")} style={{ fontSize: "clamp(12px,1vw,18px)" }} aria-label={`${l.nome}: ${l.percentual.toFixed(0)}% da meta`}>{l.percentual.toFixed(0)}%</span>
            {l.percentual >= 100 && <Crown className="h-3 w-3 fill-[#ffd450] text-[#ffd450]" />}
          </div>
          {l.cod.trim() === meu && onAbrirGaragem && <button type="button" ref={(el) => { if (el) botoes.current.set(l.cod, el); else botoes.current.delete(l.cod); }} onClick={() => onAbrirGaragem(l.cod)} aria-label="Abrir minha garagem" title="Abrir minha garagem" className="absolute left-0 top-0 z-[5] h-11 cursor-pointer rounded-lg border border-transparent hover:border-[#ffe08c80] focus-visible:border-yellow-300 focus-visible:outline-none" />}
        </div>)}
        {faixas.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Nenhum piloto no ranking de hoje.</p>}
      </div>
    </div>
  </div>;
}

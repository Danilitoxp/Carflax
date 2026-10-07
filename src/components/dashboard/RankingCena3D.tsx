import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { coresDoCarro, ordenarFaixas, pecasDoCarro } from "./garagem";
import { liberarObjeto, montarF1, texturaBrilho } from "./modeloF1";
import type { RankingCorridaProps } from "./RankingCorrida";

type Angulo = "baixa" | "equilibrada" | "aerea";
const INICIO = -26;
const META = 22;
const LARGURA = 70;
const FAIXA = 3.6;
const MEDALHAS = ["from-amber-300 to-amber-500 text-amber-950", "from-slate-200 to-slate-400 text-slate-900", "from-orange-300 to-orange-600 text-orange-950"];
const destino = (pct: number) => pct >= 100 ? META + 5 : INICIO + Math.max(0, Math.min(100, pct)) / 100 * (META - INICIO - 3);

function pistaTextura(quantidade: number, tintas: { cor: string; destaque: boolean; chegou: boolean }[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = Math.min(2048, Math.max(512, quantidade * 96));
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  ctx.fillStyle = "#202938";
  ctx.fillRect(0, 0, w, h);
  // Asfalto desenhado uma vez, sem ruído animado nem imagens externas.
  ctx.fillStyle = "#283141";
  for (let y = 0; y < h; y += 10) for (let x = 0; x < w; x += 13) ctx.fillRect(x + y % 13, y, 2, 2);
  const px = (x: number) => (x + LARGURA / 2) / LARGURA * w;
  tintas.forEach((t, i) => {
    ctx.globalAlpha = t.destaque ? 0.14 : t.chegou ? 0.1 : 0.025;
    ctx.fillStyle = t.chegou ? "#fbbf24" : t.cor;
    ctx.fillRect(0, i * h / quantidade + 1, w, h / quantidade - 2);
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#8c9aae";
  ctx.lineWidth = 2;
  ctx.setLineDash([28, 28]);
  for (let i = 1; i < quantidade; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * h / quantidade); ctx.lineTo(w, i * h / quantidade); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "#dce8f4"; ctx.fillRect(px(INICIO - 3), 0, 4, h);
  for (const pct of [25, 50, 75]) {
    ctx.fillStyle = "rgba(148,163,184,0.12)";
    ctx.fillRect(px(INICIO + pct / 100 * (META - INICIO)), 0, 2, h);
  }
  const tamanho = 12;
  for (let y = 0; y < h; y += tamanho) for (let col = 0; col < 3; col++) {
    ctx.fillStyle = (Math.floor(y / tamanho) + col) % 2 ? "#0b1020" : "#f8fafc";
    ctx.fillRect(px(META) + col * tamanho, y, tamanho, tamanho);
  }
  for (let x = 0; x < w; x += 32) {
    ctx.fillStyle = Math.floor(x / 32) % 2 ? "#f1f5f9" : "#e24d56";
    ctx.fillRect(x, 0, 32, 9); ctx.fillRect(x, h - 9, 32, 9);
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 2;
  return textura;
}

export function RankingCena3D({ linhas, garagens, meuCodigo, onAbrirGaragem, angulo, onIndisponivel }: RankingCorridaProps & { angulo: Angulo; onIndisponivel: () => void }) {
  const faixas = ordenarFaixas(linhas);
  const classificacao = new Map([...linhas].sort((a, b) => b.percentual - a.percentual).map((l, i) => [l.cod, i + 1]));
  const cod = String(meuCodigo || "").trim();
  const normalizados = faixas.filter((l) => cod && (l.cod.trim().replace(/^0+/, "") || l.cod.trim()) === (cod.replace(/^0+/, "") || cod));
  const meu = faixas.some((l) => l.cod.trim() === cod) ? cod : normalizados.length === 1 ? normalizados[0].cod.trim() : "";
  const host = useRef<HTMLDivElement>(null);
  const pilotos = useRef(new Map<string, HTMLDivElement>());
  const etiquetas = useRef(new Map<string, HTMLDivElement>());
  const botoes = useRef(new Map<string, HTMLButtonElement>());
  const marcadores = useRef(new Map<number, HTMLSpanElement>());
  const dados = useRef({ faixas, garagens, angulo, meu, onIndisponivel });
  const sincronizar = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      dados.current.onIndisponivel();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    el.appendChild(renderer.domElement);
    const cena = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-35, 35, 25, -25, 0.1, 300);
    cena.add(new THREE.AmbientLight(0xffffff, 1.3));
    const luz = new THREE.DirectionalLight(0xffffff, 2.5);
    luz.position.set(-10, 30, 35); cena.add(luz);
    const recorte = new THREE.DirectionalLight(0x8fbaff, 1.2);
    recorte.position.set(15, 12, -20); cena.add(recorte);
    let pista: THREE.Group | null = null;
    let pistaChave = "";
    let profundidade = 1;
    const sombraMapa = texturaBrilho();
    type Carro = ReturnType<typeof montarF1> & { chave: string; alvo: number; sombra: THREE.Mesh; faixa: number };
    const carros = new Map<string, Carro>();
    let frame = 0;
    let ultimo = -Infinity;
    let tempo = 0;
    let sujo = true;
    let encerrado = false;
    const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ponto = new THREE.Vector3();
    const projetar = (x: number, y: number, z: number) => {
      ponto.set(x, y, z).project(camera);
      return { x: (ponto.x + 1) / 2 * el.clientWidth, y: (1 - ponto.y) / 2 * el.clientHeight };
    };
    const posicionarEtiquetas = () => {
      for (const [cod, modelo] of carros) {
        const z = modelo.carro.position.z;
        const piloto = pilotos.current.get(cod);
        if (piloto) piloto.style.top = `${projetar(INICIO, 0.45, z).y}px`;
        const etiqueta = etiquetas.current.get(cod);
        const pos = projetar(modelo.carro.position.x + 3.2, 0.8, z);
        if (etiqueta) etiqueta.style.transform = `translate3d(${pos.x}px,${pos.y}px,0) translateY(-50%)`;
        const botao = botoes.current.get(cod);
        if (botao) {
          const centro = projetar(modelo.carro.position.x, 0.6, z);
          const a = projetar(modelo.carro.position.x - 3, 0, z);
          const b = projetar(modelo.carro.position.x + 3, 0, z);
          botao.style.width = `${Math.max(60, Math.abs(b.x - a.x))}px`;
          botao.style.transform = `translate3d(${centro.x}px,${centro.y}px,0) translate(-50%,-50%)`;
        }
      }
      for (const [pct, elemento] of marcadores.current) {
        const pos = projetar(pct === 0 ? INICIO - 3 : INICIO + pct / 100 * (META - INICIO), 0, -profundidade / 2);
        elemento.style.transform = `translate3d(${pos.x}px,${pos.y - 25}px,0) translateX(-50%)`;
      }
    };
    const solicitar = () => {
      if (encerrado) return;
      sujo = true;
      if (!frame && !document.hidden) frame = requestAnimationFrame(animar);
    };
    const animar = (agora: number) => {
      frame = 0;
      if (encerrado || document.hidden) return;
      let continua = false;
      if (agora - ultimo >= 1000 / 120 - 1) {
        const dt = Number.isFinite(ultimo) ? Math.min((agora - ultimo) / 1000, 0.1) : 0;
        ultimo = agora; tempo += dt;
        for (const modelo of carros.values()) {
          const diferenca = modelo.alvo - modelo.carro.position.x;
          if (Math.abs(diferenca) > 0.01) {
            modelo.carro.position.x = menosMovimento.matches ? modelo.alvo : modelo.carro.position.x + diferenca * (1 - Math.exp(-dt * 5));
            sujo = true; continua = !menosMovimento.matches;
          } else modelo.carro.position.x = modelo.alvo;
          modelo.sombra.position.x = modelo.carro.position.x;
          if (modelo.anim.length && !menosMovimento.matches) {
            modelo.anim.forEach((f) => f(tempo)); continua = true; sujo = true;
          }
        }
        if (sujo) { renderer.render(cena, camera); posicionarEtiquetas(); sujo = false; }
      } else continua = true;
      if (continua || sujo) frame = requestAnimationFrame(animar);
    };
    const ajustarCamera = () => {
      const inclinacao = { baixa: 0.51, equilibrada: 0.73, aerea: 1.05 }[dados.current.angulo];
      camera.position.set(2, Math.sin(inclinacao) * 90, Math.cos(inclinacao) * 90);
      camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
      const limites = new THREE.Box3();
      for (const x of [-LARGURA / 2 - 1, LARGURA / 2 + 1]) for (const z of [-profundidade / 2 - 2, profundidade / 2 + 2]) limites.expandByPoint(new THREE.Vector3(x, 0, z).applyMatrix4(camera.matrixWorldInverse));
      const aspect = Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight);
      const largura = limites.max.x - limites.min.x;
      const altura = limites.max.y - limites.min.y;
      const meioAltura = Math.max(altura / 2 + 2, (largura / 2 + 1) / aspect);
      const cy = (limites.max.y + limites.min.y) / 2;
      const cx = (limites.max.x + limites.min.x) / 2;
      camera.left = cx - meioAltura * aspect; camera.right = cx + meioAltura * aspect;
      camera.top = cy + meioAltura; camera.bottom = cy - meioAltura;
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(1, el.clientWidth), Math.max(1, el.clientHeight));
      solicitar();
    };
    sincronizar.current = () => {
      const { faixas, garagens, meu } = dados.current;
      const tintas = faixas.map((l, i) => ({ cor: coresDoCarro(i, garagens?.get(l.cod.trim()))[0], destaque: l.cod.trim() === meu, chegou: l.percentual >= 100 }));
      const chavePista = JSON.stringify(tintas);
      if (pistaChave !== chavePista) {
        if (pista) { cena.remove(pista); liberarObjeto(pista); }
        pistaChave = chavePista; profundidade = Math.max(1, faixas.length) * FAIXA;
        pista = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(LARGURA, 0.28, profundidade), new THREE.MeshStandardMaterial({ color: "#0c1425", roughness: 0.7 }));
        base.position.y = -0.16; pista.add(base);
        const asfalto = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA, profundidade), new THREE.MeshStandardMaterial({ map: pistaTextura(Math.max(1, faixas.length), tintas), roughness: 0.95 }));
        asfalto.rotation.x = -Math.PI / 2; pista.add(asfalto);
        const trilhoMat = new THREE.MeshBasicMaterial({ color: "#22d3ee" });
        for (const lado of [-1, 1]) {
          const trilho = new THREE.Mesh(new THREE.BoxGeometry(LARGURA, 0.08, 0.08), trilhoMat);
          trilho.position.set(0, 0.02, lado * (profundidade / 2 + 0.1)); pista.add(trilho);
        }
        cena.add(pista);
      }
      const ativos = new Set(faixas.map((l) => l.cod));
      for (const [cod, modelo] of carros) if (!ativos.has(cod)) {
        cena.remove(modelo.carro, modelo.sombra); liberarObjeto(modelo.carro);
        modelo.sombra.geometry.dispose(); (modelo.sombra.material as THREE.Material).dispose(); carros.delete(cod);
      }
      faixas.forEach((l, i) => {
        const garagem = garagens?.get(l.cod.trim());
        const [cor, escura] = coresDoCarro(i, garagem);
        const pecas = pecasDoCarro(garagem);
        const chave = [cor, escura, i + 1, l.avatar, l.nome, [...pecas].sort().join()].join("|");
        let modelo = carros.get(l.cod);
        if (modelo?.chave !== chave) {
          const xAnterior = modelo?.carro.position.x ?? destino(l.percentual);
          if (modelo) { cena.remove(modelo.carro); liberarObjeto(modelo.carro); }
          const novo = montarF1({ cor, escura, numero: i + 1, avatar: l.avatar, iniciais: l.nome.slice(0, 2).toUpperCase(), pecas }, solicitar);
          const sombra = modelo?.sombra ?? new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3), new THREE.MeshBasicMaterial({ map: sombraMapa, transparent: true, opacity: 0.6, color: "#000000", depthWrite: false }));
          sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.012;
          modelo = { ...novo, chave, alvo: destino(l.percentual), sombra, faixa: i };
          modelo.carro.position.x = xAnterior;
          modelo.carro.scale.setScalar(1.16);
          carros.set(l.cod, modelo); cena.add(modelo.carro, sombra);
        }
        modelo.alvo = destino(l.percentual);
        modelo.faixa = i;
        modelo.carro.position.z = -profundidade / 2 + FAIXA * (i + 0.5);
        modelo.sombra.position.z = modelo.carro.position.z;
      });
      ajustarCamera();
    };
    const visibilidade = () => { cancelAnimationFrame(frame); frame = 0; ultimo = -Infinity; if (!document.hidden) solicitar(); };
    const observador = new ResizeObserver(ajustarCamera); observador.observe(el);
    document.addEventListener("visibilitychange", visibilidade);
    menosMovimento.addEventListener("change", solicitar);
    const aoPerderContexto = (e: Event) => { e.preventDefault(); dados.current.onIndisponivel(); };
    renderer.domElement.addEventListener("webglcontextlost", aoPerderContexto);
    sincronizar.current();
    return () => {
      encerrado = true; sincronizar.current = null; cancelAnimationFrame(frame); observador.disconnect();
      document.removeEventListener("visibilitychange", visibilidade); menosMovimento.removeEventListener("change", solicitar);
      renderer.domElement.removeEventListener("webglcontextlost", aoPerderContexto);
      liberarObjeto(cena); sombraMapa.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    dados.current = { faixas, garagens, angulo, meu, onIndisponivel };
    sincronizar.current?.();
  }, [faixas, garagens, angulo, meu, onIndisponivel]);

  return <div className="min-h-0 flex-1 overflow-auto rounded-3xl border border-white/10 bg-[#091020] shadow-2xl">
    <div className="relative flex h-full" style={{ minHeight: Math.max(320, faixas.length * 44), minWidth: Math.max(900, faixas.length * 105) }}>
      <div className="sticky left-0 z-10 w-[140px] sm:w-[190px] shrink-0 border-r border-white/10 bg-gradient-to-r from-[#0d1528] to-[#101a2d]">
        <span className="absolute left-4 top-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Pilotos / posição</span>
        {faixas.map((l, i) => {
          const lugar = classificacao.get(l.cod)!;
          const [cor] = coresDoCarro(i, garagens?.get(l.cod.trim()));
          return <div key={l.cod} ref={(el) => { if (el) pilotos.current.set(l.cod, el); else pilotos.current.delete(l.cod); }} className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-2 px-2 sm:px-3" style={{ top: `${(i + 0.5) / Math.max(1, faixas.length) * 100}%` }}>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl text-xs font-black tabular-nums", lugar <= 3 ? `bg-gradient-to-b ${MEDALHAS[lugar - 1]}` : "bg-white/5 text-slate-400")}>{lugar}º</span>
            {l.avatar ? <img src={l.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8 border-2 object-cover" style={{ borderColor: cor }} /> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8 border-2 text-[10px] font-bold text-white" style={{ borderColor: cor }}>{l.nome.slice(0, 2).toUpperCase()}</span>}
            <span className="min-w-0 truncate text-[10px] sm:text-xs font-black uppercase text-white" title={l.nome}>{l.nome.split(" ")[0]}{l.cod.trim() === meu && <span className="mt-0.5 block text-[8px] tracking-widest text-cyan-300">SEU CARRO</span>}</span>
          </div>;
        })}
        <p className="absolute bottom-3 left-3 text-[8px] font-bold uppercase tracking-widest text-slate-500 sm:hidden">Deslize a pista →</p>
      </div>
      <div className="relative min-w-0 flex-1 bg-[radial-gradient(ellipse_at_center,_#1c2a43,_#091020_75%)]">
        <div ref={host} className="absolute inset-0" aria-hidden="true" />
        {[0, 25, 50, 75, 100].map((pct) => <span key={pct} ref={(el) => { if (el) marcadores.current.set(pct, el); else marcadores.current.delete(pct); }} className={cn("pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-widest", pct === 100 ? "bg-amber-400/10 text-amber-300" : "text-slate-500")}>{pct === 0 ? "Largada" : pct === 100 ? "Meta · 100%" : `${pct}%`}</span>)}
        {faixas.map((l) => <div key={l.cod}>
          <div ref={(el) => { if (el) etiquetas.current.set(l.cod, el); else etiquetas.current.delete(l.cod); }} className="pointer-events-none absolute left-0 top-0 flex items-center gap-1.5">
            <span className={cn("rounded-md border px-2 py-1 text-xs font-black tabular-nums shadow-md", l.percentual >= 100 ? "border-amber-300/40 bg-amber-400 text-amber-950" : "border-white/10 bg-[#0b1224]/90 text-white")} aria-label={`${l.nome}: ${l.percentual.toFixed(0)}% da meta`}>{l.percentual.toFixed(0)}%</span>
            {l.percentual >= 100 && <Trophy className="h-4 w-4 text-amber-300" />}
          </div>
          {l.cod.trim() === meu && onAbrirGaragem && <button type="button" ref={(el) => { if (el) botoes.current.set(l.cod, el); else botoes.current.delete(l.cod); }} onClick={() => onAbrirGaragem(l.cod)} aria-label="Abrir minha garagem" title="Abrir minha garagem" className="absolute left-0 top-0 h-12 cursor-pointer rounded-xl border border-transparent hover:border-cyan-300/60 hover:bg-cyan-300/5 focus-visible:border-cyan-300 focus-visible:outline-none" />}
        </div>)}
        {faixas.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Nenhum piloto no ranking de hoje.</p>}
      </div>
    </div>
  </div>;
}

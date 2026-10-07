import { useEffect, useRef } from "react";
import * as THREE from "three";
import { pecasDoCarro } from "./garagem";
import { montarF1, liberarObjeto, texturaBrilho, type Visual } from "./modeloF1";

export function F1em3D({ visual }: { visual: Visual }) {
  const ref = useRef<HTMLDivElement>(null);
  const atualizar = useRef<((v: Visual) => void) | null>(null);
  // Busca e saldo não reconstruem o modelo. A cena permanece durante as trocas.
  const chave = [visual.cor, visual.escura, visual.numero, visual.avatar, visual.iniciais, [...pecasDoCarro({ pecas: visual.pecas })].sort().join()].join("|");
  const visualRef = useRef(visual);
  useEffect(() => {
    visualRef.current = visual;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Resolução limitada evita multiplicar os pixels em celulares e monitores 4K.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.25));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);

    const cena = new THREE.Scene();
    // Metais precisam de um ambiente claro para refletir o estúdio.
    const luzCanvas = document.createElement("canvas");
    luzCanvas.width = 256; luzCanvas.height = 128;
    const contexto = luzCanvas.getContext("2d")!;
    const gradiente = contexto.createLinearGradient(0, 0, 0, 128);
    gradiente.addColorStop(0, "#64748b");
    gradiente.addColorStop(0.35, "#f8fafc");
    gradiente.addColorStop(0.6, "#94a3b8");
    gradiente.addColorStop(1, "#1e293b");
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, 256, 128);
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(24, 16, 20, 78);
    contexto.fillRect(150, 22, 28, 66);
    const ambiente = new THREE.CanvasTexture(luzCanvas);
    ambiente.colorSpace = THREE.SRGBColorSpace;
    ambiente.mapping = THREE.EquirectangularReflectionMapping;
    cena.environment = ambiente;
    cena.environmentIntensity = 1;

    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(6.4, 4.3, 6.4);
    camera.lookAt(0, 0.4, 0);
    cena.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(5, 8, 4);
    cena.add(sol);
    const contra = new THREE.DirectionalLight(0x88aaff, 1);
    contra.position.set(-5, 3, -4);
    cena.add(contra);

    // Plataforma giratória de exposição: base metálica, tampo escuro com
    // anéis e borda de luz, mais um halo suave no "chão" abaixo.
    const plataforma = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.95, 3.1, 0.28, 48),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 }),
    );
    base.position.y = -0.14;
    plataforma.add(base);
    const tampo = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 48),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.45 }),
    );
    tampo.rotation.x = -Math.PI / 2;
    tampo.position.y = 0.002;
    plataforma.add(tampo);
    for (const r of [1.2, 2.1]) {
      const anel = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 48), new THREE.MeshBasicMaterial({ color: 0x334155 }));
      anel.rotation.x = -Math.PI / 2;
      anel.position.y = 0.004;
      plataforma.add(anel);
    }
    const bordaLuz = new THREE.Mesh(new THREE.TorusGeometry(2.93, 0.035, 6, 64), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
    bordaLuz.rotation.x = -Math.PI / 2;
    plataforma.add(bordaLuz);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: texturaBrilho(), color: 0x22d3ee, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.29;
    plataforma.add(halo);
    cena.add(plataforma);

    let modelo: ReturnType<typeof montarF1> | null = null;
    let frame = 0;
    let ultimoQuadro = -Infinity;
    let tempo = 0;
    const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animar = (agora: number) => {
      frame = 0;
      if (document.hidden || !modelo) return;
      const fps = 120;
      if (agora - ultimoQuadro >= 1000 / fps - 1) {
        // Não avança o relógio durante o tempo em que a aba ficou oculta.
        tempo += Number.isFinite(ultimoQuadro) ? Math.min((agora - ultimoQuadro) / 1000, 0.1) : 0;
        ultimoQuadro = agora;
        // A rotação faz parte do provador, mesmo com movimento reduzido.
        modelo.carro.rotation.y = tempo * 0.25;
        modelo.carro.traverse(obj => { if (obj.userData.velocidadeGiro) obj.rotation.z = tempo * obj.userData.velocidadeGiro; });
        modelo.anim.forEach((f) => f(tempo));
        renderer.render(cena, camera);
      }
      frame = requestAnimationFrame(animar);
    };
    const solicitarQuadro = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(animar);
    };
    atualizar.current = (v) => {
      if (modelo) {
        cena.remove(modelo.carro);
        liberarObjeto(modelo.carro);
      }
      modelo = montarF1(v, solicitarQuadro);
      modelo.carro.rotation.y = tempo * 0.25;
      cena.add(modelo.carro);
      solicitarQuadro();
    };
    const aoMudarVisibilidade = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      ultimoQuadro = -Infinity;
      if (!document.hidden) solicitarQuadro();
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    movimentoReduzido.addEventListener("change", solicitarQuadro);

    const aoRedimensionar = () => {
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      const distancia = Math.max(6.4, 6.4 / camera.aspect);
      camera.position.set(distancia, distancia * 0.67, distancia);
      camera.lookAt(0, 0.4, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, Math.max(1, el.clientHeight));
      solicitarQuadro();
    };
    const observador = new ResizeObserver(aoRedimensionar);
    observador.observe(el);
    aoRedimensionar();

    return () => {
      cancelAnimationFrame(frame);
      observador.disconnect();
      atualizar.current = null;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      movimentoReduzido.removeEventListener("change", solicitarQuadro);
      liberarObjeto(cena);
      ambiente.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    atualizar.current?.(visualRef.current);
  }, [chave]);

  return <div ref={ref} className="h-full w-full" />;
}

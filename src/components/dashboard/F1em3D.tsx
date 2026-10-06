import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PecaId } from "./garagem";

/**
 * O F1 da pista (mesmo contorno do SVG do modo corrida) em 3D. O carro base
 * fica sempre no mesmo estilo; cada peça comprada muda bastante o visual — é o
 * que faz o vendedor querer trocar:
 *  - rodas: aro dourado de 5 raios com brilho;
 *  - aerofólio: asa dupla alta com DRS, ponteiras douradas e faixa de LED;
 *  - neon: luz por baixo trocando de cor e iluminando o chão;
 *  - turbo: escapamentos cromados, chamas em camadas e faíscas;
 *  - ouro: lataria cromada dourada com brilhos girando em volta.
 */

export interface Visual {
  cor: string;
  escura: string;
  numero: number;
  avatar?: string;
  iniciais: string;
  pecas: Set<PecaId>;
}

// Coordenadas do SVG da pista (220 x 80) → mundo 3D.
const X = (x: number) => (x - 110) / 40;
const Z = (y: number) => (y - 40) / 40;

function texturaTexto(texto: string, fundo: string, cor: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = fundo;
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = cor;
  g.font = "900 64px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mancha radial (para o neon no chão e o brilho das faíscas). */
function texturaBrilho() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

type Animacao = (t: number) => void;

function montarF1(v: Visual) {
  const carro = new THREE.Group();
  const anim: Animacao[] = [];
  const tem = (p: PecaId) => v.pecas.has(p);
  const ouro = tem("ouro");

  // Base do carro: mesmo estilo de sempre. Só o kit ouro mexe na lataria.
  const lataria = new THREE.MeshStandardMaterial({
    color: v.cor,
    metalness: ouro ? 1 : 0.5,
    roughness: ouro ? 0.15 : 0.3,
    emissive: ouro ? "#5c3d00" : "#000000",
  });
  const escura = new THREE.MeshStandardMaterial({ color: v.escura, roughness: 0.4, metalness: 0.3 });
  const carbono = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.8, metalness: 0.3 });
  const borracha = new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.9 });
  const cromo = new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 1, roughness: 0.08 });
  const douradoMat = new THREE.MeshStandardMaterial({ color: "#fcd34d", metalness: 1, roughness: 0.12, emissive: "#b45309", emissiveIntensity: 0.35 });
  const sombra = (m: THREE.Mesh) => {
    m.castShadow = true;
    return m;
  };

  // Carroceria: o path do SVG extrudado, com bisel.
  const pts: [number, number][] = [
    [18, 30], [60, 24], [96, 20], [150, 26], [190, 34], [206, 37],
    [206, 43], [190, 46], [150, 54], [96, 60], [60, 56], [18, 50],
  ];
  const forma = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? forma.lineTo(X(x), Z(y)) : forma.moveTo(X(x), Z(y))));
  const corpo = sombra(new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3 }),
    lataria,
  ));
  corpo.rotation.x = Math.PI / 2;
  corpo.position.y = 0.62;
  carro.add(corpo);

  for (const s of [-1, 1]) {
    const pod = sombra(new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.22), escura));
    pod.position.set(X(84), 0.45, s * 0.5);
    carro.add(pod);
  }
  // Faixa branca do bico
  const faixa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: "#ffffff" }));
  faixa.position.set(X(178), 0.69, 0);
  carro.add(faixa);

  // Rodas
  const rodas: THREE.Group[] = [];
  const douradas = tem("rodas");
  for (const [x, y, r, w] of [[43, 11, 0.36, 0.45], [43, 69, 0.36, 0.45], [165, 12, 0.3, 0.4], [165, 68, 0.3, 0.4]]) {
    const roda = new THREE.Group();
    const pneu = sombra(new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 28), borracha));
    pneu.rotation.x = Math.PI / 2;
    roda.add(pneu);
    const lado = y < 40 ? -1 : 1;
    const aroMat = douradas ? douradoMat : new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.8 });
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 20), aroMat);
    disco.rotation.x = Math.PI / 2;
    roda.add(disco);
    if (douradas) {
      // 5 raios + cubo cromado
      for (let k = 0; k < 5; k++) {
        const raio = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 1.05, 0.05), douradoMat);
        raio.rotation.z = (k / 5) * Math.PI * 2;
        raio.position.z = lado * (w / 2 + 0.02);
        roda.add(raio);
      }
      const cubo = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.08, 16), cromo);
      cubo.rotation.x = Math.PI / 2;
      cubo.position.z = lado * (w / 2 + 0.02);
      roda.add(cubo);
      // faixa amarela no pneu, estilo slick
      const faixaPneu = new THREE.Mesh(new THREE.TorusGeometry(r * 0.85, 0.015, 6, 40), new THREE.MeshBasicMaterial({ color: "#facc15" }));
      faixaPneu.position.z = lado * (w / 2 + 0.005);
      roda.add(faixaPneu);
    }
    roda.position.set(X(x), r, Z(y));
    carro.add(roda);
    rodas.push(roda);
    // Braços da suspensão
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, Math.abs(Z(y)) - 0.3), carbono);
    braco.position.set(X(x), 0.4, Z(y) / 2 + (y < 40 ? 0.15 : -0.15));
    carro.add(braco);
  }
  anim.push((t) => rodas.forEach((r) => (r.rotation.z = -t * 6)));

  // Aerofólio traseiro
  if (tem("aerofolio")) {
    const larg = 2.1;
    const alt = 1.25;
    const asa1 = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, larg), lataria));
    asa1.position.set(X(12), alt, 0);
    asa1.rotation.z = -0.12;
    carro.add(asa1);
    // flap do DRS abrindo e fechando
    const flap = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, larg), carbono));
    flap.position.set(X(12) - 0.1, alt + 0.14, 0);
    carro.add(flap);
    anim.push((t) => (flap.rotation.z = -0.15 - Math.max(0, Math.sin(t * 1.5)) * 0.5));
    // ponteiras douradas
    for (const s of [-1, 1]) {
      const placa = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.04), douradoMat));
      placa.position.set(X(12), alt - 0.1, s * (larg / 2));
      carro.add(placa);
    }
    // faixa de LED vermelha
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.04, larg - 0.1),
      new THREE.MeshBasicMaterial({ color: "#ff1744" }),
    );
    led.position.set(X(12) - 0.27, alt - 0.02, 0);
    carro.add(led);
    anim.push((t) => ((led.material as THREE.MeshBasicMaterial).color.setHSL(0, 1, 0.45 + Math.sin(t * 6) * 0.15)));
    for (const s of [-0.35, 0.35]) {
      const haste = new THREE.Mesh(new THREE.BoxGeometry(0.08, alt - 0.55, 0.05), carbono);
      haste.position.set(X(16), (alt + 0.55) / 2, s);
      carro.add(haste);
    }
  } else {
    const asa = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 1.6), escura));
    asa.position.set(X(12), 0.95, 0);
    carro.add(asa);
    for (const s of [-1, 1]) {
      const placa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.04), carbono);
      placa.position.set(X(12), 0.8, s * 0.8);
      carro.add(placa);
    }
    const haste = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), carbono);
    haste.position.set(X(14), 0.72, 0);
    carro.add(haste);
  }

  // Aerofólio dianteiro
  const asaF = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 1.4), lataria));
  asaF.position.set(X(203), 0.12, 0);
  carro.add(asaF);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.03), ouro ? douradoMat : carbono);
    p.position.set(X(203), 0.16, s * 0.7);
    carro.add(p);
  }

  // Número no bico
  const numero = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ map: texturaTexto(String(v.numero), "#ffffff", "#0f172a") }));
  numero.rotation.x = -Math.PI / 2;
  numero.rotation.z = -Math.PI / 2;
  numero.position.set(X(166), 0.705, 0);
  carro.add(numero);

  // Cockpit, halo e capacete com a foto
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.2 }));
  cockpit.scale.set(1, 0.25, 0.8);
  cockpit.position.set(X(112), 0.68, 0);
  carro.add(cockpit);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32, Math.PI), ouro ? douradoMat : new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.9 }));
  halo.rotation.y = Math.PI / 2;
  halo.position.set(X(112), 0.7, 0);
  carro.add(halo);
  // Piloto: macacão, braços no volante e capacete com viseira. A foto do
  // vendedor vai num adesivo redondo no alto do capacete (visto de cima, como
  // no carro da pista).
  const piloto = new THREE.Group();
  piloto.position.set(X(112), 0, 0);
  const macacao = new THREE.MeshStandardMaterial({ color: v.escura, roughness: 0.6 });
  const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.14, 6, 16), macacao);
  tronco.position.set(-0.1, 0.74, 0);
  tronco.rotation.z = 0.25;
  piloto.add(tronco);
  const volanteX = 0.3;
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 24), new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.5 }));
  volante.rotation.y = Math.PI / 2;
  volante.rotation.x = 0.3;
  volante.position.set(volanteX, 0.8, 0);
  piloto.add(volante);
  for (const s of [-1, 1]) {
    const ombro = new THREE.Vector3(-0.08, 0.84, s * 0.13);
    const mao = new THREE.Vector3(volanteX - 0.02, 0.8, s * 0.07);
    const meio = ombro.clone().lerp(mao, 0.5);
    const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, ombro.distanceTo(mao) - 0.04, 4, 10), macacao);
    braco.position.copy(meio);
    braco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), mao.clone().sub(ombro).normalize());
    piloto.add(braco);
    const luva = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: "#f8fafc" }));
    luva.position.copy(mao);
    piloto.add(luva);
  }
  const capaceteMat = new THREE.MeshStandardMaterial({ color: v.cor, metalness: 0.3, roughness: 0.25 });
  const capacete = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 20), capaceteMat));
  capacete.scale.set(1.12, 1, 0.95);
  capacete.position.set(-0.02, 0.98, 0);
  piloto.add(capacete);
  // faixa branca de frente a trás
  const faixaCap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: "#ffffff" }));
  faixaCap.scale.set(1.12, 1, 1);
  faixaCap.position.copy(capacete.position);
  piloto.add(faixaCap);
  // viseira escura espelhada voltada para a frente (+X)
  const viseira = new THREE.Mesh(
    new THREE.SphereGeometry(0.195, 32, 12, Math.PI - 0.95, 1.9, 1.15, 0.55),
    new THREE.MeshStandardMaterial({ color: "#0b1020", metalness: 1, roughness: 0.05, emissive: "#1e3a8a", emissiveIntensity: 0.25, side: THREE.DoubleSide }),
  );
  viseira.scale.copy(capacete.scale);
  viseira.position.copy(capacete.position);
  piloto.add(viseira);
  // adesivo com a foto no alto do capacete
  const adesivoMat = new THREE.MeshBasicMaterial({ transparent: true });
  if (v.avatar) {
    new THREE.TextureLoader().setCrossOrigin("anonymous").load(v.avatar, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      adesivoMat.map = t;
      adesivoMat.needsUpdate = true;
    });
  } else {
    adesivoMat.map = texturaTexto(v.iniciais, v.cor, "#ffffff");
  }
  const adesivo = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), adesivoMat);
  adesivo.rotation.x = -Math.PI / 2;
  adesivo.rotation.z = -Math.PI / 2;
  adesivo.position.set(-0.04, 0.98 + 0.19 + 0.003, 0);
  piloto.add(adesivo);
  const aroAdesivo = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.115, 32), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  aroAdesivo.rotation.copy(adesivo.rotation);
  aroAdesivo.position.copy(adesivo.position);
  piloto.add(aroAdesivo);
  carro.add(piloto);

  const brilho = texturaBrilho();

  // Neon: luz por baixo trocando de cor e pintando o chão
  if (tem("neon")) {
    const neonMat = new THREE.MeshBasicMaterial({ map: brilho, color: "#22d3ee", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const mancha = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), neonMat);
    mancha.rotation.x = -Math.PI / 2;
    mancha.position.y = 0.02;
    carro.add(mancha);
    const tubos: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      const tubo = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 3.6, 4, 8), new THREE.MeshBasicMaterial({ color: "#22d3ee" }));
      tubo.rotation.z = Math.PI / 2;
      tubo.position.set(0.1, 0.2, s * 0.45);
      carro.add(tubo);
      tubos.push(tubo);
    }
    // Sem PointLight: luz dinâmica pesa em todo material da cena. A mancha
    // aditiva no chão já dá o efeito de luz.
    const cor = new THREE.Color();
    anim.push((t) => {
      cor.setHSL((t * 0.08) % 1, 1, 0.55);
      neonMat.color.copy(cor);
      neonMat.opacity = 0.7 + Math.sin(t * 5) * 0.2;
      tubos.forEach((m) => (m.material as THREE.MeshBasicMaterial).color.copy(cor));
    });
  }

  // Turbo: escapamentos cromados, chamas em camadas e faíscas
  if (tem("turbo")) {
    const chamas: THREE.Mesh[] = [];
    for (const s of [-0.16, 0.16]) {
      const cano = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 16, 1, true), cromo));
      cano.rotation.z = Math.PI / 2;
      cano.position.set(X(18) - 0.1, 0.62, s);
      carro.add(cano);
      for (const [cor, raio, comp] of [["#2563eb", 0.07, 0.5], ["#f97316", 0.11, 0.9], ["#fde047", 0.06, 0.55]] as const) {
        const c = new THREE.Mesh(
          new THREE.ConeGeometry(raio, comp, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        c.rotation.z = Math.PI / 2;
        c.position.set(X(18) - 0.3 - comp / 2, 0.62, s);
        c.userData.base = c.position.x;
        c.userData.comp = comp;
        carro.add(c);
        chamas.push(c);
      }
    }
    const qtd = 60;
    const pos = new Float32Array(qtd * 3);
    const vel = Array.from({ length: qtd }, () => Math.random());
    const faiscas = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ map: brilho, color: "#fbbf24", size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    carro.add(faiscas);
    anim.push((t) => {
      for (const c of chamas) {
        const k = 0.6 + Math.random() * 0.7;
        c.scale.set(1, k, 1);
        c.position.x = c.userData.base + (c.userData.comp * (1 - k)) / 2;
      }
      for (let i = 0; i < qtd; i++) {
        const f = (t * 1.6 + vel[i]) % 1;
        pos[i * 3] = X(18) - 0.4 - f * 1.6;
        pos[i * 3 + 1] = 0.62 + Math.sin(i * 12.9 + f * 6) * 0.15 * f + f * 0.2;
        pos[i * 3 + 2] = (i % 2 ? 0.16 : -0.16) + Math.cos(i * 7.3) * 0.25 * f;
      }
      faiscas.geometry.attributes.position.needsUpdate = true;
    });
  }

  // Kit ouro: brilhos girando em volta do carro
  if (ouro) {
    const qtd = 40;
    const pos = new Float32Array(qtd * 3);
    const brilhos = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ map: brilho, color: "#fde68a", size: 0.18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    carro.add(brilhos);
    anim.push((t) => {
      for (let i = 0; i < qtd; i++) {
        const a = (i / qtd) * Math.PI * 2 + t * 0.8;
        const r = 2.6 + Math.sin(t * 2 + i) * 0.2;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = 0.3 + ((i * 0.37 + t * 0.5) % 1.6);
        pos[i * 3 + 2] = Math.sin(a) * r * 0.55;
      }
      brilhos.geometry.attributes.position.needsUpdate = true;
      (brilhos.material as THREE.PointsMaterial).size = 0.14 + Math.sin(t * 8) * 0.05;
    });
  }

  return { carro, anim };
}

export function F1em3D({ visual }: { visual: Visual }) {
  const ref = useRef<HTMLDivElement>(null);
  // String estável: a cena só remonta quando muda peça, cor ou número.
  const chave = [visual.cor, visual.escura, visual.numero, visual.avatar, visual.iniciais, [...visual.pecas].sort().join()].join("|");
  const visualRef = useRef(visual);
  useEffect(() => {
    visualRef.current = visual;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // 1,5x: em tela 2x/4K renderizar em resolução cheia é o que mais pesa.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(5.5, 3.4, 5.5);
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
      new THREE.CylinderGeometry(2.95, 3.1, 0.28, 96),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 }),
    );
    base.position.y = -0.14;
    plataforma.add(base);
    const tampo = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 96),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.45 }),
    );
    tampo.rotation.x = -Math.PI / 2;
    tampo.position.y = 0.002;
    plataforma.add(tampo);
    for (const r of [1.2, 2.1]) {
      const anel = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 96), new THREE.MeshBasicMaterial({ color: 0x334155 }));
      anel.rotation.x = -Math.PI / 2;
      anel.position.y = 0.004;
      plataforma.add(anel);
    }
    const bordaLuz = new THREE.Mesh(new THREE.TorusGeometry(2.93, 0.035, 12, 128), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
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

    const { carro, anim } = montarF1(visualRef.current);
    cena.add(carro);

    let frame = 0;
    const relogio = new THREE.Clock();
    const animar = () => {
      const t = relogio.getElapsedTime();
      carro.rotation.y = t * 0.6;
      anim.forEach((f) => f(t));
      renderer.render(cena, camera);
      frame = requestAnimationFrame(animar);
    };
    animar();

    const aoRedimensionar = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", aoRedimensionar);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", aoRedimensionar);
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [chave]);

  return <div ref={ref} className="h-full w-full" />;
}

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RODAS, CARROCERIAS, AEROFOLIOS, PECAS, efeitoDaPeca, NEONS, PILOTOS, DESENHOS, TURBOS, pecasDoCarro, type PecaId } from "./garagem";

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
export function texturaBrilho() {
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

export function montarF1(v: Visual, _texturaCarregada?: () => void, modo: "garagem" | "pista" = "garagem") {
  const ativas = pecasDoCarro({ pecas: v.pecas });
  const carro = new THREE.Group();
  const anim: Animacao[] = [];
  const tem = (p: PecaId) => ativas.has(p);
  const ouro = tem("ouro");
  const perfilRoda = RODAS.find((p) => tem(p.id));
  const perfilCorpo = CARROCERIAS.find((p) => tem(p.id));
  const perfilNeon = NEONS.find((p) => tem(p.id));
  const perfilPiloto = PILOTOS.find((p) => tem(p.id));
  const perfilDesenho = DESENHOS.find((p) => tem(p.id));
  const perfilTurbo = TURBOS.find((p) => tem(p.id));
  const perfilAsa = AEROFOLIOS.find((p) => tem(p.id));

  // Acabamento cromado usa prata; os demais preservam a pintura escolhida.
  const lataria = new THREE.MeshStandardMaterial({
    color: tem("cromo") && !ouro ? "#e2e8f0" : v.cor,
    metalness: ouro || tem("cromo") ? 1 : perfilCorpo?.metal ?? 0.5,
    roughness: tem("cromo") ? 0.05 : ouro ? 0.15 : 0.3,
    emissive: ouro ? "#5c3d00" : "#000000",
  });
  const escura = new THREE.MeshStandardMaterial({ color: perfilCorpo?.id === "corpo-stealth" ? "#111827" : v.escura, roughness: 0.4, metalness: 0.3 });
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
  pts.forEach(([x, y], i) => (i ? forma.lineTo(X(x), Z(y) * (perfilCorpo?.largura ?? 1) * (x > 150 ? perfilCorpo?.bico ?? 1 : 1)) : forma.moveTo(X(x), Z(y) * (perfilCorpo?.largura ?? 1))));
  const corpo = sombra(new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: modo === "pista" ? 0.2 : 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 2, steps: 1 }),
    lataria,
  ));
  corpo.rotation.x = Math.PI / 2;
  corpo.position.y = 0.62;
  carro.add(corpo);

  for (const s of [-1, 1]) {
    const pod = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, perfilCorpo ? 1 : 0.8, 6, 20), escura));
    pod.rotation.z = Math.PI / 2;
    pod.scale.z = perfilCorpo?.largura ?? 1;
    pod.position.set(X(84), 0.45, s * 0.5 * (perfilCorpo?.largura ?? 1));
    carro.add(pod);
  }
  const cobertura = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), lataria));
  cobertura.scale.set(1.4, 0.35, 0.55 * (perfilCorpo?.largura ?? 1));
  cobertura.position.set(-0.95, 0.63, 0);
  carro.add(cobertura);
  // Faixa branca do bico
  const faixa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: "#ffffff" }));
  faixa.position.set(X(178), 0.69, 0);
  carro.add(faixa);

  // Rodas
  const douradas = tem("rodas");
  const aroMat = new THREE.MeshStandardMaterial({ color: perfilRoda?.cor ?? (douradas ? "#fcd34d" : "#94a3b8"), metalness: 0.85, roughness: 0.24 });
  const freioMat = new THREE.MeshStandardMaterial({ color: "#475569", side: THREE.DoubleSide });
  const pincaMat = new THREE.MeshStandardMaterial({ color: "#ef4444" });
  const faixaMat = new THREE.MeshBasicMaterial({ color: tem("slick") ? "#ef4444" : perfilRoda?.aro ?? "#facc15" });
  // Na pista o carro é visto de lado e pequeno: dianteira quase do tamanho da
  // traseira, senão o pneu da frente some e o carro parece "empinado".
  const rFrente = modo === "pista" ? 0.345 : 0.3;
  for (const [x, y, r, w] of [[43, 11, 0.36, 0.45], [43, 69, 0.36, 0.45], [165, 12, rFrente, 0.4], [165, 68, rFrente, 0.4]]) {
    const roda = new THREE.Group();
    const pneu = sombra(new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 24), borracha));
    pneu.rotation.x = Math.PI / 2;
    roda.add(pneu);
    const lado = y < 40 ? -1 : 1;
    const faceZ = lado * (w / 2 + 0.012);
    const aroGiratorio = new THREE.Group();
    aroGiratorio.userData.aroGiratorio = true;
    roda.add(aroGiratorio);
    // Raios abertos: o freio aparece atrás, em vez de um disco sólido.
    const freio = new THREE.Mesh(new THREE.CircleGeometry(r * 0.62, 24), freioMat);
    freio.position.z = faceZ;
    roda.add(freio);
    const borda = new THREE.Mesh(new THREE.TorusGeometry(r * 0.74, 0.025, 6, 24), aroMat);
    borda.position.z = faceZ + lado * 0.015;
    aroGiratorio.add(borda);
    const pinça = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, r * 0.55, 0.025), pincaMat);
    pinça.position.set(r * 0.45, 0, faceZ + lado * 0.018);
    if (perfilRoda?.raios !== 0) roda.add(pinça);
    const raios = perfilRoda?.raios ?? 5;
    if (raios === 0) {
      const disco = new THREE.Mesh(new THREE.CircleGeometry(r * 0.7, 48), aroMat);
      disco.material.side = THREE.DoubleSide;
      disco.position.z = faceZ + lado * 0.03;
      aroGiratorio.add(disco);
    }
    for (let k = 0; k < raios; k++) {
      const angulo = k / raios * Math.PI * 2;
      const raio = new THREE.Mesh(new THREE.BoxGeometry(r * 0.1, r * 0.62, 0.035), aroMat);
      raio.position.set(-Math.sin(angulo) * r * 0.36, Math.cos(angulo) * r * 0.36, faceZ + lado * 0.035);
      raio.rotation.z = angulo + (perfilRoda?.id === "roda-turbina" ? 0.3 : 0);
      aroGiratorio.add(raio);
    }
    const cubo = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 16, 8), cromo);
    cubo.scale.z = 0.3;
    cubo.position.z = faceZ + lado * 0.055;
    aroGiratorio.add(cubo);
    if (perfilRoda || douradas || tem("slick")) {
      const faixaPneu = new THREE.Mesh(new THREE.TorusGeometry(r * 0.88, 0.012, 6, 24), faixaMat);
      faixaPneu.position.z = faceZ;
      roda.add(faixaPneu);
    }
    const efeitoRoda = perfilRoda || douradas || tem("slick") ? efeitoDaPeca(perfilRoda?.id ?? (douradas ? "rodas" : "slick")) : null;
    if (efeitoRoda) {
      for (let i = 0; i < efeitoRoda.detalhes; i++) {
        const anel = new THREE.Mesh(new THREE.TorusGeometry(r * (0.72 + i * 0.033), 0.006 + efeitoRoda.intensidade * 0.004, 6, 32), faixaMat);
        anel.position.z = faceZ + lado * 0.02; aroGiratorio.add(anel);
      }
      for (let i = 0; i < efeitoRoda.detalhes * 4; i++) {
        const a = i * Math.PI * 2 / (efeitoRoda.detalhes * 4);
        const parafuso = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), cromo);
        parafuso.position.set(Math.cos(a)*r*.64,Math.sin(a)*r*.64,faceZ+lado*.04);aroGiratorio.add(parafuso);
      }
    }
    if (efeitoRoda && efeitoRoda.intensidade >= .65) {
      aroGiratorio.userData.velocidadeGiro = (1.5 + efeitoRoda.intensidade * 2) * lado;
      anim.push(t => { aroGiratorio.rotation.z = t * aroGiratorio.userData.velocidadeGiro; });
    }
    const escalaRoda = (modo === "pista" ? 1.2 : 1) * (1 + (efeitoRoda?.intensidade ?? 0) * 0.12);
    roda.scale.setScalar(escalaRoda);
    // A pista gira as rodas conforme a velocidade do piloto (RankingCena3D).
    roda.userData.roda = Boolean(efeitoRoda && efeitoRoda.intensidade >= .65);
    roda.position.set(X(x), r * escalaRoda, Z(y) * (modo === "pista" ? 1.22 : 1));
    // Manter a geometria dentro da roda: o lote estático impedia o giro dos raios.
    roda.traverse(obj => { if (obj instanceof THREE.Mesh) obj.userData.animado = true; });
    carro.add(roda);
    // Braços da suspensão
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, Math.abs(Z(y)) - 0.3), carbono);
    braco.position.set(X(x), 0.4, Z(y) / 2 + (y < 40 ? 0.15 : -0.15));
    carro.add(braco);
  }

  // Aerofólio traseiro
  if (perfilAsa) {
    const efeito = efeitoDaPeca(perfilAsa.id);
    const largura = 1.8 + efeito.intensidade * 0.7;
    const altura = 1 + efeito.intensidade * 0.45;
    const planos = 1 + Math.floor(efeito.intensidade * 2);
    const cor = perfilAsa.cor;
    const detalhe = new THREE.MeshStandardMaterial({ color: cor, metalness: 0.7, roughness: 0.25 });
    for (let i = 0; i < planos; i++) {
      const asa = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.42 - i * 0.06, 0.045, largura - i * 0.08), i === 0 ? lataria : carbono));
      asa.position.set(X(12) - i * 0.05, altura + i * 0.14, 0);
      asa.rotation.z = perfilAsa.id === "asa-delta" ? -0.3 : -0.1;
      carro.add(asa);
      if (perfilAsa.id === "asa-drs" && i === 1) { asa.userData.animado = true; }
      if (perfilAsa.id === "asa-drs" && i === 1) anim.push((t) => { asa.rotation.z = -0.1 - Math.max(0, Math.sin(t * 1.5)) * 0.45; });
    }
    for (const lado of [-1, 1]) {
      const placa = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22 + planos * 0.12, 0.035), detalhe));
      placa.position.set(X(12), altura + (planos - 1) * 0.05, lado * largura / 2);
      carro.add(placa);
      const haste = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.06, altura - 0.55, 0.05), carbono));
      haste.position.set(X(perfilAsa.id === "asa-swan" ? 8 : 18), (altura + 0.55) / 2, lado * 0.38);
      haste.rotation.z = perfilAsa.id === "asa-swan" ? -0.25 : 0;
      carro.add(haste);
    }
    if (perfilAsa.id === "asa-neon") {
      const luz = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, largura), new THREE.MeshBasicMaterial({ color: cor }));
      luz.position.set(X(12) - 0.22, altura, 0);
      carro.add(luz);
    }
  } else if (tem("aerofolio")) {
    const larg = 2.1;
    const alt = 1.25;
    const asa1 = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, larg), lataria));
    asa1.position.set(X(12), alt, 0);
    asa1.rotation.z = -0.12;
    carro.add(asa1);
    // flap do DRS abrindo e fechando
    const flap = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, larg), carbono));
    flap.position.set(X(12) - 0.1, alt + 0.14, 0);
    flap.userData.animado = true;
    carro.add(flap);
    anim.push((t) => (flap.rotation.z = -0.15 - Math.max(0, Math.sin(t * 1.5)) * 0.5));
    // ponteiras douradas
    for (const s of [-1, 1]) {
      const placa = sombra(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.035), douradoMat));
      placa.position.set(X(12), alt - 0.1, s * (larg / 2));
      carro.add(placa);
    }
    // faixa de LED vermelha
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.04, larg - 0.1),
      new THREE.MeshBasicMaterial({ color: "#ff1744" }),
    );
    led.position.set(X(12) - 0.27, alt - 0.02, 0);
    led.userData.animado = true;
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

  // Cockpit, halo e capacete
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.2 }));
  cockpit.scale.set(1, 0.25, 0.8);
  cockpit.position.set(X(112), 0.68, 0);
  carro.add(cockpit);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32, Math.PI), ouro || tem("halo") ? douradoMat : new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.9 }));
  halo.rotation.y = Math.PI / 2;
  halo.position.set(X(112), 0.7, 0);
  carro.add(halo);
  // Piloto: macacão, braços no volante e capacete com viseira.
  const piloto = new THREE.Group();
  piloto.position.set(X(112), 0, 0);
  const macacao = new THREE.MeshStandardMaterial({ color: perfilPiloto?.cor ?? v.escura, roughness: 0.6 });
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
  const capaceteMat = new THREE.MeshStandardMaterial({ color: perfilPiloto?.cor ?? v.cor, metalness: 0.3, roughness: 0.25 });
  const capacete = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 12), capaceteMat));
  capacete.scale.set(1.12, 1, 0.95);
  capacete.position.set(-0.02, 0.98, 0);
  if (perfilPiloto) capacete.scale.multiplyScalar(1 + efeitoDaPeca(perfilPiloto.id).intensidade * .12);
  piloto.add(capacete);
  // faixa branca de frente a trás
  const faixaCap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: "#ffffff" }));
  faixaCap.scale.set(1.12, 1, 1);
  faixaCap.position.copy(capacete.position);
  piloto.add(faixaCap);
  // viseira escura espelhada voltada para a frente (+X)
  const viseira = new THREE.Mesh(
    new THREE.SphereGeometry(0.195, 32, 12, Math.PI - 0.95, 1.9, 1.15, 0.55),
    new THREE.MeshStandardMaterial({ color: perfilPiloto?.viseira ?? "#0b1020", metalness: 0.8, roughness: 0.12, emissive: perfilPiloto?.viseira ?? "#1e3a8a", emissiveIntensity: 0.18, side: THREE.DoubleSide }),
  );
  viseira.scale.copy(capacete.scale);
  viseira.position.copy(capacete.position);
  piloto.add(viseira);
  if (perfilPiloto) {
    const detalhe = new THREE.MeshBasicMaterial({ color: perfilPiloto.viseira });
    for (let i = 0; i < efeitoDaPeca(perfilPiloto.id).detalhes; i++) {
      const faixa = new THREE.Mesh(new THREE.TorusGeometry(0.193, 0.008, 6, 32, Math.PI), detalhe);
      faixa.position.copy(capacete.position); faixa.position.z += (i - (efeitoDaPeca(perfilPiloto.id).detalhes-1)/2) * 0.027;
      piloto.add(faixa);
    }
    anim.push((t) => { (viseira.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.14 + (Math.sin(t * (1.5 + perfilPiloto.padrao * 0.15)) + 1) * 0.08; });
  }
  carro.add(piloto);

  const brilho = texturaBrilho();

  // Neon: luz por baixo trocando de cor e pintando o chão
  if (perfilNeon) {
    const efeito = efeitoDaPeca(perfilNeon.id);
    for (let i = 0; i < efeito.detalhes; i++) {
      const halo = new THREE.Mesh(new THREE.RingGeometry(1.2 + i * 0.13, 1.23 + i * 0.13, 48), new THREE.MeshBasicMaterial({color:perfilNeon.cor,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false}));
      halo.rotation.x=-Math.PI/2;halo.scale.y=.5;halo.position.y=.025+i*.001;carro.add(halo);
      anim.push(t=>{(halo.material as THREE.MeshBasicMaterial).opacity=(.12+efeito.intensidade*.2)*(1+Math.sin(t*perfilNeon.ritmo*3-i)*.4);});
    }
    const neonMat = new THREE.MeshBasicMaterial({ map: brilho, color: perfilNeon.cor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const mancha = new THREE.Mesh(new THREE.PlaneGeometry(5 * efeitoDaPeca(perfilNeon.id).escala, 2.2 * efeitoDaPeca(perfilNeon.id).escala), neonMat);
    mancha.rotation.x = -Math.PI / 2;
    mancha.position.y = 0.02;
    carro.add(mancha);
    const tubos: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      const tubo = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 3.6, 4, 8), new THREE.MeshBasicMaterial({ color: perfilNeon.cor }));
      tubo.rotation.z = Math.PI / 2;
      tubo.position.set(0.1, 0.2, s * 0.45);
      carro.add(tubo);
      tubos.push(tubo);
    }
    // Sem PointLight: luz dinâmica pesa em todo material da cena. A mancha
    // aditiva no chão já dá o efeito de luz.
    const cor = new THREE.Color();
    anim.push((t) => {
      if (perfilNeon.arcoiris) cor.setHSL((t * 0.08) % 1, 1, 0.55);
      else cor.set(perfilNeon.cor);
      neonMat.color.copy(cor);
      neonMat.opacity = 0.7 + Math.sin(t * 5 * perfilNeon.ritmo) * 0.2;
      tubos.forEach((m) => (m.material as THREE.MeshBasicMaterial).color.copy(cor));
    });
  }

  // Escapamento aceso de série na pista (como no ranking 2D antigo): uma chama
  // curta tremulando. O Turbo comprado troca por chamas maiores e faíscas.
  if (modo === "pista" && !perfilTurbo) {
    const chamas: THREE.Mesh[] = [];
    for (const [cor, raio, comp] of [["#f97316", 0.09, 0.6], ["#fde047", 0.05, 0.38]] as const) {
      const c = new THREE.Mesh(
        new THREE.ConeGeometry(raio, comp, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      c.rotation.z = Math.PI / 2;
      c.position.set(X(18) - 0.2 - comp / 2, 0.55, 0);
      c.userData.base = c.position.x;
      c.userData.comp = comp;
      carro.add(c);
      chamas.push(c);
    }
    anim.push(() => {
      for (const c of chamas) {
        const k = 0.5 + Math.random() * 0.6;
        c.scale.set(1, k, 1);
        c.position.x = c.userData.base + (c.userData.comp * (1 - k)) / 2;
      }
    });
  }

  // Turbo: escapamentos cromados, chamas em camadas e faíscas
  if (perfilTurbo) {
    const chamas: THREE.Mesh[] = [];
    for (const s of [-0.16, 0.16]) {
      const cano = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 16, 1, true), cromo));
      cano.rotation.z = Math.PI / 2;
      cano.position.set(X(18) - 0.1, 0.62, s);
      carro.add(cano);
      for (const [cor, raio, comp] of [[perfilTurbo.cor, 0.07, 0.5 * perfilTurbo.potencia], [perfilTurbo.cor, 0.11, 0.9 * efeitoDaPeca(perfilTurbo.id).escala * perfilTurbo.potencia], ["#f8fafc", 0.06, 0.55 * perfilTurbo.potencia]] as const) {
        const c = new THREE.Mesh(
          new THREE.ConeGeometry(raio, comp, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        c.rotation.z = Math.PI / 2;
        c.position.set(X(18) - 0.3 - comp / 2, 0.62, s);
        c.userData.base = c.position.x;
        c.userData.comp = comp;
        c.userData.animado = true;
        carro.add(c);
        chamas.push(c);
      }
    }
    const qtd = efeitoDaPeca(perfilTurbo.id).particulas;
    const pos = new Float32Array(qtd * 3);
    const vel = Array.from({ length: qtd }, () => Math.random());
    const faiscas = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ map: brilho, color: perfilTurbo.cor, size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    carro.add(faiscas);
    anim.push((t) => {
      for (const c of chamas) {
        const k = 0.85 + Math.sin(t * 16 * perfilTurbo.ritmo + c.position.z * 8) * 0.35;
        c.scale.set(1, k, 1);
        c.position.x = c.userData.base + (c.userData.comp * (1 - k)) / 2;
      }
      for (let i = 0; i < qtd; i++) {
        const f = (t * 1.6 * perfilTurbo.ritmo + vel[i]) % 1;
        pos[i * 3] = X(18) - 0.4 - f * 1.6;
        pos[i * 3 + 1] = 0.62 + Math.sin(i * 12.9 + f * 6) * 0.15 * f + f * 0.2;
        pos[i * 3 + 2] = (i % 2 ? 0.16 : -0.16) + Math.cos(i * 7.3) * 0.25 * f;
      }
      faiscas.geometry.attributes.position.needsUpdate = true;
    });
  }

  // Kit ouro: brilhos girando em volta do carro
  if (ouro) {
    const qtd = 20;
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

  // Acessórios do catálogo: todos também têm representação na pista.
  const caixa = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material) => {
    const mesh = sombra(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
    mesh.position.set(x, y, z);
    carro.add(mesh);
  };
  if (perfilCorpo) {
    const detalhe = new THREE.MeshStandardMaterial({ color: perfilCorpo.cor, metalness: 0.7, roughness: 0.3 });
    for (const lado of [-1, 1]) {
      caixa(-0.5, 0.57, lado * 0.46 * perfilCorpo.largura, 1.6, 0.06, 0.1, detalhe);
      for (let i = 0; i < 3; i++) caixa(-0.7 + i * 0.15, 0.62, lado * 0.4 * perfilCorpo.largura, 0.05, 0.025, 0.17, carbono);
    }
    caixa(1.2, 0.7, 0, 1.1, 0.025, 0.13 * perfilCorpo.bico, detalhe);
    if (perfilCorpo.id === "corpo-wide" || perfilCorpo.id === "corpo-phantom") {
      for (const lado of [-1, 1]) caixa(-0.25, 0.3, lado * 0.7, 2, 0.08, 0.18, carbono);
    }
  }
  if (tem("farol-ice")) for (const z of [-0.5, -0.35, 0.35, 0.5]) caixa(2.3, 0.25, z, 0.06, 0.08, 0.09, new THREE.MeshBasicMaterial({ color: "#7dd3fc" }));
  if (tem("luz-freio")) {
    const mat = new THREE.MeshBasicMaterial({ color: "#ff1744" });
    caixa(-2.35, 0.5, 0, 0.05, 0.13, 0.18, mat);
    anim.push((t) => mat.color.setRGB(0.5 + Math.sin(t * 8) * 0.5, 0.02, 0.06));
  }
  if (tem("canards")) for (const lado of [-1, 1]) for (const x of [1.55, 1.8]) caixa(x, 0.48, lado * 0.3, 0.25, 0.04, 0.3, carbono);
  if (tem("entrada-ar")) {
    caixa(-0.55, 1, 0, 0.45, 0.45, 0.25, lataria);
    caixa(-0.31, 1.1, 0, 0.025, 0.18, 0.18, carbono);
  }
  if (tem("escape-titanio")) for (const z of [-0.24, 0.24]) {
    const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.4, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#818cf8", metalness: 1, roughness: 0.2, side: THREE.DoubleSide }));
    escape.rotation.z = Math.PI / 2;
    escape.position.set(-2.4, 0.55, z);
    carro.add(escape);
  }
  if (perfilDesenho) {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = perfilDesenho.cor; ctx.fillStyle = perfilDesenho.cor; ctx.lineWidth = 5;
    for (let i = 0; i < 8; i++) {
      const x = i * 32;
      ctx.beginPath();
      switch (perfilDesenho.padrao) {
        case 0: ctx.fillRect(0, 16, 256, 6); ctx.fillRect(0, 42, 256, 6); break;
        case 1: ctx.moveTo(x, 5); ctx.lineTo(x+22, 24); ctx.lineTo(x+10, 35); ctx.lineTo(x+30, 58); ctx.stroke(); break;
        case 2: ctx.moveTo(x, 60); ctx.quadraticCurveTo(x+30, 30, x+18, 4); ctx.quadraticCurveTo(x+52, 35, x+28, 60); ctx.fill(); break;
        case 3: for (let y=0;y<4;y++) if ((i+y)%2===0) ctx.fillRect(x,y*16,32,16); break;
        case 4: ctx.moveTo(x,5); ctx.lineTo(x+24,32); ctx.lineTo(x,59); ctx.stroke(); break;
        case 5: ctx.moveTo(x,48); ctx.lineTo(x+14,48); ctx.lineTo(x+14,16); ctx.lineTo(x+28,16); ctx.stroke(); break;
        case 6: ctx.moveTo(x,32); ctx.bezierCurveTo(x+8,0,x+24,64,x+32,32); ctx.stroke(); break;
        case 7: for(let j=0;j<10;j++){const a=j*Math.PI/5; const r=j%2?7:15; const px=x+16+Math.cos(a)*r;const py=32+Math.sin(a)*r;j?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath();ctx.fill();break;
        case 8: for(let j=0;j<6;j++){const a=j*Math.PI/3;const px=x+16+Math.cos(a)*14;const py=32+Math.sin(a)*14;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();break;
        default: ctx.fillRect(x,12+i%3*14,24,5);
      }
    }
    const mapa = new THREE.CanvasTexture(canvas); mapa.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: mapa, transparent: true, depthWrite: false, roughness: 0.4, emissive: perfilDesenho.cor, emissiveMap: mapa, emissiveIntensity: 0.12, side: THREE.DoubleSide });
    for (const lado of [-1,1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.5,0.3),mat);
      decal.position.set(-0.2,0.56,lado*0.61*(perfilCorpo?.largura ?? 1));
      if(lado<0) decal.rotation.y=Math.PI; carro.add(decal);
    }
    const bico = new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.22),mat); bico.rotation.x=-Math.PI/2;bico.position.set(1.3,0.73,0);carro.add(bico);
    anim.push((t)=>{mat.emissiveIntensity=0.1+(Math.sin(t*2)+1)*0.06;});
  }
  if (tem("splitter")) caixa(X(202), 0.18, 0, 0.5, 0.07, 1.9, carbono);
  if (tem("difusor")) for (const z of [-0.4, -0.2, 0, 0.2, 0.4]) caixa(X(22), 0.23, z, 0.7, 0.22, 0.04, carbono);
  if (tem("led")) for (const z of [-0.57, 0.57]) caixa(-0.3, 0.5, z, 2, 0.035, 0.035, new THREE.MeshBasicMaterial({ color: "#67e8f9" }));
  if (tem("antena")) {
    caixa(-1.8, 1.1, 0.3, 0.025, 1.3, 0.025, cromo);
    caixa(-1.55, 1.65, 0.3, 0.5, 0.3, 0.025, douradoMat);
  }
  if (tem("coroa")) {
    caixa(-0.02, 1.25, 0, 0.4, 0.07, 0.35, douradoMat);
    for (const x of [-0.18, 0, 0.18]) {
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.2, 4), douradoMat);
      ponta.position.set(x, 1.37, 0);
      carro.add(ponta);
    }
  }

  if (modo === "pista") {
    // Cobertura esculpida e tomada de ar dão a silhueta de um monoposto.
    const coberturaForma = new THREE.Shape();
    coberturaForma.moveTo(-1.75, 0.62); coberturaForma.quadraticCurveTo(-1.05, 0.85, -0.4, 1.22);
    coberturaForma.lineTo(-0.26, 1.22); coberturaForma.lineTo(-0.08, 0.66); coberturaForma.closePath();
    const coberturaPista = new THREE.Mesh(new THREE.ExtrudeGeometry(coberturaForma, { depth: 0.28, steps: 1, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.03, bevelSegments: 2, curveSegments: 8 }), lataria);
    coberturaPista.position.z = -0.14;
    carro.add(coberturaPista);
    caixa(-0.25, 1.13, 0, 0.09, 0.13, 0.18, carbono);
    for (const lado of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10), lataria);
      pod.scale.set(1.25, 0.26, 0.4 * (perfilCorpo?.largura ?? 1));
      pod.position.set(-0.56, 0.52, lado * 0.39 * (perfilCorpo?.largura ?? 1));
      carro.add(pod);
    }
    const texto = document.createElement("canvas"); texto.width = 256; texto.height = 96;
    const ctx = texto.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.font = "italic 900 64px Arial"; ctx.fillText(String(v.numero).padStart(2, "0"), 8, 70);
    ctx.font = "900 19px Arial"; ctx.fillText("CARFLAX", 116, 42);
    ctx.font = "12px Arial"; ctx.fillText("RACING", 117, 62);
    const mapa = new THREE.CanvasTexture(texto); mapa.colorSpace = THREE.SRGBColorSpace;
    const adesivo = new THREE.MeshBasicMaterial({ map: mapa, transparent: true, depthWrite: false });
    for (const lado of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.35), adesivo);
      decal.position.set(-0.55, 0.55, lado * 0.59 * (perfilCorpo?.largura ?? 1));
      if (lado < 0) decal.rotation.y = Math.PI;
      carro.add(decal);
    }
    // Lâminas da asa dianteira sem novos efeitos ou luzes dinâmicas.
    for (const x of [2.28, 2.38, 2.48]) caixa(x, 0.15, 0, 0.035, 0.025, 1.35, carbono);
  }

  // Detalhes adicionais de cada peça crescem com seu preço na categoria.
  for (const id of ativas) {
    const efeito = efeitoDaPeca(id);
    if (!efeito || efeito.intensidade < .2) continue;
    const categoria = PECAS.find(p=>p.id===id)?.categoria;
    if (categoria === "Rodas" || categoria === "Neons" || categoria === "Turbos") continue;
    const corDetalhe = categoria === "Piloto" ? perfilPiloto?.viseira ?? "#fcd34d" : categoria === "Desenhos" ? perfilDesenho?.cor ?? "#fff" : "#e2e8f0";
    const mat = new THREE.MeshStandardMaterial({color:corDetalhe,metalness:.65,roughness:.2,emissive:corDetalhe,emissiveIntensity:.08});
    for(let i=0;i<efeito.detalhes;i++) for(const lado of [-1,1]) {
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.07,.025,.14+efeito.intensidade*.06),mat);
      const x=categoria==="Aerodinâmica"?-2+i*.1:categoria==="Piloto"?-.13+i*.05:-.8+i*.18;
      mesh.position.set(x,categoria==="Piloto"?1.06:categoria==="Aerodinâmica"?1.02+efeito.intensidade*.45:.65,lado*(categoria==="Piloto"?.15:.42));carro.add(mesh);
    }
    anim.push(t=>{mat.emissiveIntensity=.08+efeito.intensidade*.18*(.5+.5*Math.sin(t*2));});
  }

  // Emissores presos à peça: rastros e faíscas se movem para trás do carro.
  for (const id of ativas) {
    const efeito = efeitoDaPeca(id);
    if (efeito.intensidade < .65) continue;
    const peca = PECAS.find(p => p.id === id);
    if (!peca) continue;
    const categoria = peca.categoria;
    const origem = categoria === "Rodas" ? [X(43), .35, .85] : categoria === "Aerodinâmica" ? [-2.1, 1 + efeito.intensidade * .45, .8] : categoria === "Turbos" ? [-2.55, .62, .16] : categoria === "Piloto" ? [-.04, 1.17, .1] : categoria === "Neons" ? [-.3, .06, .65] : [-.7, .65, .5];
    const cor = categoria === "Rodas" ? perfilRoda?.aro ?? "#fcd34d" : categoria === "Aerodinâmica" ? perfilAsa?.cor ?? "#fcd34d" : categoria === "Turbos" ? perfilTurbo?.cor ?? "#fff" : categoria === "Neons" ? perfilNeon?.cor ?? "#22d3ee" : categoria === "Piloto" ? perfilPiloto?.viseira ?? "#fff" : perfilDesenho?.cor ?? "#fcd34d";
    const quantidade = 8 + Math.floor(efeito.intensidade * 16);
    const pos = new Float32Array(quantidade * 3);
    const segmentos = new Float32Array(quantidade * 6);
    const pontos = new THREE.Points(new THREE.BufferGeometry().setAttribute("position",new THREE.BufferAttribute(pos,3)), new THREE.PointsMaterial({map:brilho,color:cor,size:.07+efeito.intensidade*.07,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
    const rastros = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.BufferAttribute(segmentos,3)),new THREE.LineBasicMaterial({color:cor,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
    pontos.userData.emissor = id; rastros.userData.emissor = id;
    pontos.frustumCulled = false; rastros.frustumCulled = false;
    carro.add(pontos,rastros);
    anim.push(t => {
      for(let i=0;i<quantidade;i++) {
        const vida=(t*(categoria==="Turbos"?2:1.1)+i/quantidade)%1;
        const lado=i%2?1:-1;
        const distancia=vida*(categoria==="Turbos"?2.7:1.3)*efeito.escala;
        const x=origem[0]-distancia;
        const y=Math.max(.025,origem[1]+Math.sin(i*2.4)*vida*.35+(categoria==="Neons"?.03:vida*.2));
        const z=lado*origem[2]+Math.cos(i*3.7)*vida*.25;
        pos.set([x,y,z],i*3);
        segmentos.set([x,y,z,x+.07+vida*.12,y-.02,z],i*6);
      }
      pontos.geometry.attributes.position.needsUpdate=true;
      rastros.geometry.attributes.position.needsUpdate=true;
    });
  }

  // Une as peças estáticas por material: menos chamadas de desenho à GPU.
  carro.updateMatrixWorld(true);
  const lotes = new Map<THREE.Material, THREE.Mesh[]>();
  carro.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || obj.userData.animado || Array.isArray(obj.material) || obj.material instanceof THREE.MeshBasicMaterial) return;
    const lote = lotes.get(obj.material) ?? [];
    lote.push(obj);
    lotes.set(obj.material, lote);
  });
  for (const [material, meshes] of lotes) {
    if (meshes.length < 2) continue;
    const geometrias = meshes.map((mesh) => {
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geo.clearGroups();
      if (!geo.index) return geo;
      const semIndices = geo.toNonIndexed();
      geo.dispose();
      return semIndices;
    });
    const unida = mergeGeometries(geometrias);
    geometrias.forEach((geo) => geo.dispose());
    if (!unida) continue;
    meshes.forEach((mesh) => { mesh.removeFromParent(); mesh.geometry.dispose(); });
    carro.add(new THREE.Mesh(unida, material));
  }
  return { carro, anim };

}

export function liberarObjeto(objeto: THREE.Object3D) {
  const geometrias = new Set<THREE.BufferGeometry>();
  const materiais = new Set<THREE.Material>();
  const texturas = new Set<THREE.Texture>();
  objeto.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments)) return;
    geometrias.add(obj.geometry);
    for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      materiais.add(mat);
      const mapa = (mat as THREE.MeshStandardMaterial).map;
      if (mapa) texturas.add(mapa);
      mat.userData.descartado = true;
    }
  });
  geometrias.forEach((g) => g.dispose());
  texturas.forEach((t) => t.dispose());
  materiais.forEach((m) => m.dispose());
}


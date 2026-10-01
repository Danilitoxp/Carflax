// Ronco de motor acelerando, gerado no navegador (Web Audio) — sem arquivo de
// áudio nem direito autoral. Usado no modo corrida quando um carro avança.
//
// Receita: três osciladores "dente de serra" (o ronco grave e os harmônicos)
// passando por um filtro passa-baixa. A frequência sobe rápido (a rotação
// subindo), cai um pouco (troca de marcha) e sobe de novo, e o volume some no
// fim. Um pouco de distorção dá o "rasgado" de motor esportivo.

let contexto: AudioContext | null = null;
let ultimoToque = 0;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!contexto) contexto = new Ctx();
  // Navegador só libera áudio depois de um clique na página: tenta retomar.
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
}

/** Libera o áudio no primeiro clique/toque (regra de autoplay dos navegadores). */
export function liberarAudioMotor() {
  const liberar = () => {
    obterContexto();
    window.removeEventListener("pointerdown", liberar);
    window.removeEventListener("keydown", liberar);
  };
  window.addEventListener("pointerdown", liberar);
  window.addEventListener("keydown", liberar);
  return () => {
    window.removeEventListener("pointerdown", liberar);
    window.removeEventListener("keydown", liberar);
  };
}

function curvaDistorcao(qtd: number) {
  const n = 1024;
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curva[i] = ((3 + qtd) * x * 20 * (Math.PI / 180)) / (Math.PI + qtd * Math.abs(x));
  }
  return curva;
}

/**
 * Toca uma acelerada (~2,2 s). `intensidade` 0–1 deixa mais longa/aguda
 * quando o avanço foi grande. Ignora chamadas a menos de 4 s da anterior,
 * para várias vendas na mesma atualização não virarem barulho.
 */
export function tocarAceleracao(intensidade = 0.6, volume = 0.35) {
  const agora = Date.now();
  if (agora - ultimoToque < 4000) return;
  ultimoToque = agora;

  const ctx = obterContexto();
  if (!ctx || ctx.state !== "running") return;

  const t0 = ctx.currentTime;
  const dur = 1.6 + intensidade * 0.8;
  const base = 45; // marcha lenta (Hz)
  const pico = 150 + intensidade * 90;

  const saida = ctx.createGain();
  saida.gain.setValueAtTime(0.0001, t0);
  saida.gain.exponentialRampToValueAtTime(volume, t0 + 0.08);
  saida.gain.setValueAtTime(volume, t0 + dur * 0.75);
  saida.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  const filtro = ctx.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.Q.value = 6;
  filtro.frequency.setValueAtTime(500, t0);
  filtro.frequency.exponentialRampToValueAtTime(2400, t0 + dur * 0.45);
  filtro.frequency.exponentialRampToValueAtTime(1600, t0 + dur);

  const distorcao = ctx.createWaveShaper();
  distorcao.curve = curvaDistorcao(40);
  distorcao.oversample = "4x";

  distorcao.connect(filtro);
  filtro.connect(saida);
  saida.connect(ctx.destination);

  // Rotação: sobe, troca de marcha (cai um pouco) e sobe de novo.
  const rotacao = (o: OscillatorNode, mult: number) => {
    const f = o.frequency;
    f.setValueAtTime(base * mult, t0);
    f.exponentialRampToValueAtTime(pico * 0.85 * mult, t0 + dur * 0.42);
    f.exponentialRampToValueAtTime(pico * 0.6 * mult, t0 + dur * 0.5);
    f.exponentialRampToValueAtTime(pico * mult, t0 + dur * 0.9);
  };

  [
    { tipo: "sawtooth" as OscillatorType, mult: 1, ganho: 0.5 },
    { tipo: "sawtooth" as OscillatorType, mult: 2.01, ganho: 0.25 },
    { tipo: "square" as OscillatorType, mult: 0.5, ganho: 0.3 },
  ].forEach(({ tipo, mult, ganho }) => {
    const o = ctx.createOscillator();
    o.type = tipo;
    rotacao(o, mult);
    const g = ctx.createGain();
    g.gain.value = ganho;
    o.connect(g);
    g.connect(distorcao);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });

  // Vibração rápida do motor (os "pistões"): modula o volume.
  const lfo = ctx.createOscillator();
  const lfoGanho = ctx.createGain();
  lfo.frequency.setValueAtTime(18, t0);
  lfo.frequency.exponentialRampToValueAtTime(60, t0 + dur * 0.9);
  lfoGanho.gain.value = volume * 0.25;
  lfo.connect(lfoGanho);
  lfoGanho.connect(saida.gain);
  lfo.start(t0);
  lfo.stop(t0 + dur + 0.05);
}

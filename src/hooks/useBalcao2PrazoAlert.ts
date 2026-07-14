import { useEffect, useRef } from "react";
import { isBalcao2, parseOrderCreated, b2RemainingMs, B2_AVISO_MS } from "@/lib/balcao2-prazo";

/**
 * Alerta de prazo dos pedidos de BALCÃO 2: cada pedido B2 tem 72h para retirada.
 * Quando faltar 1 dia (24h) ou menos e o prazo ainda não estourou, notifica:
 *  - o VENDEDOR do pedido (quando é o usuário logado); e
 *  - quem tiver a notificação de "Retirada" (clienteRetira) habilitada.
 *
 * Gated pelo toggle "Prazo Balcão 2" (localStorage: carflax_notif_prefs → alertas.balcao2Prazo,
 * padrão: ligado). Dispara uma vez por pedido (dedup em localStorage).
 */

const API_SERVER = "https://marketing-banco-de-dados.velbav.easypanel.host";
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const INITIAL_DELAY_MS = 20 * 1000; // primeira checagem 20s após entrar
const AVISADOS_KEY = "carflax_b2_avisados";
const AVISADO_TTL_MS = 5 * 24 * 60 * 60 * 1000; // limpa avisos com mais de 5 dias

type ShowNotification = (
  type: "success" | "error" | "info",
  title: string,
  message: string,
  persistent?: boolean,
  tag?: string,
  duration?: number,
  avatarUrl?: string,
) => void;

interface UP {
  operator_code?: string;
  operatorCode?: string;
}

/** Master toggle do alerta de prazo B2 (padrão: ligado). */
function masterEnabled(): boolean {
  try {
    const raw = localStorage.getItem("carflax_notif_prefs");
    if (!raw) return true;
    const s = JSON.parse(raw);
    if (s?.alertas && s.alertas.balcao2Prazo !== undefined) return !!s.alertas.balcao2Prazo;
    return true;
  } catch {
    return true;
  }
}

/** Pref "Retirada" (mesma do useRetiradaAlert: clienteRetira, padrão ligado). */
function retiradaEnabled(): boolean {
  try {
    const raw = localStorage.getItem("carflax_notif_prefs");
    if (!raw) return true;
    const s = JSON.parse(raw);
    if (s?.alertas && s.alertas.clienteRetira !== undefined) return !!s.alertas.clienteRetira;
    return true;
  } catch {
    return true;
  }
}

function loadAvisados(): Record<string, number> {
  try {
    const raw = localStorage.getItem(AVISADOS_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const now = Date.now();
    // Limpa entradas antigas.
    let changed = false;
    for (const k of Object.keys(obj)) {
      if (now - obj[k] > AVISADO_TTL_MS) {
        delete obj[k];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(AVISADOS_KEY, JSON.stringify(obj));
    return obj;
  } catch {
    return {};
  }
}

function marcarAvisado(id: string) {
  try {
    const obj = loadAvisados();
    obj[id] = Date.now();
    localStorage.setItem(AVISADOS_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function requestBrowserPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Promise.resolve(Notification.requestPermission()).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export function useBalcao2PrazoAlert(showNotification: ShowNotification, userProfile?: UP | null) {
  const showRef = useRef(showNotification);
  showRef.current = showNotification;

  useEffect(() => {
    let cancelled = false;

    if (masterEnabled()) requestBrowserPermission();

    async function check() {
      if (cancelled || !masterEnabled()) return;
      try {
        const erpRes = await fetch(`${API_SERVER}/api/pedidos-separacao`).then((r) => r.json());
        if (cancelled || !erpRes?.success || !Array.isArray(erpRes.data)) return;

        const meuCodigo = String(userProfile?.operator_code || userProfile?.operatorCode || "").trim();
        const meuCodigoNorm = meuCodigo.replace(/^0+/, "") || meuCodigo;
        const podeRetirada = retiradaEnabled();

        const now = Date.now();
        const avisados = loadAvisados();

        for (const order of erpRes.data as Record<string, unknown>[]) {
          if (!isBalcao2(order.TIPO_MOVIMENTACAO as string, order.LOCAL_RETIRADA as string)) continue;

          const created = parseOrderCreated(order.FGO_DTAENT as string, order.FGO_HORENT as string);
          if (created == null) continue;

          const remaining = b2RemainingMs(created, now);
          // Só quando falta 1 dia ou menos e o prazo ainda não estourou.
          if (remaining > B2_AVISO_MS || remaining <= 0) continue;

          const numDoc = String(order.FGO_NUMDOC).trim();
          const normalizedId = numDoc.padStart(12, "0");
          if (avisados[normalizedId]) continue; // já avisado

          // Destinatários: o vendedor do pedido, ou quem tem a notificação de Retirada.
          const codVen = String(order.FGO_CODVEN || "").trim();
          const codVenNorm = codVen.replace(/^0+/, "") || codVen;
          const souVendedor = !!meuCodigoNorm && (codVenNorm === meuCodigoNorm || codVen === meuCodigo);
          if (!souVendedor && !podeRetirada) continue;

          const pedidoDisplay = String(Number(numDoc) || numDoc);
          const cliente = String(order.NOME_CLIENTE || "").trim();
          const horasRestantes = Math.max(1, Math.round(remaining / 3600000));
          const message = `Pedido #${pedidoDisplay} (Balcão 2)${cliente ? ` — ${cliente}` : ""} vence em ${horasRestantes}h. Falta menos de 1 dia para a retirada.`;
          const tag = `b2-prazo-${normalizedId}`;

          showRef.current("error", "⏰ PRAZO BALCÃO 2", message, true, tag);
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("⏰ Prazo Balcão 2", { body: message, tag });
            }
          } catch {
            /* ignore */
          }

          marcarAvisado(normalizedId);
        }
      } catch (err) {
        console.error("[Balcao2Prazo] erro ao verificar:", err);
      }
    }

    const timeout = setTimeout(check, INITIAL_DELAY_MS);
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [userProfile]);
}

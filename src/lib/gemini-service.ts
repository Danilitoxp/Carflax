import { type VendedorResumo, API_BASE } from "./api";

export async function getCoachIaMessage(
  metrics: VendedorResumo | null,
  userRole: string,
  userName: string
): Promise<string> {
  if (!metrics) return "Bora vender! 🚀";

  try {
    // Agora chamamos o nosso PRÓPRIO servidor (db/server.js)
    const response = await fetch(`${API_BASE}/api/coach-ia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metrics, userRole, userName }),
    });

    if (!response.ok) {
      throw new Error(`Erro no servidor: ${response.status}`);
    }

    const data = await response.json();
    return data.message || "Foco total no cliente! 🎯";
  } catch (error) {
    console.error("[CoachIA] Falha ao chamar o servidor:", error);
    return "A consistência é o caminho para o sucesso! 🚀";
  }
}

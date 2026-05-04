import { GoogleGenerativeAI } from "@google/generative-ai";
import { type VendedorResumo, API_BASE } from "./api";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_IA || "");

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

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType,
        },
      },
      { text: "Transcreva este áudio exatamente como falado. Se não houver fala, responda apenas '[Sem áudio detectado]'. Não adicione comentários." },
    ]);

    return result.response.text();
  } catch (error) {
    console.error("[Gemini] Erro na transcrição:", error);
    throw error;
  }
}

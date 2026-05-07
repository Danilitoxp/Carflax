import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_IA || "");

export async function classifyTemperature(
  messages: Array<{ sender: "me" | "contact"; text: string }>
): Promise<"Quente" | "Morno" | "Frio"> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const transcript = messages
    .filter(m => m.text && !m.text.startsWith("🎵") && !m.text.startsWith("📎"))
    .slice(-10)
    .map(m => `${m.sender === "me" ? "Vendedor" : "Cliente"}: ${m.text}`)
    .join("\n");

  const prompt = `Você é um analista de leads de vendas. Analise a conversa e classifique o interesse do cliente.

Responda APENAS com uma das três palavras exatas, sem explicações:
- Quente (cliente muito interessado, perguntou preço, prazo, disponibilidade ou demonstrou intenção clara de compra)
- Morno (cliente com algum interesse, fez perguntas, mas sem intenção clara de compra ainda)
- Frio (cliente sem interesse aparente, respostas curtas ou sem engajamento real)

Conversa:
${transcript}

Classificação:`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();

  if (response === "Quente" || response === "Morno" || response === "Frio") return response;
  if (response.includes("Quente")) return "Quente";
  if (response.includes("Morno")) return "Morno";
  return "Frio";
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

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

  const prompt = `Você é um analista de leads de vendas de autopeças. Analise a conversa e classifique o interesse do cliente.

Responda APENAS com uma das três palavras exatas, sem explicações:
- Quente: cliente pediu preço, confirmou que quer comprar, pediu para reservar, perguntou sobre forma de pagamento, prazo de entrega ou disponibilidade de peça específica com intenção clara.
- Morno: cliente fez perguntas sobre produtos, marcas ou compatibilidade mas ainda não demonstrou intenção de compra; ou iniciou conversa mas ainda está avaliando.
- Frio: cliente enviou apenas "oi", "olá", mensagem sem contexto, parou de responder, ou claramente não tem interesse em comprar.

Exemplos:
- "Tem filtro de óleo para Gol 1.0?" → Morno
- "Quanto custa o filtro e tem em estoque?" → Quente
- "Oi" → Frio
- "Preciso de um par de pastilhas, pode separar?" → Quente
- "Qual a diferença entre a original e a paralela?" → Morno

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

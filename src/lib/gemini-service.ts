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

/** Parte de entrada para geração de criativo: texto ou imagem (base64 puro, sem prefixo data:). */
export type CreativePart =
  | { text: string }
  | { image: { data: string; mimeType: string } };

/**
 * Gera imagem(ns) de criativo a partir de imagens de referência + instruções de texto,
 * usando o modelo de imagem do Gemini ("Nano Banana"). Retorna data URLs (data:image/...;base64,...).
 */
// Modelos de imagem candidatos, em ordem de preferência. O disponível varia conforme
// a chave/projeto Google AI, então tentamos um a um até algum funcionar.
const IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];

export async function generateCreativeImage(parts: CreativePart[]): Promise<string[]> {
  const contentParts = parts.map((p) =>
    "image" in p
      ? { inlineData: { data: p.image.data, mimeType: p.image.mimeType } }
      : { text: p.text }
  );

  let lastError: unknown = null;
  for (const modelName of IMAGE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        // O modelo de imagem só devolve imagem quando pedimos explicitamente as modalidades.
        generationConfig: { responseModalities: ["Text", "Image"] } as Record<string, unknown>,
      });

      const result = await model.generateContent(contentParts);

      const images: string[] = [];
      for (const cand of result.response.candidates || []) {
        for (const part of cand.content?.parts || []) {
          const inline = part.inlineData;
          if (inline?.data) {
            images.push(`data:${inline.mimeType || "image/png"};base64,${inline.data}`);
          }
        }
      }
      if (images.length > 0) return images;
      // Sem imagem (mas sem erro): tenta o próximo modelo.
    } catch (err) {
      lastError = err;
      // Modelo indisponível/404 → tenta o próximo.
    }
  }

  if (lastError) throw lastError;
  return [];
}

/**
 * Assistente de texto (Genos): responde perguntas/dicas criativas usando o Gemini de texto.
 */
export async function askGenos(prompt: string, context?: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const system =
    "Você é o Genos, um assistente criativo de marketing de autopeças (Carflax). " +
    "Ajude com ideias de copy, ângulos de campanha, prompts de imagem e estratégias criativas. " +
    "Seja direto, prático e em português do Brasil.";
  const full = context ? `${system}\n\nContexto do criativo:\n${context}\n\nPergunta:\n${prompt}` : `${system}\n\nPergunta:\n${prompt}`;
  const result = await model.generateContent(full);
  return result.response.text().trim();
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

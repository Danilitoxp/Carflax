import type { VercelRequest, VercelResponse } from "@vercel/node";

const PIX_BASE = "http://144.22.215.1:10150";
const PIX_AUTH = "Basic VEVTVEU6MTIz";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const upstream = await fetch(`${PIX_BASE}/Pix/gera_cobranca_pix`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: PIX_AUTH,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  });

  const data = await upstream.text();
  res.status(upstream.status).setHeader("Content-Type", "application/json").send(data);
}

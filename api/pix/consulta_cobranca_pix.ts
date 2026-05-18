import type { VercelRequest, VercelResponse } from "@vercel/node";

const PIX_BASE = "http://144.22.215.1:10150";
const PIX_AUTH = "Basic VEVTVEU6MTIz";

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  const { codigoEmpresa, txIdPix } = req.query;
  const upstream = await fetch(
    `${PIX_BASE}/Pix/consulta_cobranca_pix?codigoEmpresa=${codigoEmpresa}&txIdPix=${txIdPix}`,
    {
      headers: { accept: "application/json", authorization: PIX_AUTH },
    }
  );

  res.status(upstream.status);
  const ct = upstream.headers.get("content-type");
  if (ct) res.setHeader("Content-Type", ct);

  if (!upstream.body) return res.end();

  const reader = upstream.body.getReader();
  const pump = async () => {
    const { done, value } = await reader.read();
    if (done) return res.end();
    res.write(value);
    return pump();
  };
  await pump();
}

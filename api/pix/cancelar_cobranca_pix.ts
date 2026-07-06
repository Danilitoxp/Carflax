import type { VercelRequest, VercelResponse } from "@vercel/node";

const PIX_BASE = "http://144.22.215.1:10150";
const PIX_AUTH = "Basic VEVTVEU6MTIz";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") return res.status(405).end("Method Not Allowed");

  const { codigoEmpresa, txIdPix } = req.query;
  const upstream = await fetch(
    `${PIX_BASE}/Pix/cancelar_cobranca_pix?codigoEmpresa=${codigoEmpresa}&txIdPix=${txIdPix}`,
    {
      method: "DELETE",
      headers: { accept: "application/json", authorization: PIX_AUTH },
    },
  );

  const data = await upstream.text();
  res.status(upstream.status).send(data);
}

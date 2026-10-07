// PDF da coleta para o motorista: o que mostrar no balcão do fornecedor.
//
// Monta a partir da própria coleta (pedido de compra, fornecedor, endereço e
// itens), sem chamar o ERP: o link do motorista é público e não tem acesso ao
// backend. Os itens já vêm do pedido de compra quando a coleta foi criada.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ColetaPdf {
  fornecedor: string;
  contato?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  referencia?: string | null;
  pedido_compra?: string | null;
  pedido_empresa?: string | null;
  itens: string;
  volumes?: number | null;
  peso_kg?: number | null;
  observacao?: string | null;
  rom_date?: string | null;
  driver_name?: string | null;
}

const brData = (iso?: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

export function gerarPdfColeta(c: ColetaPdf): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const larg = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, larg, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CARFLAX · COLETA EM FORNECEDOR", 14, 12);
  doc.setFontSize(11);
  doc.text(
    c.pedido_compra ? `Pedido de compra nº ${c.pedido_compra}${c.pedido_empresa ? ` (empresa ${c.pedido_empresa})` : ""}` : "Coleta sem pedido de compra",
    14,
    20,
  );

  y = 36;
  doc.setTextColor(15, 23, 42);
  const linha = (rotulo: string, valor?: string | null) => {
    if (!valor) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(rotulo.toUpperCase(), 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const partes = doc.splitTextToSize(valor, larg - 60);
    doc.text(partes, 50, y);
    y += 6 * partes.length + 1;
  };
  linha("Fornecedor", c.fornecedor);
  linha("Endereço", [c.endereco, c.bairro, [c.cidade, c.uf].filter(Boolean).join("/")].filter(Boolean).join(" - "));
  linha("Contato", c.contato);
  linha("Referência", c.referencia);
  linha("Romaneio", [brData(c.rom_date), c.driver_name].filter(Boolean).join(" · "));
  linha("Volumes / peso", [c.volumes ? `${c.volumes} vol.` : "", c.peso_kg ? `${c.peso_kg} kg` : ""].filter(Boolean).join(" · "));
  linha("Observação", c.observacao);

  const itens = String(c.itens || "").split("\n").map((l) => l.trim()).filter(Boolean);
  autoTable(doc, {
    startY: y + 4,
    head: [["#", "Item a coletar", "Conferido"]],
    body: itens.map((it, i) => [String(i + 1), it, ""]),
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 24 } },
    theme: "grid",
  });

  // Espaço para o fornecedor/motorista assinarem a retirada.
  const fim = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 24;
  doc.setDrawColor(148, 163, 184);
  doc.line(14, fim, 95, fim);
  doc.line(larg - 95, fim, larg - 14, fim);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Fornecedor (nome e assinatura)", 14, fim + 5);
  doc.text("Motorista Carflax", larg - 95, fim + 5);

  return doc.output("blob");
}

/** Abre o PDF numa aba nova (no celular, abre o visualizador de PDF). */
export function abrirPdfColeta(c: ColetaPdf) {
  const url = URL.createObjectURL(gerarPdfColeta(c));
  const aba = window.open(url, "_blank");
  // Bloqueador de pop-up: baixa o arquivo no lugar.
  if (!aba) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `coleta-${c.pedido_compra || c.fornecedor}.pdf`.replace(/\s+/g, "-");
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

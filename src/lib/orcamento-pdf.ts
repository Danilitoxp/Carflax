import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ItemOrcamento } from "./orcamento-ia";

export interface PdfInfo {
  cliente:    string;
  endereco?:  string;
  municipio?: string;
  fone?:      string;
  cnpj?:      string;
  bairro?:    string;
  cep?:       string;
  vendedor?:  string;
  condicao?:  string;
  validade?:  string;
  numero?:    string;
}

// ─── Constantes visuais ───────────────────────────────────────────────────────
const AZUL:   [number, number, number] = [23,  37,  84];
const CINZA:  [number, number, number] = [240, 242, 245];
const BORDA:  [number, number, number] = [190, 200, 215];
const TEXTO:  [number, number, number] = [20,  20,  20];
const LABEL:  [number, number, number] = [80,  80,  80];

function detectarUN(descricao: string): string {
  const d = descricao.toUpperCase();
  if (d.match(/\bTUBO\b|\bBARRA\b|\bVARA\b|\bROLO\b/)) return "BR";
  if (d.match(/\bMT\b|\b\d+M\b/))                       return "MT";
  return "PC";
}

// Desenha uma célula de label + valor
function cell(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW?: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...LABEL);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXTO);
  const lx = x + doc.getTextWidth(label) + 1;
  const text = maxW ? doc.splitTextToSize(value, maxW - doc.getTextWidth(label) - 2)[0] : value;
  doc.text(text, lx, y);
}

// Linha horizontal interna
function hLine(doc: jsPDF, x1: number, x2: number, y: number) {
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.2);
  doc.line(x1, y, x2, y);
}

export function gerarOrcamentoPDF(itens: ItemOrcamento[], info?: PdfInfo) {
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now  = new Date();
  const W    = 210;
  const M    = 10; // margem lateral

  // Número do orçamento
  const numStr = info?.numero
    ? info.numero.padStart(12, "0")
    : `000001${String(now.getTime()).slice(-6)}`;
  const numOrc = `Orçamento de Venda-${numStr}`;

  // Validade padrão: hoje + 30 dias
  const validade = info?.validade || (() => {
    const d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("pt-BR");
  })();

  // ── 1. Cabeçalho da empresa ─────────────────────────────────────────
  const hY = 8, hH = 36;

  // Borda geral do cabeçalho
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  doc.rect(M, hY, W - 2 * M, hH);

  // Bloco azul do logo
  const logoW = 28;
  doc.setFillColor(...AZUL);
  doc.rect(M, hY, logoW, hH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CARFLAX", M + logoW / 2, hY + 14, { align: "center" });
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text("HIDRÁULICA LTDA", M + logoW / 2, hY + 19, { align: "center" });

  // Info da empresa (centro-esquerda)
  const infoX = M + logoW + 3;
  doc.setTextColor(...TEXTO);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("CARFLAX HIDRAULICA LTDA", infoX, hY + 8);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("AV AMERICO BRUNO, 75 - PONTE SAO JOAO",             infoX, hY + 14);
  doc.text("TEL: 4521-9777",                                     infoX, hY + 19);
  doc.text("CNPJ: 56.913.445/0001-17  IE: 407.103.857.119",     infoX, hY + 24);
  doc.text("E-mail: carflax@carflax.com.br  -  Site: www.carflax.com.br", infoX, hY + 29);

  // Validade + Vendedor (canto direito)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LABEL);
  doc.text("Valido Até:", W - M - 2, hY + 20, { align: "right" });
  doc.text("Vendedor:",   W - M - 2, hY + 27, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXTO);
  // reposiciona para depois do label (aproximado)
  doc.text(validade,                             W - M - 2, hY + 20 + 0, { align: "right" });
  doc.text(info?.vendedor?.toUpperCase() || "",  W - M - 2, hY + 27 + 0, { align: "right" });
  // (usa align right com todo o bloco — o label + valor ficam sobrepostos; ajuste abaixo)
  // Relabel lado direito usando dois campos separados
  const rX = W - M - 45;
  doc.setFont("helvetica", "bold");   doc.setFontSize(7.5); doc.setTextColor(...LABEL);
  doc.text("Valido Até:", rX, hY + 20);
  doc.text("Vendedor:",   rX, hY + 27);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXTO);
  doc.text(validade,                             rX + 22, hY + 20);
  doc.text(info?.vendedor?.toUpperCase() || "",  rX + 22, hY + 27);

  // ── 2. Título do orçamento ──────────────────────────────────────────
  const titY = hY + hH + 2;
  doc.setFillColor(220, 225, 235);
  doc.rect(M, titY, W - 2 * M, 8, "F");
  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  doc.rect(M, titY, W - 2 * M, 8);
  doc.setTextColor(...AZUL);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(numOrc, W / 2, titY + 5.5, { align: "center" });

  // ── 3. Dados do cliente ─────────────────────────────────────────────
  const cliY = titY + 10;
  const rowH = 7;
  const rows4 = 4;
  const cliH  = rows4 * rowH;
  const splitX = M + (W - 2 * M) * 0.62;
  const cliW   = W - 2 * M;

  doc.setDrawColor(...BORDA);
  doc.setLineWidth(0.3);
  doc.rect(M, cliY, cliW, cliH);

  // Divisória vertical
  doc.line(splitX, cliY, splitX, cliY + cliH);
  // Divisórias horizontais
  for (let i = 1; i < rows4; i++) hLine(doc, M, M + cliW, cliY + i * rowH);

  const cv = (label: string, value: string, x: number, row: number, w?: number) =>
    cell(doc, label, value, x + 1.5, cliY + row * rowH + 5, w);

  cv("Cliente:",    info?.cliente   || "", M,        0, splitX - M);
  cv("CNPJ/CPF:",   info?.cnpj     || "", splitX,   0, W - M - splitX);
  cv("Endereço:",   info?.endereco  || "", M,        1, splitX - M);
  cv("IE/RG:",      "",                   splitX,   1);
  cv("Município:",  info?.municipio || "", M,        2, splitX - M);
  cv("Bairro:",     info?.bairro   || "", splitX,   2, W - M - splitX);
  cv("Fone:",       info?.fone     || "", M,        3);
  cv("C.E.P.:",     info?.cep      || "", splitX,   3);

  // ── 4. Condição de pagamento ────────────────────────────────────────
  const condY = cliY + cliH;
  doc.setFillColor(...CINZA);
  doc.rect(M, condY, cliW, 7, "F");
  doc.setDrawColor(...BORDA);
  doc.rect(M, condY, cliW, 7);
  cell(doc, "Condição:", info?.condicao?.toUpperCase() || "", M + 1.5, condY + 5);

  // ── 5. Tabela de itens ──────────────────────────────────────────────
  const tableY = condY + 9;
  let num = 0;

  const tableRows = itens.map(it => [
    ++num,
    "001",
    it.cod_item || "",
    it.descricao,
    detectarUN(it.descricao),
    it.quantidade,
    it.preco_unit > 0
      ? it.preco_unit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "",
    it.total > 0
      ? it.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "",
  ]);

  autoTable(doc, {
    head: [["Nº", "EMP", "CÓD.", "DESCRIÇÃO", "UN", "QUANT.", "VR. UNIT", "VR. TOTAL"]],
    body: tableRows,
    startY: tableY,
    margin: { left: M, right: M },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [...TEXTO],
      lineColor: [...BORDA],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [...AZUL],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [...CINZA] },
    columnStyles: {
      0: { cellWidth: 8,    halign: "center" },
      1: { cellWidth: 10,   halign: "center" },
      2: { cellWidth: 16,   halign: "center" },
      3: { cellWidth: "auto" },
      4: { cellWidth: 10,   halign: "center" },
      5: { cellWidth: 14,   halign: "center" },
      6: { cellWidth: 22,   halign: "right" },
      7: { cellWidth: 24,   halign: "right", fontStyle: "bold" },
    },
    // Badge "NÃO ENCONTRADO"
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 2) {
        const idx = data.row.index;
        if (itens[idx] && !itens[idx].encontrado) {
          data.cell.styles.fillColor = [254, 243, 199];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  const totalGeral = itens.reduce((s, it) => s + it.total, 0);

  // ── 6. Total ────────────────────────────────────────────────────────
  const totW = 70;
  doc.setFillColor(...AZUL);
  doc.rect(W - M - totW, finalY + 3, totW, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL GERAL:", W - M - totW + 3, finalY + 9);
  doc.text(
    totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    W - M - 2, finalY + 9, { align: "right" }
  );

  // ── 7. Rodapé ───────────────────────────────────────────────────────
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Orçamento gerado pelo sistema Carflax HUB · ${now.toLocaleDateString("pt-BR")}`, W / 2, 290, { align: "center" });

  doc.save(`${numStr}.pdf`);
}

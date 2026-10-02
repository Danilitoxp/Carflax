// Exportação da tela de Comissões para Excel.
//
// Fica em módulo próprio porque é código de formatação, não de regra: a tela só
// chama `exportarComissoes` e segue limpa. Usa `xlsx-js-style` (mesma API do
// xlsx, mas grava cor, fonte e borda), igual à exportação de Produtos.
//
// São duas abas:
//   "Comissões" — a tabela, pronta para conferir e pagar, com totais no rodapé;
//   "Regra"     — faixas, metas e parâmetros do mês, para a planilha explicar
//                 sozinha de onde saiu cada número quando alguém abrir daqui
//                 a seis meses.
import type { ComissaoParametros, EquipeComissao, LinhaComissao } from "./comissao-service";

const AZUL = "1E3A8A";
const AZUL_CLARO = "F3F6FB";
const VERDE = "15803D";
const CINZA = "6B7280";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Formatos nativos do Excel: o valor vai como número, não como texto. */
const MOEDA = 'R$ #,##0.00';
const PCT = '0.0"%"';

type Alinhamento = "left" | "center" | "right";

interface Coluna {
  label: string;
  wch: number;
  align: Alinhamento;
  num?: string;
  valor: (l: LinhaComissao, nomeEquipe: string) => string | number;
}

const COLUNAS: Coluna[] = [
  { label: "Vendedor", wch: 30, align: "left", valor: (l) => l.nome },
  { label: "Equipe", wch: 20, align: "left", valor: (_l, nome) => nome },
  { label: "Meta", wch: 14, align: "right", num: MOEDA, valor: (l) => l.entrada.metaVendedor },
  { label: "Faturado", wch: 14, align: "right", num: MOEDA, valor: (l) => l.entrada.faturado },
  { label: "Atingimento", wch: 12, align: "right", num: PCT,
    valor: (l) => (l.entrada.metaVendedor > 0 ? (l.entrada.faturado / l.entrada.metaVendedor) * 100 : 0) },
  { label: "Margem", wch: 10, align: "right", num: PCT, valor: (l) => l.entrada.margemPct },
  { label: "Conversão", wch: 11, align: "right", num: PCT, valor: (l) => l.entrada.conversaoPct },
  { label: "Índice", wch: 9, align: "right", num: PCT, valor: (l) => l.resultado.indicePct },
  { label: "Comissão", wch: 14, align: "right", num: MOEDA, valor: (l) => l.resultado.valorComissao },
  { label: "Bônus", wch: 12, align: "right", num: MOEDA, valor: (l) => l.resultado.totalBonus },
  { label: "Total a receber", wch: 16, align: "right", num: MOEDA, valor: (l) => l.resultado.total },
];

/** Uma coluna por etapa da cascata, para ver onde cada vendedor parou. */
const ETAPAS: { label: string; wch: number }[] = [
  { label: "Faturamento", wch: 13 },
  { label: "Margem bruta", wch: 13 },
  { label: "Conversão", wch: 13 },
  { label: "Fat. equipe", wch: 13 },
  { label: "Margem equipe", wch: 14 },
];

const STATUS_TEXTO: Record<string, string> = {
  alcancada: "Alcançada",
  pendente: "Pendente",
  bloqueada: "Bloqueada",
};

const STATUS_COR: Record<string, string> = {
  alcancada: VERDE,
  pendente: "B45309",
  bloqueada: CINZA,
};

export interface DadosExport {
  linhas: LinhaComissao[];
  equipes: EquipeComissao[];
  parametros: ComissaoParametros;
  mesRef: Date;
  /** Equipe em foco na tela; vai no título para o arquivo não ficar ambíguo. */
  equipeFoco?: EquipeComissao | null;
}

export async function exportarComissoes({ linhas, equipes, parametros, mesRef, equipeFoco }: DadosExport) {
  const XLSX = await import("xlsx-js-style");

  const borda = { style: "thin", color: { rgb: "D9DEE7" } };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const fonte = (extra: Record<string, unknown> = {}) => ({ sz: 10, name: "Calibri", ...extra });

  const cabecalho = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
    fill: { fgColor: { rgb: AZUL } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: bordas,
  };

  const nomeEquipe = new Map(equipes.map((e) => [e.id, e.nome]));
  const colunas = [...COLUNAS, ...ETAPAS.map((e) => ({ label: e.label, wch: e.wch, align: "center" as Alinhamento }))];
  const periodo = `${MESES[mesRef.getMonth()]} de ${mesRef.getFullYear()}`;
  const titulo = `Comissões — ${periodo}${equipeFoco ? ` — ${equipeFoco.nome}` : ""}`;

  // ── Aba 1: a tabela ────────────────────────────────────────────────────────
  const corpo = linhas.map((l) => {
    const equipe = nomeEquipe.get(l.equipeId) ?? "";
    return [
      ...COLUNAS.map((c) => c.valor(l, equipe)),
      ...l.resultado.bonus.map((b) => STATUS_TEXTO[b.status] ?? ""),
    ];
  });

  const somar = (fn: (l: LinhaComissao) => number) => linhas.reduce((acc, l) => acc + fn(l), 0);
  const linhaTotal = colunas.map((_, i) => {
    if (i === 0) return `Total — ${linhas.length} vendedor${linhas.length === 1 ? "" : "es"}`;
    if (i === 3) return somar((l) => l.entrada.faturado);
    if (i === 8) return somar((l) => l.resultado.valorComissao);
    if (i === 9) return somar((l) => l.resultado.totalBonus);
    if (i === 10) return somar((l) => l.resultado.total);
    return "";
  });

  const aoa: (string | number)[][] = [
    [titulo, ...colunas.slice(1).map(() => "")],
    [`Gerado em ${new Date().toLocaleString("pt-BR")}`, ...colunas.slice(1).map(() => "")],
    colunas.map((c) => c.label),
    ...corpo,
    linhaTotal,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const ultimaCol = XLSX.utils.encode_col(colunas.length - 1);
  const linhaCab = 2; // índice 0-based da linha de cabeçalho
  const primeiraLinha = linhaCab + 1;
  const ultimaLinha = primeiraLinha + corpo.length - 1;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colunas.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colunas.length - 1 } },
  ];
  ws["!cols"] = colunas.map((c) => ({ wch: c.wch }));
  ws["!rows"] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 24 }];
  ws["!autofilter"] = { ref: `A${linhaCab + 1}:${ultimaCol}${ultimaLinha + 1}` };
  // Congela título + cabeçalho e a coluna do nome: rolando, ainda se sabe quem é
  // a linha e o que é a coluna.
  ws["!freeze"] = { xSplit: 1, ySplit: linhaCab + 1 };
  ws["!view"] = [{ showGridLines: false }];

  ws["A1"].s = {
    font: { bold: true, sz: 14, color: { rgb: AZUL }, name: "Calibri" },
    alignment: { vertical: "center" },
  };
  ws["A2"].s = {
    font: { sz: 9, color: { rgb: CINZA }, name: "Calibri", italic: true },
    alignment: { vertical: "center" },
  };
  colunas.forEach((_, c) => {
    const cel = ws[XLSX.utils.encode_cell({ r: linhaCab, c })];
    if (cel) cel.s = cabecalho;
  });

  linhas.forEach((l, i) => {
    const r = primeiraLinha + i;
    const zebra = i % 2 === 1 ? { fill: { fgColor: { rgb: AZUL_CLARO } } } : {};
    colunas.forEach((col, c) => {
      const cel = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cel) return;
      const estaNasEtapas = c >= COLUNAS.length;
      const bonus = estaNasEtapas ? l.resultado.bonus[c - COLUNAS.length] : undefined;

      if ("num" in col && col.num) cel.z = col.num;
      cel.s = {
        font: fonte({
          // Total a receber em destaque; status com a cor do próprio estado.
          bold: c === 10,
          color: {
            rgb: bonus
              ? STATUS_COR[bonus.status]
              : c === 10 && l.resultado.total > 0
                ? VERDE
                : "111827",
          },
        }),
        alignment: { horizontal: col.align, vertical: "center" },
        border: bordas,
        ...zebra,
      };
    });
  });

  // Rodapé de totais
  const rTotal = ultimaLinha + 1;
  colunas.forEach((col, c) => {
    const cel = ws[XLSX.utils.encode_cell({ r: rTotal, c })];
    if (!cel) return;
    if ("num" in col && col.num && c >= 3) cel.z = MOEDA;
    cel.s = {
      font: fonte({ bold: true, color: { rgb: "FFFFFF" } }),
      fill: { fgColor: { rgb: AZUL } },
      alignment: { horizontal: c === 0 ? "left" : col.align, vertical: "center" },
      border: bordas,
    };
  });

  // ── Aba 2: a regra que gerou os números ────────────────────────────────────
  const regra: (string | number)[][] = [
    [`Regra da comissão — vigência ${parametros.vigencia_inicio}`, ""],
    ["", ""],
    ["Parâmetro", "Valor"],
    ["Meta de margem bruta individual", `${parametros.meta_margem_bruta_pct}%`],
    ["Meta de conversão de orçamentos", `${parametros.meta_conversao_pct}%`],
    ["Meta de margem bruta da equipe", `${parametros.meta_margem_loja_pct}%`],
    ["Valor de cada bônus", parametros.bonus_valor],
    ["", ""],
    ["Equipe", "Meta de faturamento"],
    ...equipes.map((e) => [e.nome, e.meta] as (string | number)[]),
    ["", ""],
    ["Faixa de faturamento", "Índice"],
    ...parametros.faixas.map((f) => [
      f.max === null ? `Acima de ${f.min.toLocaleString("pt-BR")}` : `${f.min.toLocaleString("pt-BR")} a ${f.max.toLocaleString("pt-BR")}`,
      `${f.pct}%`,
    ] as (string | number)[]),
    ["", ""],
    ["Como é calculado", ""],
    ["Comissão", "Faturamento do vendedor × índice da faixa em que ele caiu"],
    ["Bônus", "5 etapas em cascata: cada uma só paga se a anterior foi alcançada"],
    ["Ordem das etapas", "Faturamento → margem bruta → conversão → faturamento da equipe → margem da equipe"],
    ["Total a receber", "Comissão + bônus alcançados"],
  ];

  const wsRegra = XLSX.utils.aoa_to_sheet(regra);
  wsRegra["!cols"] = [{ wch: 34 }, { wch: 68 }];
  wsRegra["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  wsRegra["!view"] = [{ showGridLines: false }];
  wsRegra["A1"].s = {
    font: { bold: true, sz: 13, color: { rgb: AZUL }, name: "Calibri" },
    alignment: { vertical: "center" },
  };
  regra.forEach((linha, r) => {
    if (r === 0) return;
    // Linha de seção: segunda coluna vazia e primeira preenchida vira subtítulo.
    const ehSecao = ["Parâmetro", "Equipe", "Faixa de faturamento", "Como é calculado"].includes(String(linha[0]));
    linha.forEach((_, c) => {
      const cel = wsRegra[XLSX.utils.encode_cell({ r, c })];
      if (!cel) return;
      cel.s = ehSecao
        ? {
            font: { bold: true, sz: 10, name: "Calibri", color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: AZUL } },
            alignment: { vertical: "center" },
          }
        : {
            font: fonte(),
            alignment: { vertical: "center", horizontal: c === 1 ? "left" : "left", wrapText: true },
          };
    });
  });
  const celBonus = wsRegra["B7"];
  if (celBonus) celBonus.z = MOEDA;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Comissões");
  XLSX.utils.book_append_sheet(wb, wsRegra, "Regra");

  const sufixo = equipeFoco ? ` - ${equipeFoco.nome}` : "";
  XLSX.writeFile(wb, `Comissões ${MESES[mesRef.getMonth()]} ${mesRef.getFullYear()}${sufixo}.xlsx`);
}

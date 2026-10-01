// Aba "GUIA DE IMPORTAÇÃO" que acompanha todo Excel de produtos baixado no HUB.
//
// Conteúdo transcrito do help da Citel "Importação Cadastro de Produto", que diz
// em qual coluna do Excel cada campo do cadastro precisa estar. Quem recebe a
// planilha monta o arquivo de importação sem ir atrás do PDF.
//
// Uso: depois de montar a planilha, chame anexarGuiaImportacao(XLSX, wb) — vale
// tanto para "xlsx" quanto para "xlsx-js-style" (sem estilo, só ignora a cor).

type Linha = [string, string, string];

const SECAO = "__SECAO__";
const secao = (titulo: string): Linha => [SECAO, titulo, ""];

// Cada linha: coluna do Excel, campo no Cadastro de Produtos, observação.
const CAMPOS: Linha[] = [
  secao("Aba 1 — Geral"),
  ["A", "Código do Item", "Formatar como TEXTO, mesmo vazio (a planilha vira CSV). Tamanho 5, com zeros à esquerda"],
  ["B", "Cód Barras", ""],
  ["C", "Cód Fábrica", ""],
  ["D", "Fornecedor", "Tamanho 8, com zeros à esquerda"],
  ["E", "Departamento", "Tamanho 3, com zeros à esquerda"],
  ["F", "Linha Grupo", ""],
  ["G", "Descrição", "Não pode conter ';' (o arquivo é convertido em CSV separado por ponto e vírgula)"],
  ["I", "Marca", "Tamanho 6, com zeros à esquerda"],
  ["J", "Referência", ""],
  ["K", "Unidade", "Tamanho 2"],
  ["L", "Unid. Compra", "Tamanho 2"],
  ["AI", "Preço Compra", ""],
  ["AJ", "Desconto 01 (-)", ""],
  ["AK", "Desconto 02 (-)", ""],
  ["AL", "Desconto 03 (-)", ""],
  ["AM", "Desconto 04 (-)", ""],
  ["AN", "Desconto 05 (-)", ""],
  ["AO", "Desconto 06 (-)", ""],
  ["AP", "ICMS Entrada (-)", ""],
  ["AQ", "Impostos Federais (-)", ""],
  ["AR", "IPI Entrada (+)", ""],
  ["AS", "Frete (+)", ""],
  ["AT", "Valor Frete (+)", ""],
  ["AU", "Acréscimo Financeiro (+)", ""],
  ["AV", "Substituição Tributária (+)", ""],
  ["AW", "Descontos Adicionais / Boleto (-)", ""],
  ["AX", "Boca de Caixa (+)", "A configuração CFG_DOVCPP define a descrição desse campo; no cadastro pode aparecer com outro nome"],
  ["AY", "ICMS Saída (+)", ""],
  ["AZ", "Impostos Federais (+)", ""],
  ["BA", "Despesas Operacionais (+)", ""],
  ["BB", "Margem 1", ""],
  ["BC", "Comissão 1", ""],
  ["BD", "Preço Venda 1", ""],
  ["BE", "Margem 2", ""],
  ["BF", "Comissão 2", ""],
  ["BG", "Preço Venda 2", ""],
  ["BH", "Margem 3", ""],
  ["BI", "Comissão 3", ""],
  ["BJ", "Preço Venda 3", ""],
  ["BK", "Margem 4", ""],
  ["BL", "Comissão 4", ""],
  ["BM", "Preço Venda 4", ""],
  ["BN", "Margem 5", ""],
  ["BO", "Comissão 5", ""],
  ["BP", "Preço Venda 5", ""],
  ["BQ", "Margem 6", ""],
  ["BR", "Comissão 6", ""],
  ["BS", "Preço Venda 6", ""],
  ["BT", "Margem 7", ""],
  ["BU", "Comissão 7", ""],
  ["BV", "Preço Venda 7", ""],
  ["DT", "Unidade Tributária", ""],
  ["FK", "Fator de conversão (Unid. Tributária)", ""],
  ["DN", "TCIF", ""],
  ["DO", "TS", ""],
  ["DP", "Desconto PIS/COFINS", ""],
  ["DQ", "Desconto ICMS", ""],
  ["DR", "Fator Regional", ""],
  ["FO", "Margem Padrão", ""],
  ["EH", "Descrição Simplificada", ""],

  secao("Aba 2 — Complemento"),
  ["W", "Imprime Lista", ""],
  ["X", "Ativo", ""],
  ["Z", "Peso Bruto", "É o Peso Bruto usado também no E-Commerce"],
  ["AA", "Grupo de Preços", "Tamanho 3"],
  ["AB", "Grupo de Produto", "Tamanho 5"],
  ["CK", "Produto Base", ""],
  ["CL", "Produto Pigmento", ""],
  ["CQ", "Peso Líquido", ""],
  ["EQ", "Validade Obrigatória", ""],
  ["ET", "País de Origem", ""],
  ["ER", "Composição", ""],
  ["EG", "Lista de Situação do Produto", ""],
  ["DU", "Exporta Tablet?", ""],
  ["EK", "URL para QR Code — Etiqueta de Produtos", ""],
  ["EM", "Prazo de Validade (meses)", ""],
  ["ES", "SAC", ""],
  ["FL", "Desconto referente a Rapel", ""],
  ["FN", "Certificado de Aprovação de EPI", ""],

  secao("Aba — Margem Ideal"),
  ["EX", "Margem Ideal 1", "Depende das configurações CFG_MARIDE (margem ideal por tabela) e CFG_TABPRC (tabelas usadas)"],
  ["EY", "Margem Ideal 2", ""],
  ["EZ", "Margem Ideal 3", ""],
  ["FA", "Margem Ideal 4", ""],
  ["FB", "Margem Ideal 5", ""],
  ["FC", "Margem Ideal 6", ""],
  ["FD", "Margem Ideal 7", ""],

  secao("Aba — Dados de Saída"),
  ["AD", "Múltiplo de Venda", ""],
  ["AH", "Aplicação", ""],
  ["BW", "Comissão Vendedor Interno", ""],
  ["BX", "Comissão Representante Externo Loja", ""],
  ["BY", "Comissão Representante Externo Distribuição", ""],
  ["BZ", "Comissão do Profissional", ""],
  ["CA", "Desconto Máximo Vendedor", ""],
  ["CB", "Desconto Máximo Sub-gerente", ""],
  ["CC", "Desconto Máximo Gerente", ""],
  ["CD", "Margem Mínima Vendedor", ""],
  ["CE", "Margem Mínima Sub-gerente", ""],
  ["CF", "Margem Mínima Gerente", ""],
  ["CG", "Tempo de Garantia (meses)", ""],
  ["CH", "Informações da Garantia do Produto", ""],
  ["CM", "Obrigar Cód. Barras na Expedição", ""],
  ["DW", "Industrialização ou Revenda", ""],
  ["DX", "Importação Direta", ""],
  ["DY", "Mensagem Livre 1", ""],
  ["DZ", "Mensagem Livre 2", ""],
  ["EA", 'Permitir Entrega Futura com status "Aguardando o Cliente"', ""],
  ["EB", 'Permitir Entrega Futura com status "Previsão de Entrega"', ""],
  ["EC", 'Permitir Entrega Futura com status "Falta de Produto"', ""],
  ["EI", "Tipo de Frete", ""],
  ["EJ", "Valor do Frete", ""],

  secao("Aba — Dados de Entrada"),
  ["H", "Descrição do Fabricante", ""],
  ["Y", "Ativo para compra", ""],
  ["AC", "Grupo de Compras", "Tamanho 3"],
  ["AE", "Múltiplo para compra", ""],
  ["AF", "Nível de Giro de Estoque — Geral", ""],
  ["AG", "Acordo de Objetivos", ""],
  ["CN", "Produto com compra centralizada", ""],
  ["CS", "Dias para entrega do Fornecedor", ""],

  secao("Aba — Estoque"),
  ["DL", "Estoque mínimo por empresa", ""],
  ["DM", "Estoque máximo por empresa", ""],
  ["CP", "Nível de Giro por empresa", ""],
  ["EE", "Lista Estoque Mínimo", "Formato empresa=valor separado por pipe. Ex.: 001=1|000=2"],
  ["EF", "Lista Estoque Máximo", "Formato empresa=valor separado por pipe. Ex.: 002=3|001=2"],
  ["EG", "Lista Situação do Produto", "Formato empresa=valor separado por pipe. Ex.: 001=005|002=006"],
  ["ED", "Lista Opção Estoque Mínimo", "Formato empresa=valor separado por pipe. Ex.: 001=G|002=D"],
  ["FP", "Tipo de estoque mínimo", "Formato empresa=valor separado por pipe"],
  ["EN", "Nível de Criticidade", ""],
  ["EP", "Permitir receber devolução deste produto", ""],

  secao("Aba — Dados Fiscais"),
  ["M", "Abreviação Fiscal (ICMS)", "Tamanho 3"],
  ["N", "Abreviação de PIS", ""],
  ["O", "Abreviação de COFINS", "Tamanho 3"],
  ["P", "Abreviação de IPI", "Tamanho 3"],
  ["Q", "IPI de Saída", ""],
  ["R", "Incide PIS/COFINS", ""],
  ["S", "NCM / Classificação de IPI", ""],
  ["T", "Código EX IPI", ""],
  ["U", "Classificação CEST", ""],
  ["V", "Classificação ONU", "Tamanho 3"],
  ["DV", "Tipo de produto (SPED)", ""],
  ["FI", "Percentual (CI)", ""],
  ["FJ", "N° Ficha (FCI)", ""],
  ["EO", "Lista de abreviações fiscais por empresa", "Formato empresa=abreviação, ambos com 3 dígitos, vários separados por pipe. Ex.: 001=001|002=005"],
  ["FQ", "Lista de abreviações fiscais de PIS por empresa", "Mesmo formato da coluna EO"],
  ["FR", "Lista de abreviações fiscais de COFINS por empresa", "Mesmo formato da coluna EO"],

  secao("Aba — Localização Física"),
  ["CI", "Localização Física", ""],
  ["CJ", "Localização Super Estoque", ""],
  ["CR", "Local de Separação", ""],

  secao("Aba — Montadoras"),
  ["CO", "Código da Montadora", 'Aceita vários códigos separados por vírgula. Ex.: 001, 002, 003'],

  secao("Aba — E-Commerce"),
  ["CT", "Exportação para E-Commerce", ""],
  ["CU", "Descrição do Produto (E-Commerce)", ""],
  ["CV", "Dados Técnicos (E-Commerce)", ""],
  ["CW", "URL da imagem (E-Commerce)", ""],
  ["CX", "Nome do Produto (E-Commerce)", ""],
  ["CY", "Aplicação (E-Commerce)", ""],
  ["CZ", "Itens Inclusos (E-Commerce)", ""],
  ["DA", "Altura (E-Commerce)", ""],
  ["DB", "Largura (E-Commerce)", ""],
  ["DC", "Profundidade (E-Commerce)", ""],
  ["DD", "Desconto para Site (E-Commerce)", ""],
  ["DE", "Categorias (E-Commerce)", ""],
  ["DF", "Destaque (E-Commerce)", ""],
  ["DG", "Atualiza preços no site? (E-Commerce)", ""],
  ["DH", "Exportação APP Venda Assistida", ""],
  ["EL", "Exportar para o B2B", ""],

  secao("Aba — Fornecedores"),
  ["DI", "Lista de Códigos de Fornecedores", "Separar por vírgula. Ex.: 00000001,00000002"],
  ["DJ", "Lista de Códigos do Item no Fornecedor", "Separar por vírgula, na MESMA ordem da coluna DI e com a mesma quantidade de itens"],
  ["DK", "Lista de Códigos CNA", "Opcional. Se preencher só uma posição, as demais ficam vazias. Ex.: CNAF001, ,CNAF003"],

  secao("Outros campos"),
  ["EU", "Código da Assistência Técnica", ""],
  ["EV", "Lista de verificação para Garantia de Mercadoria", "Texto em notação JSON. Ex.: [\"00008\", \"00012\", {\"codigo\":\"00001\", \"conteudo\":\"texto\"}]"],
  ["EW", "Lista de verificação para Troca de Mercadoria", "Mesmo formato da coluna EV"],
  ["FE", "Sob encomenda?", "Campo (S)im / (N)ão"],
  ["FH", "Múltiplo na rotina Citel Abastece", "Campo (C)ompra / (V)enda"],
  ["FM", "Desconto de Embalagem Fechada", "Cada grupo entre parênteses: Qtde Embalagem, % Desconto, Tabela de Preço. Ex.: (5,10,Todas) (1,2,3)"],
];

const REGRAS: string[] = [
  "Ordem que o sistema usa para localizar o produto: 1º Código do Item (coluna A); 2º Código de Barras (coluna B); 3º Código do Fornecedor + Código de Fábrica (colunas D + C); 4º os mesmos D + C pela guia Fornecedores, quando CFG_TABPRF = Não.",
  "Campo enviado em branco NÃO apaga o cadastro: o sistema mantém o que já está no Cadastro de Produtos. Dá para atualizar só algumas colunas.",
  "Margem e Preço de Venda são atualizados automaticamente conforme a opção escolhida na tela de filtros. A Comissão NÃO é atualizada por esse procedimento.",
  "A coluna A (Código do Produto) precisa estar formatada como TEXTO, mesmo vazia: a planilha é convertida em CSV e, sem isso, a coluna A some.",
  "Campos de texto (ex.: coluna G, Descrição) não podem conter ponto e vírgula, porque o CSV usa ';' como separador.",
  "Códigos devem ser completados com zeros à esquerda conforme o tamanho: A=5, D=8, E=3, I=6, K=2, L=2, M=3, O=3, P=3, V=3, AA=3, AB=5, AC=3.",
  "Em campos numéricos de embalagem, o separador decimal é ponto.",
  "Embalagens: cada embalagem começa com '(' e termina com ')', com os elementos separados por vírgula — código de barras, fornecedor, fator, principal (S/N), compras (S/N) e exibe no faturamento (S/N). Ex.: (558697897123, 00000001, 4, S, S, S) (896554789256123, , 0.225, , N, S).",
  "Também é possível importar por arquivo CSV, na mesma ordem das colunas do Excel, com os campos separados por ';'.",
];

// Exemplo de preenchimento de CADA coluna, usando o mesmo produto como fio
// condutor: o item 00329 (TUBO EG BR PVC 100MM AMANCO), com os dados reais do ERP
// nas colunas que existem no cadastro dele.
const EXEMPLOS: Record<string, string> = {
  A: "00329",
  B: "7891960280044",
  C: "10472",
  D: "00000301",
  E: "001",
  F: "TUBOS",
  G: "TUBO EG BR PVC 100MM (10472) AMANCO",
  I: "000001",
  J: "10472",
  K: "01",
  L: "01",
  AI: "76,23",
  AJ: "10,00",
  AK: "5,00",
  AL: "0,00",
  AM: "0,00",
  AN: "0,00",
  AO: "0,00",
  AP: "18,00",
  AQ: "9,25",
  AR: "5,00",
  AS: "2,00",
  AT: "3,50",
  AU: "1,50",
  AV: "0,00",
  AW: "2,00",
  AX: "0,00",
  AY: "18,00",
  AZ: "9,25",
  BA: "8,00",
  BB: "35,00",
  BC: "2,00",
  BD: "94,90",
  BE: "32,00",
  BF: "2,00",
  BG: "125,90",
  BH: "30,00",
  BI: "1,50",
  BJ: "119,90",
  BK: "28,00",
  BL: "1,50",
  BM: "115,90",
  BN: "26,00",
  BO: "1,00",
  BP: "112,90",
  BQ: "24,00",
  BR: "1,00",
  BS: "109,90",
  BT: "22,00",
  BU: "1,00",
  BV: "105,90",
  DT: "MT",
  FK: "6",
  DN: "0,00",
  DO: "0,00",
  DP: "0,00",
  DQ: "0,00",
  DR: "1,00",
  FO: "35,00",
  EH: "TUBO EG 100MM",
  W: "S",
  X: "S",
  Z: "5,600",
  AA: "001",
  AB: "00001",
  CK: "00329",
  CL: "00000",
  CQ: "5,500",
  EQ: "N",
  ET: "BRASIL",
  ER: "PVC",
  EG: "001=005|002=006",
  DU: "S",
  EK: "https://carflax.com.br/p/00329",
  EM: "24",
  ES: "0800 000 0000",
  FL: "2,00",
  FN: "CA 12345",
  EX: "35,00",
  EY: "32,00",
  EZ: "30,00",
  FA: "28,00",
  FB: "26,00",
  FC: "24,00",
  FD: "22,00",
  AD: "1",
  AH: "ESGOTO PREDIAL",
  BW: "2,00",
  BX: "3,00",
  BY: "4,00",
  BZ: "1,00",
  CA: "5,00",
  CB: "8,00",
  CC: "10,00",
  CD: "20,00",
  CE: "18,00",
  CF: "15,00",
  CG: "12",
  CH: "Garantia de 12 meses contra defeito de fabricacao",
  CM: "S",
  DW: "R",
  DX: "N",
  DY: "Produto vendido por barra de 6 metros",
  DZ: "Confira a bitola antes de comprar",
  EA: "S",
  EB: "S",
  EC: "N",
  EI: "CIF",
  EJ: "3,50",
  H: "TUBO ESGOTO SN DN 100 - 6M AMANCO",
  Y: "S",
  AC: "001",
  AE: "10",
  AF: "A",
  AG: "N",
  CN: "N",
  CS: "15",
  DL: "001=10|002=5",
  DM: "001=100|002=50",
  CP: "001=A|002=B",
  EE: "001=1|002=2",
  EF: "002=3|001=2",
  ED: "001=G|002=D",
  FP: "001=1|002=2",
  EN: "2",
  EP: "S",
  M: "001",
  N: "001",
  O: "001",
  P: "001",
  Q: "5,00",
  R: "S",
  S: "39172100",
  T: "00",
  U: "1001100",
  V: "000",
  DV: "00",
  FI: "0,00",
  FJ: "0",
  EO: "001=001|002=005",
  FQ: "001=001|002=005",
  FR: "001=001|002=005",
  CI: "TA 3-A",
  CJ: "SUP-12",
  CR: "SEP-A",
  CO: "001, 002, 003",
  CT: "S",
  CU: "Tubo de esgoto PVC 100mm Amanco, barra de 6 metros",
  CV: "Diametro 100mm · Barra 6m · Norma NBR 5688",
  CW: "https://carflax.com.br/img/00329.jpg",
  CX: "Tubo Esgoto PVC 100mm Amanco",
  CY: "Esgoto predial e aguas pluviais",
  CZ: "1 barra de 6 metros",
  DA: "6000",
  DB: "110",
  DC: "110",
  DD: "5,00",
  DE: "Hidraulica>Tubos>Esgoto",
  DF: "S",
  DG: "S",
  DH: "S",
  EL: "S",
  DI: "00000001,00000002",
  DJ: "CODF001,CODF002",
  DK: "CNAF001, ,CNAF003",
  EU: "00000301",
  EV: "[\"00008\", \"00012\"]",
  EW: "[{\"codigo\":\"00001\", \"conteudo\":\"Embalagem original\"}]",
  FE: "N",
  FH: "C",
  FM: "(5,10,Todas) (1,2,3)",
};

const TITULO =
  "GUIA DE IMPORTAÇÃO — CADASTRO DE PRODUTO (CITEL) Por Danilo Oliveira " +
  "(atenção ao finalizar remova a linha 1 e 2)";

const colParaIndice = (letra: string): number =>
  [...letra].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;

/**
 * Acrescenta a aba "GUIA DE IMPORTAÇÃO" no MESMO layout do arquivo de importação:
 * cada campo na coluna em que a Citel espera (A, B, DT, FK…), com um exemplo
 * abaixo e a observação como comentário da célula. Quem usa preenche a partir da
 * linha 3 e apaga as duas primeiras linhas antes de importar.
 *
 * Recebe o módulo XLSX já importado pela tela (xlsx ou xlsx-js-style), para não
 * duplicar a dependência.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function anexarGuiaImportacao(XLSX: any, wb: any): void {
  // Linha 1: título · linha 2: nome do campo · linha 3: exemplo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {};
  let ultimaCol = 0;
  let aba = "";

  for (const linha of CAMPOS) {
    if (linha[0] === SECAO) {
      aba = linha[1];
      continue;
    }
    const [letra, campo, obs] = linha;
    const c = colParaIndice(letra);
    ultimaCol = Math.max(ultimaCol, c);

    ws[XLSX.utils.encode_cell({ r: 1, c })] = {
      t: "s",
      v: campo,
      s: {
        font: { bold: true, sz: 10, name: "Calibri", color: { rgb: "111827" } },
        alignment: { vertical: "center", wrapText: true },
      },
      // Aba de origem e observação ficam no comentário, sem poluir a planilha.
      c: comentario(`Coluna ${letra} · ${aba}` + (obs ? `\n\n${obs}` : "")),
    };

    const exemplo = EXEMPLOS[letra];
    if (exemplo) {
      ws[XLSX.utils.encode_cell({ r: 2, c })] = {
        t: "s",
        v: `Ex: ${exemplo}`,
        s: { font: { sz: 10, name: "Calibri", color: { rgb: "6B7280" } } },
      };
    }
  }

  ws.A1 = {
    t: "s",
    v: TITULO,
    s: {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" }, name: "Calibri" },
      fill: { fgColor: { rgb: "00AEEF" } },
      // À esquerda: centralizado numa mesclagem de ~174 colunas, o texto ia
      // parar no meio da planilha e sumia da tela.
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
    },
    // As regras do help não cabem no layout: viram comentário do título.
    c: comentario(`REGRAS DA IMPORTAÇÃO\n\n${REGRAS.map((r) => `• ${r}`).join("\n\n")}`),
  };

  ws["!ref"] = `A1:${XLSX.utils.encode_col(ultimaCol)}200`;
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: ultimaCol } }];
  ws["!rows"] = [{ hpt: 22 }, { hpt: 30 }];
  ws["!cols"] = Array.from({ length: ultimaCol + 1 }, () => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, ws, "GUIA DE IMPORTAÇÃO");
}

/** Comentário de célula no formato do SheetJS (fica escondido até passar o mouse). */
function comentario(texto: string) {
  const lista = [{ t: texto, a: "Carflax HUB" }];
  (lista as unknown as { hidden: boolean }).hidden = true;
  return lista;
}

/**
 * HANDLER: Crm / Orcamentos
 * Contém a lógica de busca no banco de dados ERP
 */

exports.listarOrcamentos = async (req, res) => {
  const { inicio, fim, vendedor } = req.query;
  const pool = req.app.locals.pool;

  // Datas padrão: Primeiro e último dia do mês atual, se não informadas
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ultimoDiaMes = new Date(ano, hoje.getMonth() + 1, 0).getDate();

  const dtIni = inicio || `${ano}-${mes}-01`;
  const dtFim = fim || `${ano}-${mes}-${ultimoDiaMes}`;

  try {
    const sql = `
      SELECT
          O.DOCUMENTO AS ORCAMENTO,
          -- Equalizando a lógica com o Dashboard Geral: JAFATU = 1 e sem motivo de baixa
          CASE 
              WHEN G.FGO_JAFATU = 1 AND G.FGO_MOTBAI IS NULL THEN 'Sim'
              ELSE 'Não'
          END AS PEDIDO,
          G.FGO_NUMFAT AS NOTA_FISCAL,
          O.DATA_ENTRADA AS DATA_ORCAMENTO,
          O.HORA_ENTRADA AS HORA_ORCAMENTO,
          O.COD_VENDEDOR,
          O.VENDEDOR,
          O.CLIENTE,
          O.EMPRESA,
          O.COD_PRODUTO,
          O.PRODUTO,
          O.QTDITE AS QUANTIDADE,
          
          -- Valor Unitário real vindo da FATDOR
          COALESCE(D.FDO_UNITAR, 0) AS PRECO_UNITARIO,
          
          -- Exibindo o Custo Unitário (Custo Total / Quantidade)
          CASE 
              WHEN O.QTDITE > 0 THEN ROUND(COALESCE(D.FDO_TOTCUS, 0) / O.QTDITE, 2)
              ELSE 0 
          END AS CUSTO_UNITARIO,

          -- Cálculo do Markup Real
          CASE 
              WHEN COALESCE(D.FDO_TOTCUS, 0) > 0 
              THEN ROUND((( (COALESCE(D.FDO_UNITAR, 0) * O.QTDITE) - D.FDO_TOTCUS) / D.FDO_TOTCUS) * 100, 2)
              ELSE 0 
          END AS MARKUP_PERCENTUAL,
          
          O.MARCA,
          O.UN,
          -- Prioriza o valor total da FATGOR se disponível
          COALESCE(G.FGO_TOTPRO, T.VALOR_ORCAMENTO) AS VALOR_TOTAL_ORCAMENTO,
          COALESCE(DATE_FORMAT(O.DTABAI, '%Y-%m-%d'), 'SEM DATA') AS DATA_BAIXA,
          COALESCE(O.MOTCAN, 'SEM MOTIVO') AS MOTIVO_CANCELAMENTO

      FROM VW_ORCAMENTO O

      -- 1. Vincula os itens para pegar Custo e Preço Unitário
      LEFT JOIN FATDOR D ON 
          D.FDO_CODEMP = O.EMPRESA AND 
          D.FDO_NUMDOC = LPAD(SUBSTRING_INDEX(O.DOCUMENTO, '-', 1), 12, '0') AND 
          D.FDO_CODITE = O.COD_PRODUTO AND
          D.FDO_ESPDOC = 'OR'

      -- 2. Subconsulta para totalização (evita multiplicar valores pelo número de itens)
      LEFT JOIN (
          SELECT
              EMPRESA,
              DOCUMENTO,
              SUM(QTDITE * VALUNI) AS VALOR_ORCAMENTO,
              LPAD(SUBSTRING_INDEX(DOCUMENTO, '-', 1), 12, '0') AS NUMDOC_FORMATADO
          FROM VW_ORCAMENTO
          WHERE DATA_ENTRADA >= ? AND DATA_ENTRADA <= ?
          GROUP BY EMPRESA, DOCUMENTO
      ) T ON 
          T.EMPRESA = O.EMPRESA 
          AND T.DOCUMENTO = O.DOCUMENTO

      -- 3. Join com a FATGOR (Prioriza o registro faturado se existir)
      LEFT JOIN FATGOR G ON
          G.FGO_CODEMP = O.EMPRESA
          AND G.FGO_ESPDOC = 'OR'
          AND G.FGO_NUMDOC = T.NUMDOC_FORMATADO
          AND (G.FGO_JAFATU = 1 OR G.FGO_NUMFAT > 0 OR G.FGO_JAFATU = 0)

      WHERE O.DATA_ENTRADA >= ? AND O.DATA_ENTRADA <= ?
      ${vendedor ? 'AND O.COD_VENDEDOR = ?' : ''}
      
      GROUP BY O.DOCUMENTO, O.COD_PRODUTO
      ORDER BY O.DATA_ENTRADA DESC, O.HORA_ENTRADA DESC
    `;

    const sqlParams = [dtIni, dtFim, dtIni, dtFim];
    if (vendedor) sqlParams.push(vendedor);

    const [rows] = await pool.query(sql, sqlParams);

    const orcamentosAgrupados = {};

    rows.forEach((row) => {
      const chaveUnica = `${row.EMPRESA}-${row.ORCAMENTO}`;

      if (!orcamentosAgrupados[chaveUnica]) {
        orcamentosAgrupados[chaveUnica] = {
          ORCAMENTO: row.ORCAMENTO,
          PEDIDO: row.PEDIDO,
          NOTA_FISCAL: row.NOTA_FISCAL,
          DATA_ORCAMENTO: row.DATA_ORCAMENTO,
          HORA_ORCAMENTO: row.HORA_ORCAMENTO,
          COD_VENDEDOR: row.COD_VENDEDOR,
          VENDEDOR: row.VENDEDOR,
          CLIENTE: row.CLIENTE,
          EMPRESA: row.EMPRESA,
          VALOR_TOTAL_ORCAMENTO: row.VALOR_TOTAL_ORCAMENTO,
          DATA_BAIXA: row.DATA_BAIXA,
          MOTIVO_CANCELAMENTO: row.MOTIVO_CANCELAMENTO,
          PRODUTOS: []
        };
      }

      if (row.COD_PRODUTO) {
        orcamentosAgrupados[chaveUnica].PRODUTOS.push({
          COD_PRODUTO: row.COD_PRODUTO,
          PRODUTO: row.PRODUTO,
          QUANTIDADE: row.QUANTIDADE,
          PRECO_UNITARIO: row.PRECO_UNITARIO,
          CUSTO_UNITARIO: row.CUSTO_UNITARIO,
          MARKUP_PERCENTUAL: row.MARKUP_PERCENTUAL,
          MARCA: row.MARCA,
          UN: row.UN
        });
      }
    });

    res.json(Object.values(orcamentosAgrupados));

  } catch (error) {
    console.error('[CRM Handler Error]', error);
    res.status(500).json({ error: 'Erro interno ao buscar orçamentos no ERP' });
  }
};

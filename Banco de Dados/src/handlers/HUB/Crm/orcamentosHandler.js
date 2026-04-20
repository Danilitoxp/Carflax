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
          CASE 
              WHEN G.FGO_NUMFAT IS NOT NULL THEN 'Sim'
              ELSE 'Não'
          END AS PEDIDO,
          O.DATA_ENTRADA AS DATA_ORCAMENTO,
          O.HORA_ENTRADA AS HORA_ORCAMENTO,
          O.COD_VENDEDOR,
          O.VENDEDOR,
          O.CLIENTE,
          O.EMPRESA,
          O.COD_PRODUTO,
          O.PRODUTO,
          O.QTDITE,
          O.VALUNI,
          O.MARCA,
          O.UN,
          COALESCE(G.FGO_TOTPRO, T.VALOR_ORCAMENTO) AS VALOR_ORCAMENTO,
          COALESCE(DATE_FORMAT(O.DTABAI, '%Y-%m-%d'), 'SEM DATA') AS DATA_BAIXA,
          COALESCE(O.MOTCAN, 'SEM MOTIVO') AS MOTIVO_CANCELAMENTO
      FROM VW_ORCAMENTO O
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
      LEFT JOIN FATGOR G ON
          G.FGO_CODEMP = O.EMPRESA
          AND G.FGO_ESPDOC = 'OR'
          AND G.FGO_NUMDOC = T.NUMDOC_FORMATADO
      WHERE O.DATA_ENTRADA >= ? AND O.DATA_ENTRADA <= ?
      ${vendedor ? 'AND O.COD_VENDEDOR = ?' : ''}
      ORDER BY O.DATA_ENTRADA DESC
    `;

    // Os dois primeiros parametros são para a subquery T, os dois últimos para o WHERE principal (O)
    const sqlParams = [dtIni, dtFim, dtIni, dtFim];
    if (vendedor) sqlParams.push(vendedor);

    const [rows] = await pool.query(sql, sqlParams);

    // Objeto auxiliar para agrupar os orçamentos
    const orcamentosAgrupados = {};

    rows.forEach((row) => {
      // Cria uma chave única para cada orçamento (Empresa + Documento)
      const chaveUnica = `${row.EMPRESA}-${row.ORCAMENTO}`;

      // Se o orçamento ainda não existe no objeto, nós o criamos
      if (!orcamentosAgrupados[chaveUnica]) {
        orcamentosAgrupados[chaveUnica] = {
          ORCAMENTO: row.ORCAMENTO,
          PEDIDO: row.PEDIDO,
          DATA_ORCAMENTO: row.DATA_ORCAMENTO,
          HORA_ORCAMENTO: row.HORA_ORCAMENTO,
          COD_VENDEDOR: row.COD_VENDEDOR,
          VENDEDOR: row.VENDEDOR,
          CLIENTE: row.CLIENTE,
          EMPRESA: row.EMPRESA,
          VALOR_ORCAMENTO: row.VALOR_ORCAMENTO,
          DATA_BAIXA: row.DATA_BAIXA,
          MOTIVO_CANCELAMENTO: row.MOTIVO_CANCELAMENTO,
          PRODUTOS: [] // Array onde os itens serão inseridos
        };
      }

      // Adiciona o produto atual dentro do array PRODUTOS do orçamento correspondente
      if (row.COD_PRODUTO) {
        orcamentosAgrupados[chaveUnica].PRODUTOS.push({
          COD_PRODUTO: row.COD_PRODUTO,
          PRODUTO: row.PRODUTO,
          QTDITE: row.QTDITE,
          VALUNI: row.VALUNI,
          MARCA: row.MARCA,
          UN: row.UN
        });
      }
    });

    // Transforma o objeto auxiliar de volta em um Array puro e envia como JSON
    const resultadoFinal = Object.values(orcamentosAgrupados);
    res.json(resultadoFinal);

  } catch (error) {
    console.error('[CRM Handler Error]', error);
    res.status(500).json({ error: 'Erro interno ao buscar orçamentos no ERP' });
  }
};

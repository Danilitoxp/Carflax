// Orçamentos: lista com status, markup e criação via Citel API
const { mesAnoAtual, rangeFromMesAno } = require('../src/helpers');

// Lista de orçamentos do período
async function listarOrcamentos(req, res) {
  try {
    const pool = req.app.locals.pool;
    const mesano = String(req.query.mesano || mesAnoAtual()).replace(/\D/g, '').slice(0, 6);
    const { inicio, fim, vendedor, status } = req.query;

    let startDate, endDate;
    if (inicio && fim) {
      startDate = inicio;
      endDate = fim;
    } else {
      const range = rangeFromMesAno(mesano);
      startDate = range.ini;
      endDate = range.fim;
    }

    const sql = `
      SELECT
        O.DOCUMENTO                                           AS id,
        O.VENDEDOR                                            AS vendedor,
        O.CLIENTE                                             AS cliente,
        O.DATA_ENTRADA                                        AS data,
        O.HORA_ENTRADA                                        AS hora,
        UPPER(TRIM(O.STATUS_PEDIDO))                          AS status,
        COALESCE(SUM(O.QTDITE * O.VALUNI), 0)                AS valor_total,
        COALESCE(SUM(O.QTDITE * O.TOTCUS), 0)                AS custo_total,
        CASE
          WHEN SUM(O.QTDITE * O.TOTCUS) > 0
          THEN ROUND((SUM(O.QTDITE * O.VALUNI) / SUM(O.QTDITE * O.TOTCUS) - 1) * 100, 2)
          ELSE NULL
        END AS markup_pct
      FROM VW_ORCAMENTO O
      WHERE O.DATA_ENTRADA >= ? AND O.DATA_ENTRADA < ?
      ${vendedor ? 'AND O.VENDEDOR LIKE ?' : ''}
      ${status ? 'AND UPPER(TRIM(O.STATUS_PEDIDO)) = ?' : ''}
      GROUP BY O.DOCUMENTO, O.VENDEDOR, O.CLIENTE, O.DATA_ENTRADA, O.HORA_ENTRADA, O.STATUS_PEDIDO
      ORDER BY O.DATA_ENTRADA DESC, O.HORA_ENTRADA DESC
      LIMIT 500
    `;

    const params = [startDate, endDate];
    if (vendedor) params.push(`%${vendedor}%`);
    if (status) params.push(status.toUpperCase());

    const [rows] = await pool.query({ sql, timeout: 12000 }, params);
    return res.json({ mesano, startDate, endDate, count: rows.length, data: rows });
  } catch (err) {
    console.error('GET /api/orcamentos error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
}

// Itens de um orçamento específico
async function itensPorOrcamento(req, res) {
  try {
    const pool = req.app.locals.pool;
    const doc = req.params.id;
    if (!doc) return res.status(400).json({ error: 'ID do orçamento é obrigatório' });

    const sql = `
      SELECT
        O.CODITE   AS cod,
        O.DESITE   AS descricao,
        O.QTDITE   AS qtd,
        O.UNIDAD   AS unidade,
        O.VALUNI   AS preco_unitario,
        O.TOTCUS   AS custo_unitario,
        ROUND(O.QTDITE * O.VALUNI, 2) AS total
      FROM VW_ORCAMENTO O
      WHERE O.DOCUMENTO = ?
      ORDER BY O.SEQITE
    `;
    const [rows] = await pool.query({ sql, timeout: 6000 }, [doc]);
    return res.json({ id: doc, count: rows.length, itens: rows });
  } catch (err) {
    console.error('GET /api/orcamentos/:id/itens error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar itens do orçamento' });
  }
}

// Criação de orçamento via Citel API (ERP externo)
async function criarOrcamento(req, res) {
  try {
    const payload = req.body;
    const CODIGO_EMPRESA = payload.codigoEmpresa || '001';

    // Código do vendedor vem do token JWT — nunca do body (previne IDOR)
    const CODIGO_VENDEDOR = req.user?.cod_vendedor;
    if (!CODIGO_VENDEDOR) return res.status(403).json({ error: 'Vendedor não identificado no token' });

    if (!payload.cliente?.nome) return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    if (!payload.itens?.length) return res.status(400).json({ error: 'Adicione pelo menos um item' });

    const apiUrls = {
      '001': process.env.CITEL_API_URL_001,
      '002': process.env.CITEL_API_URL_002,
      '003': process.env.CITEL_API_URL_003,
    };
    const CITEL_API_URL  = apiUrls[CODIGO_EMPRESA] || process.env.CITEL_API_URL_001;
    const CITEL_API_USER = process.env.CITEL_API_USER;
    const CITEL_API_PASS = process.env.CITEL_API_PASS;

    const dataAtual = new Date().toISOString().split('T')[0];
    let totalProdutos = 0;

    const itensFormatados = payload.itens.map((item, i) => {
      const cod = item.idProdutoExterno || item.codigoProduto || item.codigo || item.id;
      if (!cod) throw new Error(`Item ${i + 1} sem código.`);
      const totalItem = parseFloat((item.quantidade * item.precoUnitario).toFixed(2));
      totalProdutos += totalItem;
      return { codigoProduto: String(cod), quantidade: item.quantidade, precoUnitario: item.precoUnitario, totalItem, numeroItem: i + 1 };
    });

    totalProdutos = parseFloat(totalProdutos.toFixed(2));
    const clienteId = payload.cliente.codigo && payload.cliente.codigo !== '0'
      ? String(payload.cliente.codigo)
      : String(payload.cliente.numeroDocumento || payload.cliente.cpfCnpj || '').replace(/\D/g, '');

    const condicao = payload.condicaoPagamento || payload.idPagamentoExterno || '001';
    const desconto = parseFloat((parseFloat(payload.descontoEspecial) || 0).toFixed(2));
    const valorFinal = parseFloat((totalProdutos - desconto).toFixed(2));

    const pedidoPayload = {
      codigoEmpresa: CODIGO_EMPRESA,
      especieDocumento: 'OR',
      cliente: clienteId,
      codigoVendedor: CODIGO_VENDEDOR,
      codigoDigitador: CODIGO_VENDEDOR,
      objCondicaoPagamento: { codigo: condicao },
      condicaoPagamento: condicao,
      dataPedido: dataAtual,
      totalProdutos,
      valorContabil: valorFinal,
      descontoEspecial: desconto,
      itens: itensFormatados,
      mensagem1: `App Carflax - Vend: ${CODIGO_VENDEDOR}${desconto > 0 ? ` | Desc: R$ ${desconto.toFixed(2)}` : ''}`,
      liberacaoComercial: false,
    };

    const fetch = (await import('node-fetch')).default;
    const auth = Buffer.from(`${CITEL_API_USER}:${CITEL_API_PASS}`).toString('base64');
    const response = await fetch(`${CITEL_API_URL}/pedidovenda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify(pedidoPayload),
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch (_) { result = { raw: text }; }

    if (!response.ok) return res.status(response.status).json({ success: false, error: result.message, details: result });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('POST /api/orcamentos error:', err.message);
    return res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
}

module.exports = { listarOrcamentos, itensPorOrcamento, criarOrcamento };

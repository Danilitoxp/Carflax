// CRM Analytics: distribuição de status, motivos de perda, top vendedores, funil
const { mesAnoAtual, rangeFromMesAno } = require('../src/helpers');

// Cache simples para evitar queries pesadas repetidas
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

module.exports = async function crm(req, res) {
  try {
    const pool = req.app.locals.pool;
    const mesano = String(req.query.mesano || mesAnoAtual()).replace(/\D/g, '').slice(0, 6);
    const inicio = req.query.inicio ? String(req.query.inicio).slice(0, 10) : null;
    const fim_q  = req.query.fim    ? String(req.query.fim).slice(0, 10)    : null;

    const { ini, fim } = rangeFromMesAno(mesano);
    const startDate = inicio || ini;
    const endDate   = fim_q  || fim;
    const cacheKey  = `${startDate}|${endDate}`;

    // Retorna cache se ainda fresco
    const cached = _cache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return res.json(cached.data);
    }

    const sql = `
      SELECT
        O.DOCUMENTO,
        O.VENDEDOR,
        O.CLIENTE,
        O.DATA_ENTRADA                              AS data,
        UPPER(TRIM(O.STATUS_PEDIDO))                AS status,
        O.MOTCAN                                    AS motivo_cancelamento,
        COALESCE(SUM(O.QTDITE * O.VALUNI), 0)       AS valor_total,
        COALESCE(SUM(O.QTDITE * O.TOTCUS), 0)       AS custo_total
      FROM VW_ORCAMENTO O
      WHERE O.DATA_ENTRADA >= ? AND O.DATA_ENTRADA < ?
      GROUP BY O.DOCUMENTO, O.VENDEDOR, O.CLIENTE, O.DATA_ENTRADA, O.STATUS_PEDIDO, O.MOTCAN
    `;

    const [rows] = await pool.query({ sql, timeout: 15000 }, [startDate, endDate]);

    // Agrega status
    const statusMap = {};
    const motivosMap = {};
    const vendedoresMap = {};
    let pipeline = 0, totalVendas = 0, somaTicket = 0, qtdVendas = 0;

    for (const r of rows) {
      const st = r.status || 'EMITIDO';
      statusMap[st] = (statusMap[st] || 0) + 1;

      const val = Number(r.valor_total || 0);
      pipeline += val;

      const isVenda = ['VENDA', 'BAIXADO_NAO_FATURADO', 'FATURADO'].includes(st);
      if (isVenda) {
        totalVendas++;
        somaTicket += val;
        qtdVendas++;
      }

      if (r.motivo_cancelamento) {
        const m = String(r.motivo_cancelamento).toUpperCase().trim();
        motivosMap[m] = (motivosMap[m] || 0) + 1;
      }

      if (r.vendedor) {
        const k = String(r.vendedor).trim();
        if (!vendedoresMap[k]) vendedoresMap[k] = { vendas: 0, total: 0, valor: 0 };
        vendedoresMap[k].total++;
        vendedoresMap[k].valor += val;
        if (isVenda) vendedoresMap[k].vendas++;
      }
    }

    const totalOrc = rows.length;
    const resultado = {
      mesano, startDate, endDate,
      totais: {
        orcamentos:      totalOrc,
        vendas:          totalVendas,
        pipeline:        Math.round(pipeline * 100) / 100,
        ticket_medio:    qtdVendas > 0 ? Math.round((somaTicket / qtdVendas) * 100) / 100 : 0,
        conversao_pct:   totalOrc > 0 ? Math.round((totalVendas / totalOrc) * 10000) / 100 : 0,
      },
      status_distribuicao: Object.entries(statusMap)
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor),
      motivos_perda: Object.entries(motivosMap)
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
      top_vendedores: Object.entries(vendedoresMap)
        .map(([nome, d]) => ({
          nome,
          vendas:        d.vendas,
          total_orc:     d.total,
          valor_total:   Math.round(d.valor * 100) / 100,
          taxa_conv_pct: d.total > 0 ? Math.round((d.vendas / d.total) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.valor_total - a.valor_total)
        .slice(0, 10),
    };

    _cache.set(cacheKey, { data: resultado, ts: Date.now() });
    return res.json(resultado);
  } catch (err) {
    console.error('GET /api/crm error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar dados do CRM' });
  }
};

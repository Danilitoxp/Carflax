// Campanhas: ranking de vendedores por marca/fornecedor e período
const { mesAnoAtual, rangeFromMesAno } = require('../src/helpers');

// Ranking geral: quem mais vendeu no mês (usado no widget de campanhas)
async function rankingGeral(req, res) {
  try {
    const pool = req.app.locals.pool;
    const mesano = String(req.query.mesano || mesAnoAtual()).replace(/\D/g, '').slice(0, 6);
    const { ini, fim } = rangeFromMesAno(mesano);

    const sql = `
      SELECT
        v.COD_VENDEDOR,
        MAX(v.NOME_VENDEDOR)                              AS nome,
        ROUND(SUM(CAST(v.TOTAL_VENDA AS DECIMAL(18,2))), 2) AS faturado,
        COUNT(DISTINCT v.DOCUMENTO)                       AS qtd_vendas
      FROM VW_FATURAMENTO_MES_ATUAL v
      WHERE v.DATA >= ? AND v.DATA < ?
      GROUP BY v.COD_VENDEDOR
      ORDER BY faturado DESC
      LIMIT 50
    `;
    const [rows] = await pool.query({ sql, timeout: 10000 }, [ini, fim]);
    return res.json({ mesano, count: rows.length, ranking: rows });
  } catch (err) {
    console.error('GET /api/campanhas/ranking error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
}

// Ranking por marca específica (campanha de um fornecedor/produto)
async function rankingPorMarca(req, res) {
  try {
    const pool = req.app.locals.pool;
    const mesano = String(req.query.mesano || mesAnoAtual()).replace(/\D/g, '').slice(0, 6);
    const marca = req.query.marca ? String(req.query.marca).trim() : null;
    const inicio = req.query.inicio ? String(req.query.inicio).slice(0, 10) : null;
    const fim_q  = req.query.fim    ? String(req.query.fim).slice(0, 10)    : null;

    const { ini, fim } = rangeFromMesAno(mesano);
    const startDate = inicio || ini;
    const endDate   = fim_q   || fim;

    if (!marca) return res.status(400).json({ error: 'Parâmetro "marca" é obrigatório' });

    const sql = `
      SELECT
        v.COD_VENDEDOR,
        MAX(v.NOME_VENDEDOR)                              AS nome,
        ROUND(SUM(CAST(v.TOTAL_VENDA AS DECIMAL(18,2))), 2) AS faturado,
        COUNT(DISTINCT v.DOCUMENTO)                       AS qtd_vendas
      FROM VW_FATURAMENTO v
      WHERE v.MARCA = ? AND v.DATA >= ? AND v.DATA < ?
      GROUP BY v.COD_VENDEDOR
      ORDER BY faturado DESC
      LIMIT 50
    `;
    const [rows] = await pool.query({ sql, timeout: 12000 }, [marca, startDate, endDate]);
    return res.json({ marca, startDate, endDate, count: rows.length, ranking: rows });
  } catch (err) {
    console.error('GET /api/campanhas/ranking/marca error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar ranking por marca' });
  }
}

// Lista de marcas disponíveis para filtrar campanhas
async function listaMarcas(req, res) {
  try {
    const pool = req.app.locals.pool;
    const q = req.query.q ? String(req.query.q).trim() : '';
    const sql = `
      SELECT DISTINCT MARCA AS marca
      FROM VW_POSICAO_ESTOQUE
      WHERE MARCA IS NOT NULL AND MARCA <> ''
      ${q ? 'AND MARCA LIKE ?' : ''}
      ORDER BY MARCA
      LIMIT 300
    `;
    const [rows] = await pool.query({ sql, timeout: 15000 }, q ? [`%${q}%`] : []);
    return res.json({ count: rows.length, marcas: rows.map((r) => r.marca) });
  } catch (err) {
    console.error('GET /api/campanhas/marcas error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar marcas' });
  }
}

module.exports = { rankingGeral, rankingPorMarca, listaMarcas };

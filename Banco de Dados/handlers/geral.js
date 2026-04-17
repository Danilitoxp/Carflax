// Métricas gerais do dashboard: faturamento, meta, vendedores, vendas do dia
const { mesAnoAtual } = require('../src/helpers');

module.exports = async function geral(req, res) {
  try {
    const pool = req.app.locals.pool;
    const mesano = String(req.query.mesano || mesAnoAtual()).replace(/\D/g, '').slice(0, 6);
    const dataHoje = req.query.data_hoje ? String(req.query.data_hoje).slice(0, 10) : null;

    // Métricas agregadas por vendedor: faturamento, meta, custo, vendas hoje, orçamentos
    const sql = `
      SELECT
        base.COD_VENDEDOR,
        base.NOME_VENDEDOR,
        COALESCE(meta.META, 0)               AS META,
        COALESCE(fat.FATURADO, 0)            AS FATURADO,
        COALESCE(custo.CUSTO_VENDA, 0)       AS CUSTO_VENDA,
        COALESCE(vend.QTD_VENDAS, 0)         AS QTD_VENDAS,
        COALESCE(vend.TICKET_MEDIO, 0)       AS TICKET_MEDIO,
        COALESCE(nf_aberto.EM_ABERTO, 0)     AS EM_ABERTO,
        COALESCE(orc.QTD_ORC, 0)             AS QTD_ORCAMENTOS,
        COALESCE(orc.ORC_FECHADOS, 0)        AS ORC_FECHADOS,
        COALESCE(hoje.VENDIDO_HOJE, 0)       AS VENDIDO_HOJE
      FROM (
        SELECT DISTINCT COD_VENDEDOR, NOME_VENDEDOR FROM VW_FATURAMENTO_MES_ATUAL
      ) base
      LEFT JOIN (
        SELECT MET_CODVEN AS COD_VENDEDOR, SUM(MET_TOTMET) AS META
        FROM CADMET WHERE MET_MESANO = ? GROUP BY MET_CODVEN
      ) meta ON meta.COD_VENDEDOR = base.COD_VENDEDOR
      LEFT JOIN (
        SELECT COD_VENDEDOR, SUM(TOTAL_VENDA) AS FATURADO
        FROM VW_FATURAMENTO_MES_ATUAL GROUP BY COD_VENDEDOR
      ) fat ON fat.COD_VENDEDOR = base.COD_VENDEDOR
      LEFT JOIN (
        SELECT COD_VENDEDOR, SUM(TOTAL_CUSTO) AS CUSTO_VENDA
        FROM VW_FATURAMENTO_MES_ATUAL GROUP BY COD_VENDEDOR
      ) custo ON custo.COD_VENDEDOR = base.COD_VENDEDOR
      LEFT JOIN (
        SELECT COD_VENDEDOR,
               COUNT(DISTINCT DOCUMENTO) AS QTD_VENDAS,
               ROUND(SUM(TOTAL_VENDA) / NULLIF(COUNT(DISTINCT DOCUMENTO), 0), 2) AS TICKET_MEDIO
        FROM VW_FATURAMENTO_MES_ATUAL GROUP BY COD_VENDEDOR
      ) vend ON vend.COD_VENDEDOR = base.COD_VENDEDOR
      LEFT JOIN (
        SELECT FGO_CODVEN AS COD_VENDEDOR, SUM(FGO_VLRCON) AS EM_ABERTO
        FROM FATGOR
        WHERE FGO_NUMFAT = '' AND FGO_MOTBAI IS NULL AND FGO_ESPDOC = 'PD'
        GROUP BY FGO_CODVEN
      ) nf_aberto ON nf_aberto.COD_VENDEDOR = base.COD_VENDEDOR
      LEFT JOIN (
        SELECT FGO_CODVEN AS COD_VENDEDOR,
               COUNT(*) AS QTD_ORC,
               SUM(CASE WHEN FGO_JAFATU = 1 AND FGO_MOTBAI IS NULL THEN 1 ELSE 0 END) AS ORC_FECHADOS
        FROM FATGOR WHERE FGO_ESPDOC = 'OR'
        GROUP BY FGO_CODVEN
      ) orc ON orc.COD_VENDEDOR = base.COD_VENDEDOR
      LEFT JOIN (
        SELECT FGO_CODVEN AS COD_VENDEDOR,
               SUM(COALESCE(FGO_VLRCON, 0)) AS VENDIDO_HOJE
        FROM FATGOR
        WHERE FGO_DTAENT = COALESCE(?, CURDATE())
          AND FGO_ESPDOC = 'PD'
        GROUP BY FGO_CODVEN
      ) hoje ON hoje.COD_VENDEDOR = base.COD_VENDEDOR
      ORDER BY base.COD_VENDEDOR
      LIMIT 100
    `;

    const [rows] = await pool.query({ sql, timeout: 10000 }, [mesano, dataHoje]);

    const vendedores = rows.map((r) => {
      const meta     = Number(r.META || 0);
      const faturado = Number(r.FATURADO || 0);
      const custo    = Number(r.CUSTO_VENDA || 0);
      const aberto   = Number(r.EM_ABERTO || 0);
      const total    = faturado + aberto;
      const qOrc     = Number(r.QTD_ORCAMENTOS || 0);
      const qFech    = Number(r.ORC_FECHADOS || 0);
      return {
        cod_vendedor:    r.COD_VENDEDOR,
        nome_vendedor:   r.NOME_VENDEDOR,
        meta,
        faturado,
        em_aberto:       aberto,
        total,
        custo,
        margem_pct:      faturado > 0 ? Math.round(((faturado - custo) / faturado) * 10000) / 100 : null,
        atingimento_pct: meta > 0 ? Math.round((faturado / meta) * 10000) / 100 : null,
        faltante:        Math.max(meta - total, 0),
        qtd_vendas:      Number(r.QTD_VENDAS || 0),
        ticket_medio:    Number(r.TICKET_MEDIO || 0),
        qtd_orcamentos:  qOrc,
        orc_fechados:    qFech,
        taxa_conversao:  qOrc > 0 ? Math.round((qFech / qOrc) * 10000) / 100 : null,
        vendido_hoje:    Number(r.VENDIDO_HOJE || 0),
      };
    });

    // Totais consolidados para os StatCards do dashboard
    const totais = vendedores.reduce(
      (acc, v) => {
        acc.faturado    += v.faturado;
        acc.meta        += v.meta;
        acc.em_aberto   += v.em_aberto;
        acc.custo       += v.custo;
        acc.qtd_vendas  += v.qtd_vendas;
        acc.vendido_hoje += v.vendido_hoje;
        return acc;
      },
      { faturado: 0, meta: 0, em_aberto: 0, custo: 0, qtd_vendas: 0, vendido_hoje: 0 }
    );

    totais.total         = totais.faturado + totais.em_aberto;
    totais.atingimento   = totais.meta > 0 ? Math.round((totais.faturado / totais.meta) * 10000) / 100 : null;
    totais.margem_pct    = totais.faturado > 0 ? Math.round(((totais.faturado - totais.custo) / totais.faturado) * 10000) / 100 : null;
    totais.ticket_medio  = totais.qtd_vendas > 0 ? Math.round((totais.faturado / totais.qtd_vendas) * 100) / 100 : 0;

    return res.json({ mesano, totais, vendedores });
  } catch (err) {
    console.error('GET /api/geral error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar dados gerais' });
  }
};

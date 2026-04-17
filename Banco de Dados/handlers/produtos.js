// Catálogo de produtos com estoque disponível e preços
module.exports = async function produtos(req, res) {
  try {
    const pool = req.app.locals.pool;
    const { search, empresa, codigo } = req.query;

    // Busca por código único
    if (codigo) {
      const sql = `
        SELECT
          i.ITE_CODITE          AS cod,
          i.ITE_DESITE          AS descricao,
          MAX(g.ITE_LOCFIS)     AS localizacao,
          MAX(e.PRECO_VENDA)    AS preco_venda,
          MAX(i.ITE_PRECUS)     AS preco_custo,
          (SUM(g.ITE_SALDOS) - SUM(COALESCE(g.ITE_QTPD_V, 0))) AS estoque,
          MAX(i.ITE_CODBAR)     AS codbar
        FROM CADITE i
        INNER JOIN ITEGER g ON g.ITE_CODITE = i.ITE_CODITE
        LEFT JOIN VW_POSICAO_ESTOQUE e ON e.COD_PRODUTO = i.ITE_CODITE
        WHERE i.ITE_CODITE = ?
        GROUP BY i.ITE_CODITE, i.ITE_DESITE
        LIMIT 1
      `;
      const [rows] = await pool.query(sql, [codigo]);
      if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
      return res.json(rows[0]);
    }

    // Lista de produtos com filtros opcionais
    let sql = `
      SELECT
        a.ITE_CODITE                                    AS cod,
        a.ITE_CODBAR                                    AS codbar,
        a.ITE_DESITE                                    AS descricao,
        p.MARCA                                         AS marca,
        MAX(b.ITE_LOCFIS)                               AS localizacao,
        MAX(e.PRECO_VENDA)                              AS preco_venda,
        MAX(a.ITE_PRECUS)                               AS preco_custo,
        SUM(b.ITE_SALDOS)                               AS estoque_fisico,
        (SUM(b.ITE_SALDOS) - SUM(COALESCE(b.ITE_QTPD_V, 0))) AS estoque_disponivel,
        SUM(COALESCE(b.ITE_QTPD_V, 0))                 AS estoque_reserva
      FROM CADITE a
      INNER JOIN ITEGER b ON a.ITE_CODITE = b.ITE_CODITE
      LEFT JOIN VW_CAD_PRODUTO p ON a.ITE_CODITE = p.CODIGO
      LEFT JOIN VW_POSICAO_ESTOQUE e ON e.COD_PRODUTO = a.ITE_CODITE
      WHERE 1=1
    `;
    const params = [];

    if (empresa) {
      sql += ' AND b.ITE_EMPRES = ?';
      params.push(empresa);
    }

    if (search) {
      const termo = search.trim().toUpperCase();
      if (/^\d+$/.test(termo)) {
        sql += ' AND (a.ITE_CODITE = ? OR a.ITE_CODBAR = ?)';
        params.push(termo, termo);
      } else {
        sql += ' AND a.ITE_DESITE LIKE ?';
        params.push(`%${termo}%`);
      }
    }

    sql += `
      GROUP BY a.ITE_CODITE, a.ITE_CODBAR, a.ITE_DESITE, p.MARCA
      ORDER BY a.ITE_CODITE
      LIMIT 500
    `;

    const [rows] = await pool.query(sql, params);
    return res.json({ count: rows.length, data: rows });
  } catch (err) {
    console.error('GET /api/produtos error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

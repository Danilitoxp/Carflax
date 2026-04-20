exports.obterProdutos = async (req, res) => {
    const pool = req.app.locals.pool;
    const { codigo } = req.query;

    try {
        let sql = `
      SELECT 
          I.ITE_CODITE AS "COD_ITEM",
          C.ITE_DESITE AS "DESCRICAO",
          M.MAR_DESMAR AS "MARCA",
          88.86 AS "VALOR_CREDITO", -- Atenção: Valor mantido fixo conforme a query original
          CONCAT(ROUND(((MAX(I.ITE_PREVE1) - 88.86) / MAX(I.ITE_PREVE1)) * 100, 2), '%') AS "VALOR_DEBITO",
          ROUND(MAX(I.ITE_PREVE1), 2) AS "PRECO_VENDA",
          ROUND(SUM(I.ITE_SALDOS - (COALESCE(I.ITE_QTPD_V,0) + COALESCE(I.ITE_QTPD_F,0) + COALESCE(I.ITE_QTPD_P,0) + COALESCE(I.ITE_QTPD_E,0))), 2) AS "TOTAL_DISPONIVEL",
          C.ITE_ULTALT AS "ULT_ALT"
      FROM 
          ITEGER I
      INNER JOIN 
          CADITE C ON I.ITE_CODITE = C.ITE_CODITE
      LEFT JOIN 
          CADMAR M ON C.ITE_CODMAR = M.MAR_CODMAR
    `;

        const sqlParams = [];

        // Se um código de produto for enviado na URL, aplica o filtro WHERE
        if (codigo) {
            sql += ` WHERE I.ITE_CODITE = ?`;
            sqlParams.push(codigo);
        }

        sql += `
      GROUP BY 
          I.ITE_CODITE, 
          C.ITE_DESITE, 
          M.MAR_DESMAR, 
          C.ITE_ULTALT
    `;

        const [rows] = await pool.query(sql, sqlParams);

        res.json(rows);
    } catch (error) {
        console.error('[Dashboard Produtos Error]', error);
        res.status(500).json({ error: 'Erro interno ao buscar dados de produtos' });
    }
};
// Clientes: busca e prospecção
module.exports = async function clientes(req, res) {
  try {
    const pool = req.app.locals.pool;
    const { search, limit, offset, prospeccao } = req.query;
    const lim = parseInt(limit) || 500;
    const off = parseInt(offset) || 0;

    // Modo prospecção: clientes inativos com potencial de reativação
    if (prospeccao === 'true' || prospeccao === '1') {
      const sql = `
        SELECT
          COD_CLIENTE,
          RAZAO_SOCIAL,
          TELEFONE,
          CELULAR,
          ULT_COMPRA,
          TOTAL_CLIENTE,
          ULT_VENDEDOR
        FROM VW_CAD_CLIENTE
        WHERE TIPO_CLIENTE = 'JURIDICA'
          AND ULT_COMPRA < CURRENT_DATE - INTERVAL 3 MONTH
          AND TOTAL_CLIENTE >= 8000
        ORDER BY TOTAL_CLIENTE DESC
        LIMIT 200
      `;
      const [rows] = await pool.query(sql);
      return res.json({ count: rows.length, data: rows });
    }

    // Busca padrão
    let sql = `
      SELECT
        c.CLI_CODCLI  AS codigo,
        c.CLI_NOMCLI  AS nome,
        c.CLI_C_G_C_  AS documento,
        c.CLI_ENDERE  AS logradouro,
        c.CLI_ENDNUM  AS numero,
        c.CLI_BAIRRO  AS bairro,
        cid.CID_NOMCID AS cidade,
        cid.CID_ESTADO AS estado,
        c.CLI_C_E_P_  AS cep,
        c.CLI_FONE01  AS telefone,
        c.CLI_EMAIL_  AS email,
        c.CLI_STATUS  AS status
      FROM CADCLI c
      LEFT JOIN CADCID cid ON cid.CID_CODCID = c.CLI_CODCID
    `;
    const params = [];

    if (search) {
      sql += ' WHERE c.CLI_NOMCLI LIKE ? OR c.CLI_CODCLI LIKE ? OR c.CLI_EMAIL_ LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      sql += ' ORDER BY c.CLI_NOMCLI LIMIT ? OFFSET ?';
    } else {
      sql += ' ORDER BY c.CLI_NOMCLI LIMIT ? OFFSET ?';
    }
    params.push(lim, off);

    const [rows] = await pool.query(sql, params);
    return res.json({ count: rows.length, data: rows });
  } catch (err) {
    console.error('GET /api/clientes error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

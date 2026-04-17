// Entregas: romaneios do dia e consulta por NF
module.exports = async function entregas(req, res) {
  try {
    const pool = req.app.locals.pool;
    const { nf, data, motorista } = req.query;

    // Busca romaneio específico por NF
    if (nf) {
      const nfNum = parseInt(String(nf).replace(/\D/g, ''), 10);
      const [rows] = await pool.query(
        `SELECT
           GER_NUMDOC AS nf,
           GER_NOMCLI AS cliente,
           GER_ENDCON AS endereco,
           GER_BAIRRO AS bairro,
           GER_NOMCID AS cidade,
           GER_CEPCON AS cep,
           GER_DTENTR AS data_entrega
         FROM VW_ROMANEIOS
         WHERE CAST(SUBSTRING_INDEX(GER_NUMDOC, '-', 1) AS UNSIGNED) = ?
         LIMIT 1`,
        [nfNum]
      );
      if (!rows.length) return res.status(404).json({ error: 'NF não encontrada' });
      return res.json(rows[0]);
    }

    // Lista de entregas (hoje por padrão, ou data específica)
    const dataFiltro = data ? String(data).slice(0, 10) : null;

    const sql = `
      SELECT
        GER_NUMDOC  AS nf,
        GER_NOMCLI  AS cliente,
        GER_ENDCON  AS endereco,
        GER_BAIRRO  AS bairro,
        GER_NOMCID  AS cidade,
        GER_CEPCON  AS cep,
        GER_DTENTR  AS data_entrega
      FROM VW_ROMANEIOS
      WHERE ${dataFiltro ? 'DATE(GER_DTENTR) = ?' : 'DATE(GER_DTENTR) = CURDATE()'}
      ${motorista ? 'AND GER_CODMOT = ?' : ''}
      ORDER BY GER_NUMDOC
      LIMIT 200
    `;

    const params = [];
    if (dataFiltro) params.push(dataFiltro);
    if (motorista) params.push(motorista);

    const [rows] = await pool.query({ sql, timeout: 8000 }, params);
    return res.json({ data: dataFiltro || 'hoje', count: rows.length, entregas: rows });
  } catch (err) {
    console.error('GET /api/entregas error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar entregas' });
  }
};

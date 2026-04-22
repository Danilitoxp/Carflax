async function getClientesFrv(req, res) {
  const pool = req.app.locals.pool;

  const query = `
    SELECT
        F.FGO_CODCLI AS cliente_id,
        C.CLI_NOMCLI AS nome_cliente,
        MAX(F.FGO_DTAENT) AS ultima_compra,
        DATEDIFF(CURDATE(), MAX(F.FGO_DTAENT)) AS recencia_dias,
        COUNT(DISTINCT F.FGO_NUMDOC) AS frequencia,
        SUM(COALESCE(F.FGO_TOTPRO, 0)) AS valor_total
    FROM FATGOR F
    LEFT JOIN CADCLI C
        ON C.CLI_CODCLI = F.FGO_CODCLI
    WHERE F.FGO_DTAENT IS NOT NULL
      AND C.CLI_NOMCLI IS NOT NULL
      AND C.CLI_NOMCLI NOT LIKE '%CONSUMIDOR%'
    GROUP BY
        F.FGO_CODCLI,
        C.CLI_NOMCLI
    ORDER BY valor_total DESC;
  `;

  try {
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[ERROR] Falha ao buscar clientes FRV:', error);
    res.status(500).json({ error: 'Erro interno ao processar análise FRV' });
  }
}

module.exports = { getClientesFrv };

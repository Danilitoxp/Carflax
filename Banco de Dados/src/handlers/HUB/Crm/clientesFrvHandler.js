/**
 * HANDLER: Crm / Clientes FRV (VERSÃO FINAL CORRIGIDA)
 */

exports.listarClientesFRV = async (req, res) => {
  const { vendedor } = req.query;
  const pool = req.app.locals.pool;

  try {
    const sql = `
      SELECT 
        C.CLI_CODCLI as id,
        C.CLI_NOMCLI as name,
        C.CLI_CODVEN as vendedor_cod,
        C.CLI_CODSIT as status_cod,
        COALESCE(F.FIS_RFRVAL, 0) as saldoTotal
      FROM CADCLI C
      LEFT JOIN CADFIS F ON F.FIS_FORCLI = C.CLI_CODCLI
      WHERE 1=1
      ${vendedor ? 'AND C.CLI_CODVEN = ?' : ''}
      LIMIT 100
    `;

    const params = [];
    if (vendedor) params.push(vendedor);

    const [rows] = await pool.query(sql, params);

    const data = rows.map(r => ({
      id: r.id,
      name: r.name,
      vendedor: `Vendedor ${r.vendedor_cod}`,
      saldoTotal: parseFloat(r.saldoTotal) || 0,
      saldoLiberado: parseFloat(r.saldoTotal) || 0,
      saldoBloqueado: 0,
      status: r.status_cod === 'A' || r.status_cod === '1' ? 'Ativo' : 'Inativo',
      classificacao: parseFloat(r.saldoTotal) > 10000 ? 'Vip' : 'Standard'
    }));

    res.json(data);
  } catch (error) {
    console.error('[Clientes FRV Handler Error]', error);
    res.status(500).json({ error: 'Erro ao buscar dados no ERP' });
  }
};

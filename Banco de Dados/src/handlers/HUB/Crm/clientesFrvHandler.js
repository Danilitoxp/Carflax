/**
 * HANDLER: Crm / Clientes FRV
 * Busca saldos e informações de Fundo de Reserva de Valor
 */

exports.listarClientesFRV = async (req, res) => {
  const { vendedor } = req.query;
  const pool = req.app.locals.pool;

  try {
    // Query que une o cadastro de clientes com informações de saldo FRV
    // Usando VW_CAD_CLIENTE como base para garantir dados limpos
    const sql = `
      SELECT 
        C.COD_CLIENTE as id,
        C.RAZAO_SOCIAL as name,
        C.VENDEDOR as vendedor,
        C.ATIVIDADE as atividade,
        COALESCE(F.FIS_RFRVAL, 0) as saldoTotal,
        -- Como não temos clareza das tabelas de bloqueio, vamos simular por enquanto
        -- ou buscar de tabelas auxiliares se existirem
        0 as saldoBloqueado,
        COALESCE(F.FIS_RFRVAL, 0) as saldoLiberado,
        C.CLIENTE_ATIVO as status
      FROM VW_CAD_CLIENTE C
      LEFT JOIN CADFIS F ON F.FIS_FORCLI = C.COD_CLIENTE
      WHERE 1=1
      ${vendedor ? 'AND C.COD_VENDEDOR = ?' : ''}
      ORDER BY F.FIS_RFRVAL DESC, C.RAZAO_SOCIAL ASC
      LIMIT 200
    `;

    const params = [];
    if (vendedor) params.push(vendedor);

    const [rows] = await pool.query(sql, params);

    // Mapeamento para o formato esperado pelo frontend
    const data = rows.map(r => ({
      ...r,
      saldoTotal: parseFloat(r.saldoTotal) || 0,
      saldoLiberado: parseFloat(r.saldoLiberado) || 0,
      saldoBloqueado: parseFloat(r.saldoBloqueado) || 0,
      status: r.status === 'S' ? 'Ativo' : 'Inativo',
      classificacao: r.saldoTotal > 50000 ? 'Vip' : r.saldoTotal > 10000 ? 'Gold' : 'Standard'
    }));

    res.json(data);
  } catch (error) {
    console.error('[Clientes FRV Handler Error]', error);
    res.status(500).json({ error: 'Erro ao buscar dados de FRV no ERP' });
  }
};

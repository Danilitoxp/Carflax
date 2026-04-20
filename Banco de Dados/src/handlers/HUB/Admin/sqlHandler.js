/**
 * HANDLER: Admin SQL Runner
 * EXECUTA COMANDOS SQL DIRETAMENTE NO BANCO (USAR COM CAUTELA)
 */
exports.executarSQL = async (req, res) => {
    const pool = req.app.locals.pool;
    const { query, secret } = req.body;

    // Proteção básica por secret no body (opcional mas recomendado)
    const ADMIN_SECRET = process.env.ADMIN_SQL_SECRET || 'carflax_admin_2026';
    if (secret !== ADMIN_SECRET) {
        return res.status(403).json({ success: false, error: 'Acesso negado: Secret inválido.' });
    }

    if (!query) {
        return res.status(400).json({ success: false, error: 'Query não informada.' });
    }

    try {
        console.log(`[SQL RUNNER] Executando: ${query.substring(0, 100)}...`);
        const [rows] = await pool.query(query);
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[SQL Runner Error]', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            sqlState: error.sqlState,
            code: error.code
        });
    }
};

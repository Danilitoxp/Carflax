/**
 * HANDLER: Admin SQL Runner
 * EXECUTA COMANDOS SQL DIRETAMENTE NO BANCO (USAR COM CAUTELA)
 */
exports.executarSQL = async (req, res) => {
    const pool = req.app.locals.pool;
    let { query, secret } = req.body;

    // Proteção básica por secret no body (opcional mas recomendado)
    const ADMIN_SECRET = process.env.ADMIN_SQL_SECRET || 'carflax_admin_2026';
    if (secret !== ADMIN_SECRET) {
        return res.status(403).json({ success: false, error: 'Acesso negado: Secret inválido.' });
    }

    if (!query) {
        return res.status(400).json({ success: false, error: 'Query não informada.' });
    }

    // LIMIT AUTOMÁTICO PARA EVITAR TRAVAMENTOS (IGUAL AO SQLYOG)
    let cleanQuery = query.trim();
    if (cleanQuery.endsWith(';')) {
        cleanQuery = cleanQuery.slice(0, -1).trim();
    }

    const upperQuery = cleanQuery.toUpperCase();
    if (upperQuery.startsWith('SELECT') && !upperQuery.includes('LIMIT')) {
        query = `${cleanQuery} LIMIT 500`;
    }

    try {
        console.log(`[SQL RUNNER] Executando: ${query.substring(0, 100)}...`);
        const [rows] = await pool.query(query);
        
        // Se for um SELECT, rows será um array. Se for INSERT/UPDATE/DELETE, será um objeto de info.
        const data = Array.isArray(rows) ? rows : [rows];
        
        res.json({ success: true, data });
    } catch (err) {
        console.error(`[SQL Runner Error]`, err);
        // Retornar a mensagem técnica do MySQL para o usuário
        res.status(200).json({ 
            success: false, 
            error: err.sqlMessage || err.message || 'Erro desconhecido na execução do SQL' 
        });
    }
};

exports.listarSchema = async (req, res) => {
    const pool = req.app.locals.pool;
    try {
        const [items] = await pool.query('SHOW FULL TABLES');
        const dbName = process.env.DB_NAME;
        
        // Items vem como [ { Tables_in_db: 'name', Table_type: 'BASE TABLE' }, ... ]
        const list = items.map(t => {
            const keys = Object.keys(t);
            return {
                name: t[keys[0]],
                type: t[keys[1]] === 'VIEW' ? 'view' : 'table'
            };
        });

        res.json({ 
            success: true, 
            dbName, 
            tables: list.filter(i => i.type === 'table'),
            views: list.filter(i => i.type === 'view')
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

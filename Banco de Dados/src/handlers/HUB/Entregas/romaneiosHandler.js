/**
 * HANDLER: Entregas / Romaneios (Hoje)
 */
exports.listarRomaneiosHoje = async (req, res) => {
    const pool = req.app.locals.pool;

    try {
        const sql = `
            SELECT
                GER_NUMDOC AS NF,
                GER_NOMCLI AS CLIENTE,
                GER_ENDCON AS ENDERECO,
                GER_BAIRRO AS BAIRRO,
                GER_NOMCID AS CIDADE,
                GER_CEPCON AS CEP,
                GER_DTENTR AS DATA_ENTREGA
            FROM VW_ROMANEIOS
            WHERE DATE(GER_DTENTR) = CURDATE()
            ORDER BY GER_NUMDOC;
        `;

        const [rows] = await pool.query(sql);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('[Romaneios Handler Error]', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar romaneios de hoje' });
    }
};

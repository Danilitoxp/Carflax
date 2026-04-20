/**
 * Busca detalhes de uma entrega específica (NF) e motoristas.
 */
exports.obterDetalhesEntrega = async (req, res) => {
    const pool = req.app.locals.pool;
    const { nf } = req.params;

    try {
        // 1. Buscar Motoristas (CADMOT)
        const [motoristas] = await pool.query('SELECT MOT_CODMOT AS COD, MOT_NOMMOT AS NOME FROM CADMOT ORDER BY MOT_NOMMOT');

        if (!nf) {
            return res.json({ success: true, motoristas });
        }

        const nfNumero = parseInt(String(nf).replace(/\D/g, ''), 10);

        const [resultado] = await pool.query(`
            SELECT
                GER_NUMDOC AS NF,
                GER_NOMCLI AS CLIENTE,
                GER_ENDCON AS ENDERECO,
                GER_BAIRRO AS BAIRRO,
                GER_NOMCID AS CIDADE,
                GER_CEPCON AS CEP,
                GER_DTENTR AS DATA_ENTREGA
            FROM VW_ROMANEIOS
            WHERE CAST(SUBSTRING_INDEX(GER_NUMDOC, '-', 1) AS UNSIGNED) = ?
            LIMIT 1
        `, [nfNumero]);

        if (resultado.length === 0) {
            return res.json({ success: true, motoristas, data: null });
        }

        const entrega = resultado[0];

        // 2. ViaCEP usando fetch nativo
        if (entrega.CEP) {
            try {
                const cepLimpo = String(entrega.CEP).replace(/\D/g, '');
                if (cepLimpo.length === 8) {
                    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                    if (response.ok) {
                        const data = await response.json();
                        if (!data.error) {
                            entrega.CIDADE_VERIFICADA = data.localidade;
                            entrega.UF_VERIFICADA = data.uf;
                        }
                    }
                }
            } catch (cepErr) {
                // Silencioso
            }
        }

        res.json({
            success: true,
            motoristas,
            data: entrega
        });
    } catch (error) {
        console.error('[Entregas Details Handler Error]', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar detalhes da entrega' });
    }
};

exports.obterDadosGerais = async (req, res) => {
    const pool = req.app.locals.pool;
    const { vendedor, data } = req.query;

    // Lógica de datas robusta contra fuso horário
    let dataRef;
    if (data) {
        // Se a data vier como YYYY-MM-DD, forçamos o horário local 00:00 para evitar recuo de fuso
        dataRef = new Date(`${data}T00:00:00`);
        // Caso a data acima seja inválida (ex: formato diferente), tentamos o fallback
        if (isNaN(dataRef.getTime())) dataRef = new Date(data);
    } else {
        dataRef = new Date();
    }

    const ano = dataRef.getFullYear();
    const mes = String(dataRef.getMonth() + 1).padStart(2, '0');
    const dia = String(dataRef.getDate()).padStart(2, '0');

    const dataHoje = `${ano}-${mes}-${dia}`; // Ex: 2026-04-20
    const mesAno = `${mes}${ano}`; // Ex: 042026
    const primeiroDiaMesStr = `${ano}${mes}01`; // Ex: 20260401
    const primeiroDiaMesHifen = `${ano}-${mes}-01`; // Ex: 2026-04-01

    // Lógica para primeiro dia do próximo mês
    const proxMes = dataRef.getMonth() + 1;
    const anoProxMes = proxMes > 11 ? ano + 1 : ano;
    const mesProxMesStr = String((proxMes % 12) + 1).padStart(2, '0');
    const primeiroDiaProxMesHifen = `${anoProxMes}-${mesProxMesStr}-01`; // Ex: 2026-05-01

    try {
        const sql = `
      SELECT
          meta.COD_VENDEDOR,
          fat_base.NOME_VENDEDOR,
          meta.META,
          COALESCE(fat_base.FATURADO, 0) AS FATURADO,
          COALESCE(nf_fatgor.NF_FATGOR, 0) AS EM_ABERTO,
          COALESCE(fat_base.FATURADO, 0) + COALESCE(nf_fatgor.NF_FATGOR, 0) AS TOTAL,
          GREATEST(
              meta.META - (
                  COALESCE(fat_base.FATURADO, 0) + COALESCE(nf_fatgor.NF_FATGOR, 0)
              ),
              0
          ) AS FALTANTE,
          COALESCE(fat_base.CUSTO, 0) AS CUSTO,
          COALESCE(fat_base.FATURADO, 0) - COALESCE(fat_base.CUSTO, 0) AS MARGEM_REAL,
          ROUND(
              (
                  (COALESCE(fat_base.FATURADO, 0) - COALESCE(fat_base.CUSTO, 0))
                  / NULLIF(COALESCE(fat_base.FATURADO, 0), 0)
              ) * 100,
              2
          ) AS MARGEM_REAL_PERC,
          COALESCE(fat_base.QTD_VENDAS, 0) AS QTD_VENDAS,
          COALESCE(fat_base.TICKET_MEDIO, 0) AS TICKET_MEDIO,
          COALESCE(nf_fatgor.CUSTO_EM_ABERTO, 0) AS CUSTO_EM_ABERTO,
          COALESCE(orc.QTDORC, 0) AS QTD_ORCAMENTOS,
          COALESCE(orc.ORCFAT, 0) AS ORC_FECHADOS,
          COALESCE(fat_base.PRAZO_MEDIO_DIAS, 0) AS PRAZO_MEDIO_DIAS,
          COALESCE(fat_base.PRAZO_MEDIO_DIAS_HOJE, 0) AS PRAZO_MEDIO_DIAS_HOJE,
          COALESCE(vendas_hoje.VENDEU_HOJE, 0) AS TOTAL_VENDIDO_HOJE
      FROM(
          SELECT
              TRIM(MET_CODVEN) AS COD_VENDEDOR,
              SUM(MET_TOTMET) AS META
          FROM CADMET
          WHERE MET_MESANO = ?
          ${vendedor ? 'AND TRIM(MET_CODVEN) = ?' : ''}
          GROUP BY TRIM(MET_CODVEN)
          HAVING SUM(MET_TOTMET) > 0
      ) meta
      LEFT JOIN(
          SELECT
              TRIM(COD_VENDEDOR) AS COD_VENDEDOR,
              MAX(NOME_VENDEDOR) AS NOME_VENDEDOR,
              SUM(TOTAL_VENDA) AS FATURADO,
              SUM(TOTAL_CUSTO) AS CUSTO,
              COUNT(DISTINCT DOCUMENTO) AS QTD_VENDAS,
              ROUND(SUM(TOTAL_VENDA) / NULLIF(COUNT(DISTINCT DOCUMENTO), 0), 2) AS TICKET_MEDIO,
              ROUND(
                  SUM(COALESCE(PRAZO_MEDIO, 0) * TOTAL_VENDA) / NULLIF(SUM(TOTAL_VENDA), 0),
                  2
              ) AS PRAZO_MEDIO_DIAS,
              ROUND(
                  SUM(
                      CASE
                          WHEN DATE(DATA) = ? THEN COALESCE(PRAZO_MEDIO, 0) * TOTAL_VENDA
                          ELSE 0
                      END
                  ) / NULLIF(
                      SUM(
                          CASE
                              WHEN DATE(DATA) = ? THEN TOTAL_VENDA
                              ELSE 0
                          END
                      ),
                      0
                  ),
                  2
              ) AS PRAZO_MEDIO_DIAS_HOJE
          FROM VW_FATURAMENTO_MES_ATUAL
          GROUP BY TRIM(COD_VENDEDOR)
      ) fat_base ON fat_base.COD_VENDEDOR = meta.COD_VENDEDOR
      LEFT JOIN(
          SELECT
              TRIM(FGO_CODVEN) AS COD_VENDEDOR,
              SUM(FGO_VLRCON) AS NF_FATGOR,
              SUM(FGO_TOTCUS) AS CUSTO_EM_ABERTO
          FROM FATGOR
          WHERE FGO_ESPDOC = 'PD'
            AND FGO_NUMFAT = ''
            AND FGO_MOTBAI IS NULL
          GROUP BY TRIM(FGO_CODVEN)
      ) nf_fatgor ON nf_fatgor.COD_VENDEDOR = meta.COD_VENDEDOR
      LEFT JOIN(
          SELECT
              TRIM(A.FGO_CODVEN) AS COD_VENDEDOR,
              SUM(
                  CASE
                      WHEN (
                          (A.FGO_MOTBAI NOT LIKE '%TOMADA DE PRECO%'
                          AND A.FGO_MOTBAI NOT LIKE '%TOMADA DE PREÇO%')
                          OR A.FGO_MOTBAI IS NULL
                      ) THEN 1 ELSE 0
                  END
              ) AS QTDORC,
              SUM(
                  CASE
                      WHEN A.FGO_JAFATU = 1
                      AND A.FGO_MOTBAI IS NULL
                      THEN 1 ELSE 0
                  END
              ) AS ORCFAT
          FROM FATGOR A
          WHERE A.FGO_ESPDOC = 'OR'
            AND A.FGO_DTAENT >= ?
          GROUP BY TRIM(A.FGO_CODVEN)
      ) orc ON orc.COD_VENDEDOR = meta.COD_VENDEDOR
      LEFT JOIN(
          SELECT
              TRIM(f1.FGO_CODVEN) AS COD_VENDEDOR,
              SUM(
                  CASE
                      WHEN f1.FGO_ESPDOC = 'PD'
                      AND f1.FGO_NUMFAT = ''
                      AND f1.FGO_MOTBAI IS NULL
                      THEN COALESCE(f1.FGO_VLRCON, 0)
                      ELSE 0
                  END
              ) +
              SUM(
                  CASE
                      WHEN f1.FGO_ESPDOC = 'PD'
                      AND f1.FGO_NUMFAT <> ''
                      AND NOT EXISTS(
                          SELECT 1
                          FROM FATGOR f2
                          WHERE f2.FGO_NUMDOC = f1.FGO_NUMFAT
                            AND TRIM(f2.FGO_CODVEN) = TRIM(f1.FGO_CODVEN)
                            AND f2.FGO_ESPDOC = 'PD'
                            AND DATE(f2.FGO_DTAORI) >= ?
                            AND DATE(f2.FGO_DTAORI) < ?
                      )
                      THEN COALESCE(f1.FGO_VLRCON, 0)
                      ELSE 0
                  END
              ) AS VENDEU_HOJE
          FROM FATGOR f1
          WHERE DATE(f1.FGO_DTAORI) = ?
          GROUP BY TRIM(f1.FGO_CODVEN)
      ) vendas_hoje ON vendas_hoje.COD_VENDEDOR = meta.COD_VENDEDOR
      ORDER BY meta.COD_VENDEDOR, fat_base.NOME_VENDEDOR
      LIMIT 200;
    `;

        const sqlParams = [mesAno];
        if (vendedor) sqlParams.push(vendedor);

        sqlParams.push(dataHoje, dataHoje);
        sqlParams.push(primeiroDiaMesStr);
        sqlParams.push(primeiroDiaMesHifen, primeiroDiaProxMesHifen, dataHoje);


        const [rows] = await pool.query(sql, sqlParams);
        res.json(rows);
    } catch (error) {
        console.error('[Dashboard Geral Error]', error);
        res.status(500).json({ error: 'Erro interno ao buscar dados do dashboard geral' });
    }
};
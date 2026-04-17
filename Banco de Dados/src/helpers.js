function mesAnoAtual() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}${yyyy}`;
}

function rangeFromMesAno(MESANO) {
  const mm = Number(MESANO.slice(0, 2));
  const yyyy = Number(MESANO.slice(2));
  const ini = new Date(yyyy, mm - 1, 1);
  const fim = new Date(yyyy, mm, 1);
  const toISO = (d) => d.toISOString().slice(0, 10);
  return { ini: toISO(ini), fim: toISO(fim) };
}

// Normaliza código de vendedor para 3 dígitos
function norm(v) {
  return String(v == null ? '' : v).padStart(3, '0').slice(-3);
}

// Retry para queries com falha intermitente
async function queryWithRetry(pool, queryConfig, params = [], attempts = 2, baseDelayMs = 500) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const [rows] = await pool.query(queryConfig, params);
      return rows;
    } catch (err) {
      const msg = err && err.message ? String(err.message).toLowerCase() : '';
      if (attempt === attempts) throw err;
      if (/inactivity|timeout|packet/i.test(msg)) {
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  return [];
}

module.exports = { mesAnoAtual, rangeFromMesAno, norm, queryWithRetry };

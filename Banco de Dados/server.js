require('dotenv').config();

// Valida variáveis obrigatórias antes de subir
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'JWT_SECRET'];
const missing = requiredEnv.filter((k) => process.env[k] === undefined);
if (missing.length) {
  console.error('[ERROR] Variáveis de ambiente ausentes no processo:', missing.join(', '));
  console.error('Certifique-se de que o arquivo .env contenha essas chaves.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { getPool } = require('./src/db');
const verificarToken = require('./src/middleware/auth');

// Seções do app Carflax
const rotasGeral = require('./src/routes/HUB/Dashboard/geral');
const rotasProdutos = require('./src/routes/HUB/Dashboard/produtos');
const rotasOrcamentos = require('./src/routes/HUB/Crm/orcamentos');
const rotasClientesFrv = require('./src/routes/HUB/Crm/clientesFrv');
const rotasEntregas = require('./src/routes/HUB/Entregas/entregas');
const rotasRomaneios = require('./src/routes/HUB/Entregas/romaneios');
const rotasConcluidas = require('./src/routes/HUB/Entregas/concluidas');
const rotasAdminSQL = require('./src/routes/HUB/Admin/sql');

const app = express();

// CORS restrito à origem do frontend (configurável via ALLOWED_ORIGIN no .env)
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Pool MySQL único, compartilhado por todos os handlers via req.app.locals.pool
app.locals.pool = getPool();

// Rota pública — sem autenticação
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Todas as rotas abaixo exigem token JWT válido
// DESATIVADO TEMPORARIAMENTE PARA TESTES
// app.use('/api', verificarToken);

app.use('/api/dashboard/geral', rotasGeral);
app.use('/api/dashboard/produtos', rotasProdutos);
app.use('/api/crm/orcamentos', rotasOrcamentos);
app.use('/api/crm/clientes-frv', rotasClientesFrv);
app.use('/api/entregas', rotasEntregas);
app.use('/api/entregas/romaneios', rotasRomaneios);
app.use('/api/entregas/concluidas', rotasConcluidas);
app.use('/api/admin/sql', rotasAdminSQL);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log('Banco de Dados Carflax Rodando ✅');
});

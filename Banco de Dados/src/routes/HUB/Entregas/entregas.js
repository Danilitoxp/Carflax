const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Entregas/entregasHandler');

/**
 * GET /api/entregas/detalhes/:nf
 * Ou apenas /api/entregas para pegar motoristas
 */
router.get(['/', '/detalhes/:nf'], handler.obterDetalhesEntrega);

module.exports = router;

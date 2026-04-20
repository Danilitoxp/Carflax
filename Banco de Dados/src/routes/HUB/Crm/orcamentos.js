const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Crm/orcamentosHandler');

/**
 * ROTA: GET /api/crm/orcamentos
 */
router.get('/', handler.listarOrcamentos);

module.exports = router;
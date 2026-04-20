const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Entregas/concluidasHandler');

/**
 * GET /api/entregas/concluidas
 */
router.get('/', handler.listarEntregasConcluidas);

module.exports = router;

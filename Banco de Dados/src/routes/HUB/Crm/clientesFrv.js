const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Crm/clientesFrvHandler');

/**
 * ROTA: GET /api/crm/clientes-frv
 */
router.get('/', handler.listarClientesFRV);

module.exports = router;

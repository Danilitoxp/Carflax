const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Entregas/romaneiosHandler');

/**
 * GET /api/entregas/romaneios
 */
router.get('/', handler.listarRomaneiosHoje);

module.exports = router;

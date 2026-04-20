const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Dashboard/geralHandler');

router.get('/', handler.obterDadosGerais);

module.exports = router;
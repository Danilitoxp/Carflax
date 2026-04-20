const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Dashboard/produtosHandler');

router.get('/', handler.obterProdutos);

module.exports = router;
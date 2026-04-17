const router = require('express').Router();
const clientes = require('../../handlers/clientes');

// Lista de clientes / prospecção (?prospeccao=true)
router.get('/clientes', clientes);

module.exports = router;

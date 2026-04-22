const express = require('express');
const router = express.Router();
const { getClientesFrv } = require('../../../handlers/HUB/Crm/clientesFrvHandler');

router.get('/', getClientesFrv);

module.exports = router;

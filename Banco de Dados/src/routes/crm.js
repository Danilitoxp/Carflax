const router = require('express').Router();
const crm = require('../../handlers/crm');

// Analytics de CRM: distribuição de status, conversão, top vendedores
router.get('/crm', crm);

module.exports = router;

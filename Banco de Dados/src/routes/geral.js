const router = require('express').Router();
const geral = require('../../handlers/geral');

// Métricas consolidadas do dashboard: totais + por vendedor
router.get('/geral', geral);

module.exports = router;

const router = require('express').Router();
const { listarOrcamentos, itensPorOrcamento, criarOrcamento } = require('../../handlers/orcamentos');

// Lista de orçamentos do período
router.get('/orcamentos', listarOrcamentos);

// Itens de um orçamento
router.get('/orcamentos/:id/itens', itensPorOrcamento);

// Criação via Citel API
router.post('/orcamentos', criarOrcamento);

module.exports = router;

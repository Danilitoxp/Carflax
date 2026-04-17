const router = require('express').Router();
const { rankingGeral, rankingPorMarca, listaMarcas } = require('../../handlers/campanhas');

// Ranking geral de vendedores no período
router.get('/campanhas/ranking', rankingGeral);

// Ranking filtrado por marca/fornecedor
router.get('/campanhas/ranking/marca', rankingPorMarca);

// Lista de marcas disponíveis
router.get('/campanhas/marcas', listaMarcas);

module.exports = router;

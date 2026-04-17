const router = require('express').Router();
const produtos = require('../../handlers/produtos');

// Lista de produtos com estoque e preço
router.get('/produtos', produtos);

// Produto por código
router.get('/produtos/:codigo', (req, res) => {
  req.query.codigo = req.params.codigo;
  return produtos(req, res);
});

module.exports = router;

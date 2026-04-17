const router = require('express').Router();
const entregas = require('../../handlers/entregas');

// Lista de entregas do dia (ou data específica) / busca por NF
router.get('/entregas', entregas);

module.exports = router;

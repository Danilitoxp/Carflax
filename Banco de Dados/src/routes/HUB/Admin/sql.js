const express = require('express');
const router = express.Router();
const handler = require('../../../handlers/HUB/Admin/sqlHandler');

router.post('/', handler.executarSQL);

module.exports = router;

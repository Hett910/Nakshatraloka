const express = require('express');
const router = express.Router();
const Catogary = require('../router/Category/Category.route');

router.use(
    '/api',
    Catogary
)

module.exports = router;
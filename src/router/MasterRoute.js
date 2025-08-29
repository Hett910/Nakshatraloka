const express = require('express');
const router = express.Router();
const Catogary = require('../router/Category/Category.route');
const Config = require('../router/Config/Config.route');
const User = require('../router/User/User.route');
const Orders = require('../router/Orders/Orders.Route');

router.use(
    '/api',
    Catogary,
    Config,
    User,
    Orders
)

module.exports = router;
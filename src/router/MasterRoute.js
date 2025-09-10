const express = require('express');
const router = express.Router();
const Catogary = require('../router/Category/Category.route');
const Config = require('../router/Config/Config.route');
const User = require('../router/User/User.route');
const Orders = require('../router/Orders/Orders.Route');
const Google = require('../router/Google/Google.route');
const Coupon  = require('../router/Coupon/Coupon.Route');
const Product = require('./Product/Product.route');
const ConsultationType = require('./Consultations/ConsultationsType.Route');
const Consultation = require('./Consultations/Consultations.Route');

router.use(
    '/api',
    Catogary,
    Config,
    User,
    Orders,
    Google,
    Coupon,
    Product,
    ConsultationType,
    Consultation
)

module.exports = router;
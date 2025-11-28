const express = require('express');
const router = express.Router();
const Catogary = require('../router/Category/Category.route');
const Config = require('../router/Config/Config.route');
const User = require('../router/User/User.route');
const Orders = require('../router/Orders/Orders.Route');
const Google = require('../router/Google/Google.route');
const Coupon  = require('../router/Coupon/Coupon.Route');
const Product = require('./Product/Product.route');
const Consut = require('./Consaultation/Consultations.Route');
const ConsultType = require('./Consaultation/ConsultationsType.Route')
const Cart = require('./Cart/Cart.route');
const review = require('./Review/Review.Route')
const ShipRocket = require('./ShipRocket/ShipRocket.Route')

router.use(
    '/api',
    Catogary,
    Config,
    User,
    Orders,
    Google,
    Coupon,
    Consut,
    ConsultType,
    Product,
    Cart,
    review,
    ShipRocket
)

module.exports = router;
const express = require('express');
const { Cart } = require('../../controller/Cart/Cart.Controller');
const auth = require('../../middleware/Auth');
const router = express.Router();


router.post('/saveCart', auth, Cart.saveCart);
router.post('/getCart', auth, Cart.listUserCart);

router.post('/UpdateCartData', auth, Cart.UpdateCartData);
module.exports = router;
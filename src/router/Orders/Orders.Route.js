const express = require("express");
const { saveWishlist, listWishlist, getWishlistById } = require("../../controller/Orders/Wishlist.Controller");
const auth = require("../../middleware/Auth");
const { Order } = require("../../controller/Orders/Orders.Controller");
const router = express.Router();

// Order
router.post('/saveOrder', auth, Order.saveOrder);
router.post('/listAllOrders', auth, Order.listAllOrders);
router.post('/getOrderById/:id', auth, Order.getOrderById);
router.post('/updateOrderStatus/:id/status', auth, Order.updateOrderStatus);
router.post('/getCompletedOrders', auth, Order.getCompletedOrders); 
router.post('/listPendingOrders', auth, Order.listPendingOrders);


// Wishlist
router.post('/manageWishlist', auth, saveWishlist);
router.post('/listWishlist', auth, listWishlist);
router.post('/getWishlistById/:id', auth, getWishlistById);



module.exports = router;
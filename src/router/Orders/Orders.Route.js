const express = require("express");
const { saveWishlist, listWishlist, getWishlistById } = require("../../controller/Orders/Wishlist.Controller");
const auth = require("../../middleware/Auth");
const { Order } = require("../../controller/Orders/Orders.Controller");
const { verifyRazorpayPayment } = require("../../controller/Orders/Payment.Controller");
const router = express.Router();

// Order    
router.post('/saveOrder', auth, Order.saveOrder);
// router.post('/saveOrder',Order.saveOrder);
router.post('/listAllOrders', auth, Order.listAllOrders);
// router.post('/listAllOrders', Order.listAllOrders);
router.post('/getOrderById/:id', auth, Order.getOrderById);
// router.post('/updateOrderStatus/:id/status', auth, Order.updateOrderStatus);
router.post('/updateOrderStatus/:id/status',auth,Order.updateOrderStatus);
// router.post('/getAllOrders', auth, Order.getAllOrders);


// Wishlist
// router.post('/manageWishlist', auth, saveWishlist);
router.post('/manageWishlist', auth, saveWishlist);
router.post('/listWishlist', auth, listWishlist);
// router.post('/getWishlistById/:id', auth, getWishlistById);

// Payment
router.post("/create-razorpay-order", auth, Order.createRazorpayOrder);
router.post("/verify-payment", auth, verifyRazorpayPayment);


module.exports = router;
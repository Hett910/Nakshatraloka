const express = require("express");
const { razorpayWebhook } = require("../../controller/Razorpay/Razorpay.Controller");
const router = express.Router();

router.post("/razorpay/webhook", razorpayWebhook);


module.exports = router;
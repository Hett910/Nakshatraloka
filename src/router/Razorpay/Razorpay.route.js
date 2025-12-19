const express = require("express");
const { razorpayWebhook } = require("../../controller/Razorpay/Razorpay.Controller");
const router = express.Router();

router.post(
  "/razorpay/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

module.exports = router;
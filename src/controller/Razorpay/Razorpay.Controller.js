const crypto = require("crypto");

const razorpayWebhook = (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const razorpaySignature = req.headers["x-razorpay-signature"];
    const body = req.body.toString();

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (razorpaySignature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case "payment.captured":
        console.log(
          "✅ Payment Captured:",
          event.payload.payment.entity.id
        );
        break;

      case "payment.failed":
        console.log(
          "❌ Payment Failed:",
          event.payload.payment.entity.id
        );
        break;

      case "order.paid":
        console.log(
          "🧾 Order Paid:",
          event.payload.order.entity.id
        );
        break;

      default:
        console.log("Unhandled Event:", event.event);
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook handling failed",
    });
  }
};

module.exports = {
  razorpayWebhook,
};
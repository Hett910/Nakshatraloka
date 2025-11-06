const crypto = require("crypto");
const { Order } = require("./Orders.Controller");

// const verifyRazorpayPayment = async (req, res) => {
//     try {
//         const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;

//         // 🔹 Verify Razorpay signature
//         const body = razorpay_order_id + "|" + razorpay_payment_id;
//         const expectedSignature = crypto
//             .createHmac("sha256", process.env.RZP_KEY_SECRET)
//             .update(body.toString())
//             .digest("hex");

//         if (expectedSignature !== razorpay_signature) {
//             return res.status(400).json({ success: false, message: "Invalid payment signature" });
//         }

//         // 🔹 Save order
//         const saveResult = await Order.saveOrderData(orderDetails, orderDetails.userId, razorpay_payment_id);

//         if (saveResult.success) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Payment verified and order saved successfully",
//                 orderId: saveResult.orderId,
//             });
//         } else {
//             return res.status(400).json(saveResult);
//         }

//     } catch (error) {
//         console.error("Verify Payment Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Payment verification failed",
//             error: error.message,
//         });
//     }
// };

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RZP_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        // Save order
        const saveResult = await Order.saveOrderData(orderDetails, orderDetails.userId, razorpay_payment_id);

        if (saveResult.success) {
            return res.status(200).json({
                success: true,
                message: "Payment verified and order saved successfully",
                orderId: saveResult.orderId,
                couponId: saveResult.couponId // ✅ now included
            });
        } else {
            return res.status(400).json(saveResult);
        }
    } catch (error) {
        console.error("Verify Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: error.message,
        });
    }
};

module.exports = { verifyRazorpayPayment };

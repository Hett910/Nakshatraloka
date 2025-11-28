const crypto = require("crypto");
const { Order } = require("./Orders.Controller");

// const verifyRazorpayPayment = async (req, res) => {
//     try {
//         const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;

//         // Verify signature
//         const body = razorpay_order_id + "|" + razorpay_payment_id;
//         const expectedSignature = crypto
//             .createHmac("sha256", process.env.RZP_KEY_SECRET)
//             .update(body.toString())
//             .digest("hex");

//         if (expectedSignature !== razorpay_signature) {
//             return res.status(400).json({ success: false, message: "Invalid payment signature" });
//         }

//         // Save order
//         const saveResult = await Order.saveOrderData(orderDetails, orderDetails.userId, razorpay_payment_id);

//         if (saveResult.success) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Payment verified and order saved successfully",
//                 orderId: saveResult.orderId,
//                 couponId: saveResult.couponId // ✅ now included
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

const sendEmail = require("../../utils/sendEmail");
// const addToGoogleSheet = require("../utils/googleSheet");

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RZP_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature)
            return res.status(400).json({ success: false, message: "Invalid Signature" });

        // SAVE TO DB
        const result = await Order.saveOrderData(orderDetails, orderDetails.userId, razorpay_payment_id);

        const { fullName, email, address, city, zip, country } = orderDetails.shippingAddress;
        const productList = orderDetails.orderItems.map(i => `${i.name} (x${i.quantity})`).join(", ");
        const totalAmount = orderDetails.total;

        // SEND EMAIL TO USER
        if (email) {
            await sendEmail(
                email,
                "🎉 Payment Successful — Your Order is Confirmed!",
                `
                <div style="font-family:Arial,Helvetica,sans-serif; background:#f7f7f7; padding:25px;">
                    <div style="max-width:600px; margin:auto; background:#ffffff; padding:30px; border-radius:12px; box-shadow:0 0 12px rgba(0,0,0,0.08);">

                        <!-- LOGO -->
                        <div style="text-align:center; margin-bottom:20px;">
                            <img src="cid:nakshatra-logo" alt="Nakshatraloka" style="width:140px;" />
                        </div>

                        <div style="text-align:center; border-bottom:1px solid #eee; padding-bottom:12px;">
                            <h2 style="margin:0; font-size:22px; color:#111;">🎉 Payment Received Successfully</h2>
                            <p style="color:#555; margin-top:6px; font-size:14px;">Thank you for shopping with <b>Nakshatraloka</b></p>
                        </div>

                        <p style="font-size:16px; color:#222; margin-top:18px;">
                            Hello <b>${fullName}</b>,
                        </p>

                        <p style="font-size:15px; color:#444; line-height:22px;">
                            Your payment has been confirmed and we have received your order successfully 🤍  
                            We will notify you again once your package is packed & shipped 📦
                        </p>

                        <div style="background:#faf7ff; padding:18px; border-radius:10px; margin:20px 0; border-left:4px solid #8d5cff;">
                            <h3 style="margin:0 0 10px;">🛍 Order Summary</h3>
                            <p><b>Products:</b> ${productList}</p>
                            <p><b>Total Paid:</b> <span style="color:#18a84b;">₹${totalAmount}</span></p>
                            <p><b>Payment ID:</b> 🔹 ${razorpay_payment_id}</p>
                        </div>

                        <div style="background:#f2faff; padding:18px; border-radius:10px; border-left:4px solid #00aaff;">
                            <h3 style="margin:0 0 10px;">📦 Delivery Address</h3>
                            <p>${address}, ${city}, ${zip}, ${country}</p>
                        </div>

                        <div style="text-align:center; margin-top:30px;">
                            <p style="font-size:15px; font-weight:bold;">Need Help? We are here 💛</p>

                            <p style="font-size:14px; color:#444; margin-top:6px;">
                                📩 Email: <a href="mailto:customercare@nakshatraloka.com">customercare@nakshatraloka.com</a><br>
                                📞 Phone / WhatsApp: <a href="https://wa.me/919601394272">+91 96013 94272</a>
                            </p>

                            <a href="https://nakshatraloka.com" 
                            style="background:#8d5cff; color:#fff; padding:10px 25px; display:inline-block; margin-top:12px; border-radius:6px; text-decoration:none;">
                                Continue Shopping
                            </a>

                            <p style="font-size:12px; color:#777; margin-top:15px;">© 2026 Nakshatraloka — All Rights Reserved</p>
                        </div>
                    </div>
                </div>
                `,
            );

        } else {
            console.log("❗ No customer email found — email not sent");
        }



        // INSERT INTO GOOGLE SHEET
        // await addToGoogleSheet([
        //     orderDetails.name,
        //     orderDetails.email,
        //     orderDetails.productName,
        //     orderDetails.amount,
        //     razorpay_payment_id,
        //     razorpay_order_id,
        //     new Date().toLocaleString()
        // ]);

        return res.status(200).json({ success: true, message: "Payment Verified, Email Sent & Sheet Updated" });

    } catch (err) {
        console.log("Payment Error →", err);
        return res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
    }
};

module.exports = { verifyRazorpayPayment };

const express = require("express");
const pool = require("../../utils/PostgraceSql.Connection");
const { redis } = require("../../utils/redisClient");
const Razorpay = require("razorpay")

// Save or update order

// const saveOrder = async (req, res) => {
//     try {
//         const {
//             id = 0, // 0 for new order
//             shippingAddress,
//             paymentMethod,
//             userId,
//             coupenId = null,
//             orderItems = [], // 👈 Must be array of { ProductID, Quantity }
//             orderStatus = 'Pending',
//             paymentStatus = 'Pending',
//             orderDate = new Date().toISOString(),
//             isActive = true,
//             transactionId = null
//         } = req.body;

//         // Validate required fields
//         if (!userId || !shippingAddress || !paymentMethod || orderItems.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields or empty order items."
//             });
//         }

//         // Build the query
//         const query = `
//             SELECT public.fn_save_order(
//                 $1, $2, $3, $4, $5,
//                 $6, $7, $8, $9, $10, $11
//             ) AS result
//         `;

//         const values = [
//             userId,                      // $1 → p_userid
//             shippingAddress,             // $2 → p_shippingaddress
//             paymentMethod,               // $3 → p_paymentmethod
//             JSON.stringify(orderItems),  // $4 → p_orderitems (as JSON)
//             id,                          // $5 → p_id
//             coupenId,                    // $6 → p_coupenid
//             orderStatus,                 // $7 → p_orderstatus
//             paymentStatus,               // $8 → p_paymentstatus
//             orderDate,                   // $9 → p_orderdate
//             isActive,                    // $10 → p_isactive
//             transactionId                // $11 → p_transactionid
//         ];

//         console.log("Executing fn_save_order with values:", values);

//         const { rows } = await pool.query(query, values);

//         return res.status(200).json({
//             success: true,
//             message: "Order saved successfully.",
//             orderId: rows[0].result
//         });

//     } catch (error) {
//         console.error("Save Order Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error"
//         });
//     }
// };

// Use environment variables
const RAZORPAY_KEY_ID = process.env.RZP_KEY_ID;      // test or live key id
const RAZORPAY_KEY_SECRET = process.env.RZP_KEY_SECRET;

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body; // amount in INR
        if (!amount) {
            return res.status(400).json({ success: false, message: "Amount is required" });
        }

        const options = {
            amount: amount, // convert to paise
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            currency: order.currency,
            amount: order.amount,
        });
    } catch (error) {
        console.error("Create Razorpay Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order",
            error: error.message,
        });
    }
};

//LATEST CODE
// const saveOrder = async (req, res) => {
//     try {
//         // ✅ Extract userId from token instead of request body
//         const userId = req.user?.id;

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized: User ID missing from token."
//             });
//         }

//         const {
//             id = 0,
//             shippingAddress,
//             paymentMethod,
//             coupenId = null,
//             orderItems = [],
//             orderStatus = 'Pending',
//             paymentStatus = 'Pending',
//             orderDate = new Date().toISOString(),
//             isActive = true,
//             transactionId = null
//         } = req.body;

//         if (!shippingAddress || !paymentMethod || orderItems.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields or empty order items."
//             });
//         }

//         const query = `
//             SELECT public.fn_save_order(
//                 $1, $2, $3, $4, $5,
//                 $6, $7, $8, $9, $10, $11
//             ) AS result
//         `;

//         const values = [
//             userId,           // ✅ userId from token
//             shippingAddress,
//             paymentMethod,
//             JSON.stringify(orderItems),
//             id,
//             coupenId,
//             orderStatus,
//             paymentStatus,
//             orderDate,
//             isActive,
//             transactionId
//         ];

//         const { rows } = await pool.query(query, values);

//         return res.status(200).json({
//             success: true,
//             message: "Order saved successfully.",
//             orderId: rows[0].result
//         });

//     } catch (error) {
//         console.error("Save Order Error:", error);

//         const pgMessage = error?.message || "Internal Server Error";

//         return res.status(400).json({
//             success: false,
//             message: `Save Order Error: ${pgMessage}`
//         });
//     }
// };

// const saveOrderData = async (orderData, userId) => {
//     try {
//         const {
//             id = 0,
//             shippingAddress,
//             paymentMethod,
//             coupenId = null,
//             orderItems = [],
//             orderStatus = 'Pending',
//             paymentStatus = 'Pending',
//             orderDate = new Date().toISOString(),
//             isActive = true,
//             transactionId = null
//         } = orderData;

//         if (!shippingAddress || !paymentMethod || orderItems.length === 0) {
//             throw new Error("Missing required fields or empty order items.");
//         }

//         // ✅ FIRST: Verify products exist in your application layer
//         for (const item of orderItems) {
//             const productId = item.ProductID || item.productId;
//             const productCheck = await pool.query(
//                 'SELECT "ID" FROM public."ProductMaster" WHERE "ID" = $1 AND "IsActive" = true',
//                 [productId]
//             );
//             console.log({ ProductID: productId })

//             if (productCheck.rows.length === 0) {
//                 throw new Error(`Product with ID ${productId} not found or inactive`);
//             }
//         }

//         // Rest of your function...
//         const transformedOrderItems = orderItems.map(item => ({
//             productid: item.ProductID || item.productId,
//             quantity: item.Quantity || item.quantity,
//             name: item.Name || item.name,
//             price: item.Price || item.price,
//         }));
//         const query = `
//             SELECT public.fn_save_order(
//                 $1, $2, $3, $4, $5,
//                 $6, $7, $8, $9, $10, $11
//             ) AS result
//         `;

//         const values = [
//             userId,
//             shippingAddress,
//             paymentMethod,
//             JSON.stringify(transformedOrderItems),
//             id,
//             coupenId,
//             orderStatus,
//             paymentStatus,
//             orderDate,
//             isActive,
//             transactionId
//         ];

//         const { rows } = await pool.query(query, values);

//         return {
//             success: true,
//             message: "Order saved successfully.",
//             orderId: rows[0].result
//         };

//     } catch (error) {
//         console.error("Save Order Error:", error);
//         const pgMessage = error?.message || "Internal Server Error";
//         return {
//             success: false,
//             message: `Save Order Error: ${pgMessage}`
//         };
//     }
// };

// const saveOrder = async (req, res) => {
//     try {
//         const userId = req.user?.id;
//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Unauthorized: User ID missing from token."
//             });
//         }

//         const result = await saveOrderData(req.body, userId);

//         if (result.success) {
//             return res.status(200).json(result);
//         } else {
//             return res.status(400).json(result);
//         }

//     } catch (error) {
//         console.error("Save Order Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error"
//         });
//     }
// };

// 🔹 Save order function
const saveOrderData = async (orderData, userId, transactionId = null) => {
    try {
        const {
            shippingAddress,
            paymentMethod,
            coupenId = null,
            orderItems = [],
            orderStatus = 'Pending',
            paymentStatus = 'Pending',
            orderDate = new Date().toISOString(),
            isActive = true
        } = orderData;

        if (!shippingAddress || !paymentMethod || orderItems.length === 0) {
            throw new Error("Missing required fields or empty order items.");
        }

        const transformedOrderItems = [];

        // 🔹 Validate products in ProductSize table and get price/stock
        for (const item of orderItems) {
            const productId = item.ProductID || item.productid;
            const quantity = item.Quantity || item.quantity;

            const productQuery = `
                SELECT "ID", "Price", "Stock"
                FROM public."ProductSize"
                WHERE "ProductID" = $1 AND "Stock" >= $2 AND "IsActive" = true
                LIMIT 1
            `;
            const { rows } = await pool.query(productQuery, [productId, quantity]);

            if (rows.length === 0) {
                throw new Error(`Product with ID ${productId} not found, inactive, or insufficient stock`);
            }

            transformedOrderItems.push({
                productid: productId,
                quantity,
                price: rows[0].Price
            });
        }

        // 🔹 Call PostgreSQL function to save order
        const query = `
            SELECT public.fn_save_order(
                $1, $2, $3, $4, 0,
                $5, $6, $7, $8, $9, $10
            ) AS result;
        `;

        const values = [
            userId,
            shippingAddress,
            paymentMethod,
            JSON.stringify(transformedOrderItems),
            coupenId,
            orderStatus,
            paymentStatus,
            orderDate,
            isActive,
            transactionId
        ];

        const { rows } = await pool.query(query, values);

        // 🔹 Reduce stock in ProductSize after order is confirmed
        for (const item of transformedOrderItems) {
            await pool.query(
                `UPDATE public."ProductSize" SET "Stock" = "Stock" - $1 WHERE "ProductID" = $2`,
                [item.quantity, item.productid]
            );
        }

        return {
            success: true,
            message: "Order saved successfully.",
            orderId: rows[0].result
        };

    } catch (error) {
        console.error("Save Order Error:", error);
        return {
            success: false,
            message: error.message || "Internal Server Error"
        };
    }
};

// ✅ Express route handler
const saveOrder = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID missing from token."
            });
        }

        const result = await saveOrderData(req.body, userId);

        return res.status(result.success ? 200 : 400).json(result);

    } catch (error) {
        console.error("Save Order Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const listAllOrders = async (req, res) => {
    try {
        const user = req.user;
        // let cacheKey;
        let query;
        let params = [];

        // Determine cache key based on role
        if (user.role === "admin") {
            // cacheKey = "orders:all";
            query = `
                SELECT *
                FROM "V_OrderDetails"
                ORDER BY "OrderID" ASC
            `;
        } else if (user.role === "customer") {
            // cacheKey = `orders:user:${user.id}`;
            query = `
                SELECT *
                FROM "V_OrderDetails"
                WHERE "UserID" = $1 AND "IsActive" = true
                ORDER BY "OrderID" ASC
            `;
            params.push(user.id);
        } else {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }

        // 1. Check Redis cache
        // const cachedData = await redis.get(cacheKey);
        // if (cachedData) {
        //     // console.log(`📦 Serving orders from Redis cache for ${user.role === "admin" ? "admin" : "user " + user.id}`);
        //     return res.status(200).json({
        //         success: true,
        //         data: JSON.parse(cachedData),
        //     });
        // }

        // 2. Query DB
        const result = await pool.query(query, params);

        // 3. Store in Redis
        // await redis.set(
        //     cacheKey,
        //     JSON.stringify(result.rows),
        //     { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        // );
        // console.log(`💾 Stored orders in Redis for ${user.role === "admin" ? "admin" : "user " + user.id}`);

        return res.status(200).json({ success: true, data: result.rows });

    } catch (error) {
        console.error("List All Orders Error:", error);
        return res.status(400).json({
            success: false,
            message: `List Order Error: ${error?.message || "Internal Server Error"}`
        });
    }
};


// const getAllOrders = async (req, res) => {
//     try {
//         const user = req.user; // assuming you attach user in middleware

//         if (user.role !== "admin" && user.role !== "customer") return res.status(403).json({ success: false, message: "Access Denied" });

//         let query, values;

//         if (user.role === "admin") {
//             query = `
//                 SELECT *
//                 FROM "V_OrderDetails"
//                 ORDER BY "OrderID" ASC
//             `;
//             values = [];
//         } else {
//             query = `
//                 SELECT *
//                 FROM "V_OrderDetails"
//                 WHERE "UserID" = $1 AND "IsActive" = true
//                 ORDER BY "OrderID" ASC
//             `;
//             values = [user.id];
//         }

//         const result = await pool.query(query, values);

//         return res.json({
//             success: true,
//             data: result.rows
//         });

//     } catch (error) {
//         console.error("Fetch All Order Error:", error);

//         // Extract the Postgres error message
//         const pgMessage = error?.message || "Internal Server Error";

//         return res.status(400).json({
//             success: false,
//             message: `List Order Error: ${pgMessage}`
//         });
//     }
// }



const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (user.role !== 'admin' && user.role !== 'customer') {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }

        // const cacheKey = `order:${id}`;

        // 1. Check Redis cache
        // const cachedData = await redis.get(cacheKey);
        // if (cachedData) {
        //     // console.log(`📦 Serving order ${id} from Redis cache`);
        //     return res.status(200).json({
        //         success: true,
        //         data: JSON.parse(cachedData),
        //     });
        // }

        // 2. Query DB
        const query = `
            SELECT *
            FROM "V_OrderDetails"
            WHERE "OrderID" = $1
        `;
        const values = [id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found or access denied."
            });
        }

        // 3. Store in Redis
        // await redis.set(
        //     cacheKey,
        //     JSON.stringify(result.rows[0]),
        //     { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        // );
        // console.log(`💾 Stored order ${id} in Redis`);

        return res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        console.error("Get Order By ID Error:", error);
        return res.status(400).json({
            success: false,
            message: `Get Order By ID Error: ${error.message}`
        });
    }
};


// ✅ Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;
        const user = req.user;

        if (user.role !== "admin" && user.role !== "customer") return res.status(403).json({ success: false, message: "Access Denied" });

        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to update order status"
            });
        }

        const query = `
            UPDATE public."OrderMaster"
            SET "OrderStatus" = $1,
                "UpdatedDate" = NOW()
            WHERE "ID" = $2
            RETURNING "ID", "OrderStatus";
        `;

        const values = [orderStatus, id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        return res.json({
            success: true,
            message: "Order status updated successfully.",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Update Order Status Error:", error);
        return res.status(400).json({
            success: false,
            message: `Update Order Status Error: ${error?.message}`
        });
    }
};

module.exports = {
    Order: {
        saveOrder,
        saveOrderData,
        createRazorpayOrder,
        listAllOrders,
        getOrderById,
        updateOrderStatus
    }
}; 
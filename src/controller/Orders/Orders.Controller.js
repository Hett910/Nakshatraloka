const express = require("express");
const pool = require("../../utils/PostgraceSql.Connection");
const { redis } = require("../../utils/redisClient");
//add comments

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

const saveOrder = async (req, res) => {
    const userID = req.user?.id;



    try {
        const {
            id = 0,
            shippingAddress,
            paymentMethod,
            coupenId = null,
            orderItems = [],
            orderStatus = 'Pending',
            paymentStatus = 'Pending',
            orderDate = new Date().toISOString(),
            isActive = true,
            transactionId = null
        } = req.body;

        if (!userId || !shippingAddress || !paymentMethod || orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields or empty order items."
            });
        }

        const query = `
            SELECT public.fn_save_order(
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10, $11
            ) AS result
        `;

        const values = [
            userID,
            shippingAddress,
            paymentMethod,
            JSON.stringify(orderItems),
            id,
            coupenId,
            orderStatus,
            paymentStatus,
            orderDate,
            isActive,
            transactionId
        ];

        const { rows } = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: "Order saved successfully.",
            orderId: rows[0].result
        });

    } catch (error) {
        console.error("Save Order Error:", error);

        // Extract the Postgres error message
        const pgMessage = error?.message || "Internal Server Error";

        return res.status(400).json({
            success: false,
            message: `Save Order Error: ${pgMessage}`
        });
    }
};

// ✅ List all orders with Redis caching
const listAllOrders = async (req, res) => {
  try {
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "customer")) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // 1️⃣ Create cache key
    const cacheKey = user.role === "admin" ? `orders:all` : `orders:user:${user.id}`;

    // 2️⃣ Check cache first
    const cachedOrders = await redis.get(cacheKey);
    if (cachedOrders) {
      console.log(`⚡ Serving orders from Redis cache for ${user.role} ${user.id || "admin"}`);
      return res.json(JSON.parse(cachedOrders));
    }

    // 3️⃣ Query database
    let query, values = [];
    if (user.role === "admin") {
      query = `
        SELECT *
        FROM "V_OrderDetails"
        ORDER BY "OrderID" ASC
      `;
    } else {
      query = `
        SELECT *
        FROM "V_OrderDetails"
        WHERE "UserID" = $1 AND "IsActive" = true
        ORDER BY "OrderID" ASC
      `;
      values = [user.id];
    }

    const { rows } = await pool.query(query, values);

    const responseData = { success: true, data: rows };

    // 4️⃣ Cache the result for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(responseData));

    return res.json(responseData);

  } catch (error) {
    console.error("List Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: `List Orders Error: ${error?.message || "Internal Server Error"}`
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


// ✅ Get order by ID with Redis caching
const getOrderById = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const user = req.user;

    if (!user || (user.role !== "admin" && user.role !== "customer")) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // Create cache key
    const cacheKey = `order:${orderId}:user:${user.id}`;

    // 1️⃣ Check cache first
    const cachedOrder = await redis.get(cacheKey);
    if (cachedOrder) {
      console.log(`⚡ Serving order ${orderId} for user ${user.id} from Redis cache`);
      return res.json(JSON.parse(cachedOrder));
    }

    // 2️⃣ Query database
    const query = `
      SELECT *
      FROM "V_OrderDetails"
      WHERE "OrderID" = $1
    `;
    const { rows } = await pool.query(query, [orderId]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied.",
      });
    }

    // 3️⃣ Optional: Restrict customers to their own orders
    if (user.role === "customer" && rows[0].UserID !== user.id) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // 4️⃣ Cache the result for 15 minutes
    const responseData = { success: true, data: rows[0] };
    await redis.setEx(cacheKey, 900, JSON.stringify(responseData)); // 900 sec = 15 min

    return res.json(responseData);
  } catch (error) {
    console.error("Get Order By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: `Get Order By ID Error: ${error.message}`,
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


const getCompletedOrders = async (req, res) => {
    const user = req.user;

    if (!user?.id) {
        return res.status(403).json({ success: false, message: "Please log in first." });
    }

    try {
        const userId = user.id;

        // Call the PostgreSQL function fn_get_completed_orders_by_user
        const query = `
            SELECT * 
            FROM public.fn_get_completed_orders_by_user($1)
        `;
        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "No completed orders found for this user." });
        }

        return res.status(200).json({
            success: true,
            message: "Completed orders retrieved successfully.",
            orders: rows
        });

    } catch (error) {
        console.error('Error fetching completed orders:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};


const listPendingOrders = async (req, res) => {
    const user = req.user;

    if (!user?.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied." });
    }

    const client = await pool.connect();
    try {
        const query = `
            SELECT *
            FROM public.fn_get_pending_orders_by_user($1);
        `;

        const { rows } = await client.query(query, [user.id]);

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error(`Error listing pending orders: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    } finally {
        client.release();
    }
};



module.exports = {
    Order: {
        saveOrder,
        listAllOrders,
        getOrderById,
        updateOrderStatus,
        getCompletedOrders,
        listPendingOrders
    }
};
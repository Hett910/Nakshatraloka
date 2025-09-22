const express = require("express");
const pool = require("../../utils/PostgraceSql.Connection");


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
    try {
        // ✅ Extract userId from token instead of request body
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID missing from token."
            });
        }

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

        if (!shippingAddress || !paymentMethod || orderItems.length === 0) {
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
            userId,           // ✅ userId from token
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

        const pgMessage = error?.message || "Internal Server Error";

        return res.status(400).json({
            success: false,
            message: `Save Order Error: ${pgMessage}`
        });
    }
};


const listAllOrders = async (req, res) => {
    try {
        const user = req.user;

        if (user.role === "admin") {
            const query = `
                SELECT *
                FROM "V_OrderDetails"
                ORDER BY "OrderID" ASC
            `;
            const result = await pool.query(query);
            return res.json({
                success: true,
                data: result.rows
            });
        } else

            if (user.role === "customer") {
                const query = `
                SELECT *
                FROM "V_OrderDetails"
                WHERE "UserID" = $1 AND "IsActive" = true
                ORDER BY "OrderID" ASC
            `;


                const result = await pool.query(query, [user.id]);

                return res.json({
                    success: true,
                    data: result.rows
                });
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied"
                });
            }
    } catch (error) {
        console.error("Save Order Error:", error);

        // Extract the Postgres error message
        const pgMessage = error?.message || "Internal Server Error";

        return res.status(400).json({
            success: false,
            message: `List Order Error: ${pgMessage}`
        });
    }
}

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


// ✅ Get order by ID
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        console.log(user)

        if (user.role !== 'admin' && user.role !== 'customer') return res.status(403).json({ success: false, message: "Access Denied" });

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

        return res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Get Order By ID Error:", error);
        return res.status(400).json({
            success: false,
            message: `Get Order By ID Error: ${error?.message}`
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
        listAllOrders,
        getOrderById,
        updateOrderStatus
    }
}; 
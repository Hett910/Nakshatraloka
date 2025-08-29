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
        const {
            id = 0,
            shippingAddress,
            paymentMethod,
            userId,
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
            userId,
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

const listAllOrders = async (req, res) => {
    try {
        const user = req.user;

        if (user.role !== "admin") {
            const query = `
                SELECT *
                FROM "V_OrderWithProductDetails"
                WHERE "UserID" = $1 AND "IsActive" = true
                ORDER BY "OrderID" ASC
            `;

            const result = await pool.query(query, [user.id]);

            return res.json({
                success: true,
                data: result.rows
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


module.exports = {
    Order: {
        saveOrder,
        listAllOrders
    }
};
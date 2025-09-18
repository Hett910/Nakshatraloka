const pool = require('../../utils/PostgraceSql.Connection');
const { redis } = require('../../utils/redisClient');

// const saveCart = async (req, res) => {
//     const user = req.user;

//     if (!user.id) {
//         return res.status(403).json({ success: false, message: "Please log in first." });
//     }

//     try {
//         const { productId } = req.body;

//         if (!productId) {
//             return res.status(400).json({ success: false, message: "Product ID is required." });
//         }

//         const userId = user.id; // Ensure that user object contains 'id'

//         // Check if this product is already in the user's cart
//         const checkQuery = `
//             SELECT * FROM public."Cart"
//             WHERE "UserID" = $1 AND "ProductID" = $2
//         `;
//         const checkResult = await pool.query(checkQuery, [userId, productId]);

//         if (checkResult.rows.length > 0) {
//             // Toggle IsActive
//             const currentStatus = checkResult.rows[0].IsActive;
//             const toggleQuery = `
//                 UPDATE public."Cart"
//                 SET "IsActive" = $1
//                 WHERE "ID" = $2
//                 RETURNING *
//             `;
//             const toggleResult = await pool.query(toggleQuery, [!currentStatus, checkResult.rows[0].ID]);

//             return res.status(200).json({
//                 success: true,
//                 message: `Cart item ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
//                 cartItem: toggleResult.rows[0]
//             });
//         } else {
//             // Insert new record
//             const insertQuery = `
//                 INSERT INTO public."Cart" ("UserID", "ProductID", "IsActive")
//                 VALUES ($1, $2, true)
//                 RETURNING *
//             `;
//             const insertResult = await pool.query(insertQuery, [userId, productId]);

//             return res.status(201).json({
//                 success: true,
//                 message: "Product added to cart successfully.",
//                 cartItem: insertResult.rows[0]
//             });
//         }

//     } catch (error) {
//         console.error('Error saving cart:', error);
//         return res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// };

const saveCart = async (req, res) => {
    const user = req.user;

    if (!user?.id) {
        return res.status(403).json({ success: false, message: "Please log in first." });
    }

    try {
        const { productId, quantity = 1, selectedOptions = {} } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }

        const userId = user.id;

        // Call the PostgreSQL function fn_save_cart
        const query = `
            SELECT * 
            FROM public.fn_save_cart($1, $2, $3, $4)
        `;
        const { rows } = await pool.query(query, [
            userId,
            productId,
            quantity,
            JSON.stringify(selectedOptions)
        ]);

        if (rows.length === 0) {
            return res.status(500).json({ success: false, message: "Failed to save cart item" });
        }

        const cartItem = rows[0];

        return res.status(200).json({
            success: true,
            message: "Cart item saved successfully.",
            cartItem
        });

    } catch (error) {
        console.error('Error saving cart:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const updateCart = async (req, res) => {

    const user = req.user;
    if (!user.id) {
        return res.status(403).json({ success: false, message: "Please log in first." });
    }

    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }

        // Update the cart record for the user
        const updateQuery = `
            UPDATE public."Cart"
            SET "IsActive" = false
            WHERE "UserID" = $1 AND "ProductID" = $2
        `;
        const updateResult = await pool.query(updateQuery, [user.id, productId]);


        if (updateResult.rowCount > 0) {
            return res.status(200).json({ success: true, message: "Product removed from cart." });
        } else {
            return res.status(404).json({ success: false, message: "Product not found in cart." });
        }

    } catch (error) {
        console.log(`Error updating cart: ${error}`);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};


const UpdateCartData = async (req, res) => {
    const user = req.user;

    if (!user?.id) {
        return res.status(403).json({ success: false, message: "Please log in first." });
    }

    try {
        const { cartId, quantity, selectedOptions } = req.body;

        if (!cartId) {
            return res.status(400).json({ success: false, message: "Cart ID is required." });
        }

        // Validate that either quantity or selectedOptions is provided
        if (quantity === undefined && !selectedOptions) {
            return res.status(400).json({ success: false, message: "Nothing to update." });
        }

        const userId = user.id;

        // Check if the cart item belongs to the user and is active
        const checkQuery = `
            SELECT * FROM public."Cart"
            WHERE "CartID" = $1 AND "UserID" = $2 AND "IsActive" = true AND "IsOrdered" = false
        `;
        const checkResult = await pool.query(checkQuery, [cartId, userId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Cart item not found or cannot be updated." });
        }

        // Build dynamic update query parts
        let updateFields = [];
        let values = [];
        let paramIndex = 1;

        if (quantity !== undefined) {
            updateFields.push(`"Quantity" = $${paramIndex}`);
            values.push(quantity);
            paramIndex++;
        }

        if (selectedOptions !== undefined) {
            updateFields.push(`"SelectedOptions" = $${paramIndex}`);
            values.push(JSON.stringify(selectedOptions));
            paramIndex++;
        }

        // Add UpdatedAt timestamp
        updateFields.push(`"UpdatedAt" = now()`);

        const updateQuery = `
            UPDATE public."Cart"
            SET ${updateFields.join(", ")}
            WHERE "CartID" = $${paramIndex} AND "UserID" = $${paramIndex + 1}
            RETURNING *
        `;
        values.push(cartId, userId);

        const { rows } = await pool.query(updateQuery, values);

        if (rows.length === 0) {
            return res.status(500).json({ success: false, message: "Failed to update cart item." });
        }

        const updatedCartItem = rows[0];

        return res.status(200).json({
            success: true,
            message: "Cart item updated successfully.",
            cartItem: updatedCartItem
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}


// in this we pass old cart data

// const listUserCart = async (req, res) => {
//     const user = req.user;
//     if (!user?.id) {
//         return res.status(403).json({ success: false, message: "Please log in first." });
//     }

//     const client = await pool.connect();
//     try {
//         const query = `
//             SELECT 
//                 cartid,
//                 productid,
//                 name,
//                 description,
//                 stock,
//                 catogaryname,
//                 avgrating,
//                 reviewcount,
//                 primaryimage,
//                 firstsizeprice,
//                 firstdummyprice,
//                 discount,
//                 discountpercentage
//             FROM public.get_user_cart_products($1);
//         `;

//         const { rows } = await client.query(query, [user.id]);

//         // ✅ No conversion needed, DB already returns text path
//         const dataWithImages = rows.map(item => ({
//             ...item,
//             primaryimage: item.primaryimage || null
//         }));

//         return res.status(200).json({ success: true, data: dataWithImages });
//     } catch (error) {
//         console.error(Error`listing user cart: ${error}`);
//         return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
//     } finally {
//         client.release();
//     }
// };


// ✅ List User Cart with Redis caching
const listUserCart = async (req, res) => {
  const user = req.user;
  if (!user?.id) {
    return res.status(403).json({ success: false, message: "Please log in first." });
  }

  const cacheKey = `user_cart:${user.id}`;

  try {
    // 1️⃣ Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2️⃣ Query database if not cached
    const client = await pool.connect();
    try {
      const query = `SELECT * FROM public.get_user_cart_products_v2($1);`;
      const { rows } = await client.query(query, [user.id]);

      const responseData = { success: true, data: rows };

      // 3️⃣ Store in Redis with TTL (e.g., 5 minutes)
      await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

      return res.status(200).json(responseData);
    } finally {
      client.release();
    }

  } catch (error) {
    console.error(`Error listing user cart:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};



module.exports = {
    Cart: {
        saveCart,
        updateCart,
        listUserCart,
        UpdateCartData
    }
};

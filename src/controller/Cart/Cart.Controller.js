const pool = require('../../utils/PostgraceSql.Connection');
const { redisUtils } = require('../../utils/redisClient'); // Import redisUtils

const saveCart = async (req, res) => {
    const user = req.user;

    if (!user.id) {
        return res.status(403).json({ success: false, message: "Please log in first." });
    }

    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }

        const userId = user.id;

        // Check if this product is already in the user's cart
        const checkQuery = `
            SELECT * FROM public."Cart"
            WHERE "UserID" = $1 AND "ProductID" = $2
        `;
        const checkResult = await pool.query(checkQuery, [userId, productId]);

        let result;

        if (checkResult.rows.length > 0) {
            // Toggle IsActive
            const currentStatus = checkResult.rows[0].IsActive;
            const toggleQuery = `
                UPDATE public."Cart"
                SET "IsActive" = $1
                WHERE "ID" = $2
                RETURNING *
            `;
            const toggleResult = await pool.query(toggleQuery, [!currentStatus, checkResult.rows[0].ID]);
            result = toggleResult.rows[0];

            // Clear user's cart cache after update
            await redisUtils.del(`cart:${userId}`);
            console.log('🗑️ Cart cache cleared after update');

            return res.status(200).json({
                success: true,
                message: `Cart item ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
                cartItem: result
            });
        } else {
            // Insert new record
            const insertQuery = `
                INSERT INTO public."Cart" ("UserID", "ProductID", "IsActive")
                VALUES ($1, $2, true)
                RETURNING *
            `;
            const insertResult = await pool.query(insertQuery, [userId, productId]);
            result = insertResult.rows[0];

            // Clear user's cart cache after insert
            await redisUtils.del(`cart:${userId}`);
            console.log('🗑️ Cart cache cleared after insert');

            return res.status(201).json({
                success: true,
                message: "Product added to cart successfully.",
                cartItem: result
            });
        }

    } catch (error) {
        console.error('Error saving cart:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
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
            // Clear user's cart cache after removal
            await redisUtils.del(`cart:${user.id}`);
            console.log('🗑️ Cart cache cleared after removal');

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
            return res.status(400).json({ success: false, message: "Cart ID (ProductID) is required." });
        }

        if (quantity === undefined && !selectedOptions) {
            return res.status(400).json({ success: false, message: "Nothing to update." });
        }

        const userId = user.id;

        // 1️⃣ Find the actual cart row for this user and ProductID
        const checkQuery = `
            SELECT * FROM public."Cart"
            WHERE "ProductID" = $1 AND "UserID" = $2 AND "IsActive" = true AND "IsOrdered" = false
            LIMIT 1
        `;
        const checkResult = await pool.query(checkQuery, [cartId, userId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Cart item not found or cannot be updated." });
        }

        const cartRowId = checkResult.rows[0].ID;

        // 2️⃣ Build dynamic update query
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

        updateFields.push(`"UpdatedAt" = NOW()`);

        // 3️⃣ Update the cart row
        const updateQuery = `
            UPDATE public."Cart"
            SET ${updateFields.join(", ")}
            WHERE "ID" = $${paramIndex}
            RETURNING *
        `;
        values.push(cartRowId);

        const { rows } = await pool.query(updateQuery, values);

        // Clear user's cart cache after update
        await redisUtils.del(`cart:${userId}`);
        console.log('🗑️ Cart cache cleared after data update');

        return res.status(200).json({
            success: true,
            message: "Cart item updated successfully.",
            cartItem: rows[0]
        });

    } catch (error) {
        console.error("Error updating cart:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

const listUserCart = async (req, res) => {
    const user = req.user;
    if (!user?.id) {
        return res.status(403).json({ success: false, message: "Please log in first." });
    }

    try {
        const cacheKey = `cart:${user.id}`;

        // Use cacheable pattern for cart data
        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                const client = await pool.connect();
                const query = `
                    SELECT *
                    FROM public."V_UserCartDetails"
                    WHERE "UserID" = $1 AND "IsActive" = true
                    ORDER BY "CreaatedAt" DESC;
                `;
                const { rows } = await client.query(query, [user.id]);
                client.release();

                // Process images
                const dataWithImages = rows.map(item => ({
                    ...item,
                    PrimaryImage: item.PrimaryImage || null
                }));

                return dataWithImages.length > 0 ? dataWithImages : [];
            },
            300 // 5 minutes TTL for cart (changes frequently)
        );

        return res.status(200).json({ 
            success: true, 
            data,
            cached // Optional: to know if data came from cache
        });
    } catch (error) {
        console.error(`Error listing user cart: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
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
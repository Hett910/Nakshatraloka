const pool = require('../../utils/PostgraceSql.Connection');


const saveWishlist = async (req, res) => {
    const { id, productId } = req.body;
    const userId = req.user.id; // ✅ from middleware (decoded JWT)

    try {

        // Check if already exists
        const checkQuery = `
            SELECT "ID", "IsActive"
            FROM "Wishlist"
            WHERE "UserID" = $1 AND "ProductID" = $2
        `;

        const { rows } = await pool.query(checkQuery, [userId, productId]);

        if (rows.length > 0) {
            // Exists → toggle IsActive
            const toggleQuery = `
                UPDATE "Wishlist"
                SET "IsActive" = NOT "IsActive", "UpdatedAt" = NOW()
                WHERE "UserID" = $1 AND "ProductID" = $2
                RETURNING "IsActive";
            `;
            const result = await pool.query(toggleQuery, [userId, productId]);

            const message = result.rows[0].IsActive
                ? "Product added back to wishlist"
                : "Product removed from wishlist";

            return res.json({ success: true, message });
        } else {
            // Doesn't exist → insert new
            const insertQuery = `
                INSERT INTO "Wishlist" ("UserID", "ProductID", "IsActive", "CreatedAt")
                VALUES ($1, $2, true, NOW())
                RETURNING "ID";
            `;
            const result = await pool.query(insertQuery, [userId, productId]);

            return res.json({
                success: true,
                message: "Product added to wishlist",
                wishlistId: result.rows[0].ID
            });
        }

    } catch (error) {
        console.error('Error saving wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

const listWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // ✅ from middleware (decoded JWT)

        if (req.user.role == "customer") {
            
            const query = `
                SELECT *
                FROM "V_WishlistWithProductDetails"
                WHERE "UserID" = $1 AND "WishlistIsActive" = true
                ORDER BY "WishlistID" ASC
           `;

            const result = await pool.query(query, [userId]);

            res.json({
                success: true,
                data: result.rows
            });
        } else if(req.user.role == "admin"){
            
            const query = `
                SELECT *
                FROM "V_WishlistWithProductDetails"
                WHERE "WishlistIsActive" = true
                ORDER BY "WishlistID" ASC
           `;

            const result = await pool.query(query);

            res.json({
                success: true,
                data: result.rows
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

const getWishlistById = async (req, res) => {
    try {
        const wishlistId = req.params.id;

        const query = `
            SELECT *
            FROM "V_WishlistWithProductDetails"
            WHERE "WishlistID" = $1 AND "WishlistIsActive" = true
        `;

        const result = await pool.query(query, [wishlistId]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching wishlist by id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}
module.exports = {
    saveWishlist,
    listWishlist,
    getWishlistById
}
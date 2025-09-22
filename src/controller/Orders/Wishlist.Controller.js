const pool = require('../../utils/PostgraceSql.Connection');
const { redis } = require('../../utils/redisClient');


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
        const userId = req.user.id;
        let cacheKey;

        if (req.user.role === "customer") {
            cacheKey = `wishlist:user:${userId}`;
        } else if (req.user.role === "admin") {
            cacheKey = `wishlist:all`;
        } else {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // 1. Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            // console.log(`📦 Serving wishlist from Redis cache for ${req.user.role === "admin" ? "admin" : "user "+userId}`);
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData),
            });
        }

        // 2. Query DB
        let query;
        const params = [];

        if (req.user.role === "customer") {
            query = `
                SELECT *
                FROM "V_WishlistWithProductDetails"
                WHERE "UserID" = $1 AND "WishlistIsActive" = true
                ORDER BY "WishlistID" ASC
            `;
            params.push(userId);
        } else if (req.user.role === "admin") {
            query = `
                SELECT *
                FROM "V_WishlistWithProductDetails"
                WHERE "WishlistIsActive" = true
                ORDER BY "WishlistID" ASC
            `;
        }

        const result = await pool.query(query, params);

        // 3. Store in Redis
        await redis.set(
            cacheKey,
            JSON.stringify(result.rows),
            { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        );
        // console.log(`💾 Stored wishlist in Redis for ${req.user.role === "admin" ? "admin" : "user "+userId}`);

        return res.status(200).json({ success: true, data: result.rows });

    } catch (error) {
        console.error("Error fetching wishlist:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
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
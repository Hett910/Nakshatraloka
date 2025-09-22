const pool = require('../../utils/PostgraceSql.Connection');
const { redis } = require('../../utils/redisClient');

const SaveCoupon = async (req, res) => {
    // const user = req.user;

    // if (user.role !== "admin") {
    //     return res.status(403).json({ success: false, message: "Access Denied" });
    // }

    try {
        const coupon = req.body;

        const query = `
                SELECT fn_save_coupon(
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
                ) AS message;
            `;

        const values = [
            coupon.id || 0,               // p_id (0 for insert, existing ID for update)
            coupon.code,                  // p_code
            coupon.description,           // p_description
            coupon.discountType,          // p_discount_type
            coupon.discountValue,         // p_discount_value
            coupon.startDate,             // p_start_date
            coupon.endDate,               // p_end_date
            coupon.coupenType,            // p_coupen_type
            coupon.usageLimit,            // p_usage_limit
            coupon.createdBy,             // p_created_by
            coupon.updatedBy,             // p_updated_by
            coupon.minOrderAmount || 0,   // p_min_order_amount (default 0.00 if null)
            coupon.maxDiscountAmount,     // p_max_discount_amount (nullable)
            coupon.isActive ?? true,       // p_isactive (default true if null/undefined)
            coupon.productIDs || []        // p_product_ids (as JSON array)
        ];

        const { rows } = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            message: rows[0].message
        });

    } catch (error) {
        console.error("Save Coupon Error:", error);

        // Extract the Postgres error message
        const pgMessage = error?.message || "Internal Server Error";

        return res.status(400).json({
            success: false,
            message: `Save Coupon Error: ${pgMessage}`
        });
    }
};

const getAllCoupons = async (req, res) => {
    const user = req.user;

    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const { couponId } = req.query; // optional
        const cacheKey = couponId ? `coupons:${couponId}` : `coupons:all`;

        // 1. Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            // console.log(`📦 Serving ${couponId ? 'coupon ' + couponId : 'all coupons'} from Redis cache`);
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData)
            });
        }

        // 2. Query DB
        const query = `SELECT * FROM fn_get_coupons($1);`;
        const values = [couponId ? parseInt(couponId) : null];
        const { rows } = await pool.query(query, values);

        // 3. Store in Redis
        await redis.set(
            cacheKey,
            JSON.stringify(rows),
            { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        );
        // console.log(`💾 Stored ${couponId ? 'coupon ' + couponId : 'all coupons'} in Redis`);

        return res.status(200).json({ success: true, data: rows });

    } catch (error) {
        console.error("Get All Coupons Error:", error);
        return res.status(400).json({
            success: false,
            message: `Get All Coupons Error: ${error.message}`,
        });
    }
};

const deleteCoupon = async (req, res) => {

    const user = req.user;

    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const { id } = req.params;

        // Soft delete: mark inactive
        const query = `
        UPDATE public."CouponsMaster"
        SET "IsActive" = FALSE, "Updated_Date" = NOW()
        WHERE "ID" = $1
        RETURNING *;
        `;

        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        return res.json({
            success: true,
            message: "Coupon deactivated successfully",
            coupon: rows[0]
        });
    } catch (error) {
        console.error("Delete Coupon Error:", error);
        return res.status(400).json({
            success: false,
            message: `Delete Coupon Error: ${error.message}`,
        });
    }
};

const CouponUsage = async (req, res) => {
    const user = req.user;

    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const { code } = req.query; // optional ?code=NEW50
        const cacheKey = code ? `coupon_usage:${code}` : `coupon_usage:all`;

        // 1. Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            // console.log(`📦 Serving coupon usage ${code || 'all'} from Redis cache`);
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData),
            });
        }

        // 2. Query DB
        const result = await pool.query(
            `SELECT * FROM fn_get_coupon_usage($1)`,
            [code || null]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No coupon(s) found" });
        }

        // 3. Store in Redis
        await redis.set(
            cacheKey,
            JSON.stringify(result.rows),
            { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        );
        // console.log(`💾 Stored coupon usage ${code || 'all'} in Redis`);

        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error("Coupon Usage Error:", error);
        return res.status(400).json({
            success: false,
            message: `Coupon Usage Error: ${error.message}`,
        });
    }
};


const ActiveCouponProducts = async (req, res) => {
    const user = req.user;

    // Only admin access
    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const { couponId } = req.query; // Optional filter by coupon ID
        const cacheKey = couponId ? `coupon_products:${couponId}` : `coupon_products:all`;

        // 1. Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            // console.log(`📦 Serving ${couponId ? 'coupon ' + couponId : 'all coupons'} products from Redis cache`);
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData)
            });
        }

        // 2. Query DB
        const query = `
            SELECT 
                p."ID" AS ProductID,
                p."Name" AS ProductName,
                p."Description",
                ps."Size",
                ps."Stock",
                ps."Price" AS SizePrice,
                c."ID" AS CouponID,
                c."Code" AS CouponCode,
                c."DiscountType",
                c."DiscountValue"
            FROM "ProductMaster" p
            INNER JOIN "CouponProducts" cp ON p."ID" = cp."ProductID"
            INNER JOIN "CouponsMaster" c ON cp."CouponID" = c."ID"
            INNER JOIN "ProductSize" ps ON ps."ProductID" = p."ID"
            WHERE p."IsActive" = true
              AND c."IsActive" = true
              AND ps."IsActive" = true
              ${couponId ? 'AND c."ID" = $1' : ''}
            ORDER BY p."ID", ps."Size"
        `;
        const values = couponId ? [couponId] : [];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No products found for active coupons" });
        }

        // 3. Store result in Redis
        await redis.set(
            cacheKey,
            JSON.stringify(result.rows),
            { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        );
        // console.log(`💾 Stored ${couponId ? 'coupon ' + couponId : 'all coupons'} products in Redis`);

        return res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error("Active Coupon Products Error:", error);
        return res.status(400).json({
            success: false,
            message: `Error fetching products: ${error.message}`
        });
    }
};

const getAllCouponsForDisplay = async (req, res) => {
    const client = await pool.connect();
    const cacheKey = "coupons:all";

    try {
        // 1. Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            // console.log("📦 Serving all coupons from Redis cache");
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData)
            });
        }

        // 2. Query DB
        const result = await client.query(
            `SELECT * 
             FROM public."CouponsMaster" 
             WHERE "IsActive" = true
             ORDER BY "ID" ASC`
        );

        // 3. Store in Redis
        await redis.set(
            cacheKey,
            JSON.stringify(result.rows),
            { EX: parseInt(process.env.REDIS_CACHE_TTL) }
        );
        // console.log("💾 Stored all coupons in Redis");

        res.json({ success: true, data: result.rows });

    } catch (err) {
        console.error("Error fetching coupons:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    } finally {
        client.release();
    }
};


module.exports = {
    Coupon: {
        SaveCoupon,
        getAllCoupons,
        deleteCoupon,
        CouponUsage,
        getAllCouponsForDisplay,
        ActiveCouponProducts
    }
};

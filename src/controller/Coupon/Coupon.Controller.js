const pool = require('../../utils/PostgraceSql.Connection');
const { redisUtils } = require('../../utils/redisClient'); // Import redisUtils

const SaveCoupon = async (req, res) => {
    const user = req.user;

    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

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

        // Clear all coupons cache after save
        await redisUtils.delPattern('coupons:*');
        await redisUtils.delPattern('coupon_usage:*');
        await redisUtils.delPattern('coupon_products:*');
        console.log('🗑️ Coupons cache cleared after save');

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

        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                const query = `SELECT * FROM fn_get_coupons($1);`;
                const values = [couponId ? parseInt(couponId) : null];
                const { rows } = await pool.query(query, values);
                return rows.length > 0 ? rows : [];
            },
            600 // 10 minutes TTL for coupons
        );

        return res.status(200).json({
            success: true,
            data,
            cached
        });

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

        // Clear all coupons cache after deletion
        await redisUtils.delPattern('coupons:*');
        await redisUtils.delPattern('coupon_usage:*');
        await redisUtils.delPattern('coupon_products:*');
        console.log('🗑️ Coupons cache cleared after deletion');

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

        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                const result = await pool.query(
                    `SELECT * FROM fn_get_coupon_usage($1)`,
                    [code || null]
                );
                return result.rows.length > 0 ? result.rows : [];
            },
            600 // 10 minutes TTL for coupon usage
        );

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "No coupon(s) found" });
        }

        res.json({
            success: true,
            data,
            cached
        });

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
        const { couponId } = req.query;
        const cacheKey = couponId ? `coupon_products:${couponId}` : `coupon_products:all`;

        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                const query = `
                SELECT * 
                FROM "V_CouponProducts"
                ${couponId ? 'WHERE "CouponID" = $1' : ''}
                ORDER BY "ProductID", "Size"
            `;
                const values = couponId ? [couponId] : [];
                const result = await pool.query(query, values);
                return result.rows.length > 0 ? result.rows : [];
            },
            600 // Cache TTL = 10 minutes
        );

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "No products found for active coupons" });
        }

        return res.json({ success: true, data, cached });
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

    try {
        const { data, cached } = await redisUtils.cacheable(
            "coupons:display:all",
            async () => {
                const result = await client.query(
                    `SELECT * 
                     FROM public."CouponsMaster" 
                     WHERE "IsActive" = true
                     ORDER BY "ID" ASC`
                );
                return result.rows.length > 0 ? result.rows : [];
            },
            600 // 10 minutes TTL for display coupons
        );

        res.json({
            success: true,
            data,
            cached
        });

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
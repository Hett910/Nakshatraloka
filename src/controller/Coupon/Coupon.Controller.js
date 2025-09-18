const pool = require('../../utils/PostgraceSql.Connection');

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
            coupon.productIds || []       // p_product_ids (as JSON array)
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

// get all coupons AND single coupon
const getAllCoupons = async (req, res) => {
    const user = req.user;

    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const { couponId } = req.query; // optional query param

        const query = `SELECT * FROM fn_get_coupons($1);`;
        const values = [couponId ? parseInt(couponId) : null];

        const { rows } = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            data: rows,
        });

    } catch (error) {
        console.error("Get All Coupons Error:", error);
        return res.status(400).json({
            success: false,
            message: `Get All Coupons Error: ${error.message}`,
        });
    }
}

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

        const { code } = req.query; // pas ?code=NEW50 if needed

        const result = await pool.query(
            `SELECT * FROM fn_get_coupon_usage($1)`,
            [code || null]
        );
        // const { couponId } = req.query; // pass ?couponId=2 if needed

        // const result = await pool.query(
        //     'SELECT * FROM fn_get_coupon_usage($1)',
        //     [couponId || null]
        // );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No coupon(s) found" });
        }

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error("Delete Coupon Error:", error);
        return res.status(400).json({
            success: false,
            message: `Coupon Usage Error: ${error.message}`,
        });
    }
};


const GetCouponName = async (req, res) => {
    try {
        
    } catch (error) {
        console.error("Get All Coupons Error:", error); 
        return res.status(400).json({
            success: false,
            message: `Get All Coupons Error: ${error.message}`,
        });
    }
}

module.exports = {
    Coupon: {
        SaveCoupon,
        getAllCoupons,
        deleteCoupon,
        CouponUsage
    }
};

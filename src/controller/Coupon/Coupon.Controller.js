const pool = require('../../utils/PostgraceSql.Connection');

const SaveCoupon = async (req, res) => {
    try {

    } catch (error) {
        console.error("Save Coupon Error:", error);

        // Extract the Postgres error message
        const pgMessage = error?.message || "Internal Server Error";

        return res.status(400).json({
            success: false,
            message: `Save Coupon Error: ${pgMessage}`
        });
    }
}
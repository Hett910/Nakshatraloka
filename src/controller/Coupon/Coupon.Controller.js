const pool = require('../../utils/PostgraceSql.Connection');
const redis = require('../../utils/redisClient'); // new

// Save or update coupon
const SaveCoupon = async (req, res) => {
  try {
    const coupon = req.body;

    const query = `
      SELECT fn_save_coupon(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      ) AS message;
    `;

    const values = [
      coupon.id || 0,
      coupon.code,
      coupon.description,
      coupon.discountType,
      coupon.discountValue,
      coupon.startDate,
      coupon.endDate,
      coupon.coupenType,
      coupon.usageLimit,
      coupon.createdBy,
      coupon.updatedBy,
      coupon.minOrderAmount || 0,
      coupon.maxDiscountAmount,
      coupon.isActive ?? true,
      coupon.productIDs || []
    ];

    const { rows } = await pool.query(query, values);

    // invalidate coupon caches
    await redis.del('allCoupons');
    await redis.del('activeCouponsDisplay');

    return res.status(200).json({ success: true, message: rows[0].message });
  } catch (error) {
    console.error("Save Coupon Error:", error);
    const pgMessage = error?.message || "Internal Server Error";
    return res.status(400).json({ success: false, message: `Save Coupon Error: ${pgMessage}` });
  }
};

// Get all coupons / single coupon
const getAllCoupons = async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access Denied" });
  }

  try {
    const { couponId } = req.query;
    const cacheKey = couponId ? `coupon:${couponId}` : 'allCoupons';

    // 1️⃣ check redis
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: JSON.parse(cached) });
    }

    const query = 'SELECT * FROM fn_get_coupons($1)';
    const values = [couponId ? parseInt(couponId) : null];
    const { rows } = await pool.query(query, values);

    // 2️⃣ store in redis
    await redis.setex(cacheKey, 60, JSON.stringify(rows)); // 60 sec TTL

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Get All Coupons Error:", error);
    return res.status(400).json({ success: false, message: `Get All Coupons Error: ${error.message}` });
  }
};

// Soft delete coupon
const deleteCoupon = async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access Denied" });
  }

  try {
    const { id } = req.params;

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

    // clear cache
    await redis.del('allCoupons');
    await redis.del('activeCouponsDisplay');
    await redis.del(`coupon:${id}`);

    return res.json({ success: true, message: "Coupon deactivated successfully", coupon: rows[0] });
  } catch (error) {
    console.error("Delete Coupon Error:", error);
    return res.status(400).json({ success: false, message: `Delete Coupon Error: ${error.message}` });
  }
};

// Coupon usage
const CouponUsage = async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access Denied" });
  }

  try {
    const { code } = req.query;
    const cacheKey = code ? `couponUsage:${code}` : 'couponUsage:all';

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

    const result = await pool.query('SELECT * FROM fn_get_coupon_usage($1)', [code || null]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No coupon(s) found" });
    }

    await redis.setex(cacheKey, 60, JSON.stringify(result.rows));

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Coupon Usage Error:", error);
    return res.status(400).json({ success: false, message: `Coupon Usage Error: ${error.message}` });
  }
};

// Active coupon products
const ActiveCouponProducts = async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access Denied" });
  }

  try {
    const { couponId } = req.query;
    const cacheKey = couponId ? `activeCouponProducts:${couponId}` : 'activeCouponProducts:all';

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

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

    await redis.setex(cacheKey, 60, JSON.stringify(result.rows));

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Active Coupon Products Error:", error);
    return res.status(400).json({ success: false, message: `Error fetching products: ${error.message}` });
  }
};

// get coupons for display
const getAllCouponsForDisplay = async (req, res) => {
  const client = await pool.connect();
  try {
    const cacheKey = 'activeCouponsDisplay';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached) });
    }

    const result = await client.query(`
      SELECT * 
      FROM public."CouponsMaster" 
      WHERE "IsActive" = true
      ORDER BY "ID" ASC
    `);

    await redis.setex(cacheKey, 60, JSON.stringify(result.rows));

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching coupons:", err);
    res.status(500).json({ success: false, message: "Server Error" });
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

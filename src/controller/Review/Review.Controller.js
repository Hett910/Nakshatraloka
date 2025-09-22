const pool= require('../../utils/PostgraceSql.Connection')

const GetProductReviewSummary = async (req, res) => {
    const client = await pool.connect();
    try {
        // Get productId from request body or params
        const { productId } = req.body;  // or req.query / req.params depending on your API design
        if (!productId) {
            return res.status(400).json({ success: false, message: "ProductID is required" });
        }

        const sql = `SELECT * FROM fn_get_product_review_summary($1)`;
        const values = [productId];

        const { rows } = await client.query(sql, values);

        if (rows.length === 0) {
            return res.json({
                success: true,
                message: "No reviews found",
                data: { ProductID: productId, AvgRating: 0, TotalReviews: 0 }
            });
        }

        res.json({
            success: true,
            message: "Review summary fetched successfully",
            data: rows[0]   // { ProductID, AvgRating, TotalReviews }
        });

    } catch (error) {
        console.error("Get Product Review Summary Error:", error);
        res.status(500).json({ success: false, message: `Get Product Review Summary Error: ${error.message}` });
    } finally {
        client.release();
    }
};

const SaveProductReview = async (req, res) => {
    if (!req.user) {
        return res.status(403).json({ success: false, message: "Login required" });
    }

    const client = await pool.connect();
    try {
        let { id = 0, productId, rating, reviewText } = req.body;

        if (!productId || !rating) {
            return res.status(400).json({ success: false, message: "ProductID and Rating are required" });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        let review;

        if (id === 0) {
            // ================= CREATE =================
            const insertSql = `
                INSERT INTO "ProductReview" ("ProductID", "UserID", "Rating", "ReviewText", "Created_Date", "IsActive")
                VALUES ($1, $2, $3, $4, NOW(), TRUE)
                RETURNING "ID", "ProductID", "UserID", "Rating", "ReviewText", "Created_Date", "IsActive"
            `;
            const values = [productId, req.user.id, rating, reviewText || null];
            const result = await client.query(insertSql, values);
            review = result.rows[0];
        } else {
            // ================= UPDATE =================
            const updateSql = `
                UPDATE "ProductReview"
                SET "Rating" = $1,
                    "ReviewText" = $2,
                    "Updated_Date" = NOW()
                WHERE "ID" = $3 AND "UserID" = $4
                RETURNING "ID", "ProductID", "UserID", "Rating", "ReviewText", "Created_Date", "Updated_Date", "IsActive"
            `;
            const values = [rating, reviewText || null, id, req.user.id];
            const result = await client.query(updateSql, values);

            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: "Review not found or not authorized" });
            }
            review = result.rows[0];
        }

        res.json({
            success: true,
            message: id === 0 ? "Review created successfully" : "Review updated successfully",
            review
        });

    } catch (error) {
        console.error("Save Review Error:", error);
        res.status(500).json({ success: false, message: `Save Review Error: ${error.message}` });
    } finally {
        client.release();
    }
};

const GetReviewById = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ success: false, message: "Review ID is required" });
    }

    const client = await pool.connect();
    try {
        const sql = `
            SELECT 
                r."ID",
                r."ProductID",
                r."UserID",
                u."Name" AS "UserName",
                r."Rating",
                r."ReviewText",
                r."Created_Date",
                r."Updated_Date",
                r."IsActive"
            FROM "ProductReview" r
            LEFT JOIN "Users" u ON r."UserID" = u."ID"
            WHERE r."ID" = $1
        `;
        const { rows } = await client.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        res.json({
            success: true,
            review: rows[0]
        });

    } catch (error) {
        console.error("Get Review Error:", error);
        res.status(500).json({ success: false, message: `Get Review Error: ${error.message}` });
    } finally {
        client.release();
    }
};

// const GetReviewsByProduct = async (req, res) => {
//     const { productId } = req.params;

//     if (!productId) {
//         return res.status(400).json({ success: false, message: "ProductID is required" });
//     }
//     try {
//         const client = await pool.connect();
//          const sql = `
//             SELECT *
//             FROM public.v_active_reviews WHERE "ProductID" = $1
//             ORDER BY "Created_Date" DESC
//         `;

//         const { rows } = await client.query(sql, [productId]);

//         if (rows.length === 0) {
//             return res.status(404).json({ success: false, message: "No reviews found" });
//         }

//         res.json({
//             success: true,
//             reviews: rows
//         });

//     } catch (error) {
//         res.status(500).json({ success: false, message: `Get Reviews Error: ${error.message}` });
//     }
// }

// GET reviews by product ID

const GetReviewsByProduct = async (req, res) => {
  try {
    // Extract productId from URL params
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "ProductID is required in the URL as a param"
      });
    }

    const client = await pool.connect();

    const sql = `
      SELECT *
      FROM public.v_active_reviews
      WHERE "ProductID" = $1
      ORDER BY "Created_Date" DESC
    `;

    const { rows } = await client.query(sql, [productId]);
    client.release(); // release connection

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No reviews found for this product"
      });
    }

    res.status(200).json({
      success: true,
      reviews: rows
    });

  } catch (error) {
    console.error("GetReviewsByProduct Error:", error.message);
    res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`
    });
  }
};

const SoftDeleteReview = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id; // optional if you want track who deleted

    if (!id) {
        return res.status(400).json({ success: false, message: "Review ID is required" });
    }

    const client = await pool.connect();
    try {
        const sql = `
            UPDATE "ProductReview"
            SET "IsActive" = FALSE,
                "Updated_Date" = NOW(),
                "Updated_By" = $2
            WHERE "ID" = $1 AND "IsActive" = TRUE
            RETURNING "ID";
        `;
        const { rows } = await client.query(sql, [id, userId || null]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Review not found or already inactive" });
        }

        res.json({
            success: true,
            message: "Review soft deleted successfully",
            reviewId: rows[0].ID
        });

    } catch (error) {
        console.error("Soft Delete Review Error:", error);
        res.status(500).json({ success: false, message: `Soft Delete Review Error: ${error.message}` });
    } finally {
        client.release();
    }
};

const GetAllActiveReviews = async (req, res) => {
    if (req.user.role !== "admin") {
        console.log(req.user.role);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await pool.connect();
    try {
        // Get pagination params from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Query with pagination
        const sql = `
            SELECT *
            FROM public.v_active_reviews
            ORDER BY "Created_Date" DESC
            LIMIT $1 OFFSET $2;
        `;

        const { rows } = await client.query(sql, [limit, offset]);

        // Optionally, get total count for frontend pagination
        const countResult = await client.query(`SELECT COUNT(*) AS total FROM public.v_active_reviews;`);
        const totalReviews = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalReviews / limit);

        res.json({
            success: true,
            page,
            limit,
            totalReviews,
            totalPages,
            reviews: rows
        });
    } catch (error) {
        console.error("Get All Active Reviews Error:", error);
        res.status(500).json({ 
            success: false, 
            message: `Get All Active Reviews Error: ${error.message}` 
        });
    } finally {
        client.release();
    }
};

const GetReviewsByProductPagination = async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!productId) {
        return res.status(400).json({ success: false, message: "ProductID is required" });
    }

    const offset = (page - 1) * limit;
    const client = await pool.connect();
    try {
        const sql = `
            SELECT 
                r."ID",
                r."ProductID",
                r."UserID",
                u."Name" AS "UserName",
                r."Rating",
                r."ReviewText",
                r."Created_Date",
                r."Updated_Date"
            FROM "ProductReview" r
            LEFT JOIN "Users" u ON r."UserID" = u."ID"
            WHERE r."ProductID" = $1 AND r."IsActive" = TRUE
            ORDER BY r."Created_Date" DESC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await client.query(sql, [productId, limit, offset]);

        res.json({
            success: true,
            reviews: rows,
            pagination: { page: Number(page), limit: Number(limit) }
        });
    } catch (error) {
        console.error("Get Reviews By Product Error:", error);
        res.status(500).json({ success: false, message: `Get Reviews Error: ${error.message}` });
    } finally {
        client.release();
    }
};

const GetReviewSummary = async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        return res.status(400).json({ success: false, message: "ProductID is required" });
    }

    const client = await pool.connect();
    try {
        const sql = `
            SELECT 
                COALESCE(AVG("Rating"), 0)::NUMERIC(3,2) AS "AvgRating",
                COUNT(*) AS "TotalReviews"
            FROM "ProductReview"
            WHERE "ProductID" = $1 AND "IsActive" = TRUE
        `;
        const { rows } = await client.query(sql, [productId]);

        res.json({
            success: true,
            summary: rows[0]
        });
    } catch (error) {
        console.error("Get Review Summary Error:", error);
        res.status(500).json({ success: false, message: `Get Review Summary Error: ${error.message}` });
    } finally {
        client.release();
    }
};



module.exports = {
    Review: {
        GetProductReviewSummary,
        SaveProductReview,
        GetReviewById,
        SoftDeleteReview,
        GetReviewsByProductPagination,
        GetReviewSummary,
        GetReviewsByProduct,
        GetAllActiveReviews
    }
};
const pool = require('../../utils/PostgraceSql.Connection');
const fs = require('fs');
const path = require("path");
const { redis } = require("../../utils/redisClient.js"); // import redis instance ✅ use shared redis client

// ---------- Save / Update Product ----------
// const saveProduct = async (req, res) => {
//     if (!req.user || req.user.role !== "admin") {
//         return res.status(403).json({ success: false, message: "Access Denied" });
//     }

//     const client = await pool.connect();

//     try {
//         // 1) Text fields (from req.body)
//         let {
//             id = 0,
//             catogaryId,
//             name,
//             description = null,
//             dummyPrice = null,
//             discountPercentage = null,
//             advantages = null,
//             howToWear = null,
//             isActive = true,
//             sizes = [],      // Array of sizes
//             images = []      // Array of image objects with base64
//         } = req.body;

//         if (!catogaryId || !name) throw new Error("catogaryId and name are required");

//         // Convert to proper types
//         id = Number(id) || 0;
//         catogaryId = Number(catogaryId);
//         dummyPrice = dummyPrice ? Number(dummyPrice) : null;
//         discountPercentage = discountPercentage ? Number(discountPercentage) : null;
//         isActive = (isActive === "true" || isActive === true);

//         // Validate sizes
//         if (!Array.isArray(sizes)) throw new Error("sizes must be an array");
//         sizes = sizes.map(s => ({
//             size: Number(s.size),
//             price: Number(s.price),
//             stock: Number(s.stock)
//         }));

//         // Validate images
//         if (!Array.isArray(images) || images.length === 0) throw new Error("At least one image is required");
//         const primaryCount = images.filter(i => i.isPrimary).length;
//         if (primaryCount !== 1) throw new Error("Exactly one primary image is required");

//         // Ensure uploads folder exists
//         const uploadDir = path.join(__dirname, '../../uploads');
//         if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

//         // Convert base64 to files and prepare URLs for DB
//         images = images.map((img, idx) => {
//             const matches = img.imageData.match(/^data:(image\/\w+);base64,(.+)$/);
//             if (!matches) throw new Error("Invalid base64 image format");
//             const ext = matches[1].split("/")[1];
//             const base64Data = matches[2];
//             const filename = `product-${Date.now()}-${idx}.${ext}`;
//             const filepath = path.join(uploadDir, filename);

//             fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

//             return {
//                 image: `/uploads/${filename}`, // Store URL in DB
//                 altText: img.altText || "",
//                 isPrimary: img.isPrimary || false,
//                 isActive: img.isActive !== false
//             };
//         });

//         // 3) Save product in DB
//         await client.query("BEGIN");

//         const saveProductSql = `
//             SELECT fn_save_product_full(
//                 $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
//             ) AS product_id
//         `;
//         const saveProductVals = [
//             catogaryId,
//             name,
//             req.user.id,
//             id,
//             description,
//             dummyPrice,
//             discountPercentage,
//             advantages,
//             howToWear,
//             id ? req.user.id : null,
//             isActive,
//             JSON.stringify(sizes),
//             JSON.stringify(images) // Contains file URLs for DB
//         ];

//         const { rows } = await client.query(saveProductSql, saveProductVals);
//         const productId = rows[0].product_id;

//         await client.query("COMMIT");

//         res.json({
//             success: true,
//             message: id ? "Product updated successfully" : "Product created successfully",
//             productId
//         });

//     } catch (error) {
//         await client.query("ROLLBACK");
//         console.error("Save Product Error:", error);
//         res.status(400).json({ success: false, message: `Save Product Error: ${error.message}` });
//     } finally {
//         client.release();
//     }
// };

const saveProduct = async (req, res) => {
    const client = await pool.connect();

    try {
        let {
            id = 0,
            categoryId,
            name,
            description = null,
            advantages = null,
            howToWear = null,
            isActive = true,
            createdBy = 1,
            sizes = [],
            productRatings = null // ✅ new field
        } = req.body;

        // Parse sizes if coming as JSON string (from FormData)
        if (typeof sizes === "string") {
            try {
                sizes = JSON.parse(sizes);
            } catch (err) {
                throw new Error("sizes must be a valid JSON array");
            }
        }

        if (!Array.isArray(sizes)) throw new Error("sizes must be an array");
        if (!categoryId || !name) throw new Error("categoryId and name are required");

        id = Number(id) || 0;
        categoryId = Number(categoryId);
        isActive = (isActive === "true" || isActive === true);
        createdBy = Number(createdBy) || 1;

        // Convert sizes values to numbers
        sizes = sizes.map(s => {
            const size = s.size;
            const price = Number(s.price);
            const stock = Number(s.stock);
            const dummyPrice = s.dummyPrice != null ? Number(s.dummyPrice) : null;

            if (isNaN(price) || price <= 0) throw new Error("Each size must have a valid positive price");
            if (isNaN(stock) || stock < 0) throw new Error("Each size must have non-negative stock");
            if (!size) throw new Error("Each size must have a valid size value");

            return { size, price, dummyPrice, stock };
        });

        // ✅ handle both existing + new images
        let existingImages = [];
        if (req.body.existingImageUrls) {
            try {
                existingImages = JSON.parse(req.body.existingImageUrls);
                if (!Array.isArray(existingImages)) {
                    existingImages = [];
                }
            } catch (err) {
                console.error("Invalid existingImageUrls:", err.message);
                existingImages = [];
            }
        }

        let newImages = [];
        if (req.files && req.files.length > 0) {
            newImages = req.files.map((file, idx) => ({
                image: `${file.filename}`,
                altText: file.originalname || "",
                isPrimary: idx === 0 && existingImages.length === 0, // primary only if no existing
                isActive: true
            }));
        }

        const images = [...existingImages, ...newImages];

        // ✅ final validation
        if (images.length === 0) {
            throw new Error("At least one image is required");
        }

        await client.query("BEGIN");

        const saveProductSql = `
      SELECT fn_save_product_full(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      ) AS product_id
    `;

        const saveProductVals = [
            categoryId,                     // $1
            name,                           // $2
            createdBy,                      // $3
            id,                             // $4
            description,                    // $5
            advantages,                     // $6
            howToWear,                      // $7
            id ? (req.user?.id || createdBy) : null, // $8 updated_by
            isActive,                       // $9
            JSON.stringify(sizes),          // $10
            JSON.stringify(images),         // $11
            productRatings                  // $12 ✅ new param
        ];

        const { rows } = await client.query(saveProductSql, saveProductVals);
        const productId = rows[0].product_id;

        await client.query("COMMIT");

        res.json({
            success: true,
            message: id ? "Product updated successfully" : "Product created successfully",
            productId
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Save Product Error:", error);
        res.status(400).json({ success: false, message: `Save Product Error: ${error.message}` });
    } finally {
        client.release();
    }
};





// ---------- Get All Products ----------
// ✅ Get All Products with Redis cache


const getAllProducts = async (req, res) => {
    try {
        const cacheKey = 'products:all';

        // 1️⃣ Check Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log('⚡ Serving all products from Redis cache');
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Fetch from PostgreSQL
        const { rows } = await pool.query(`SELECT * FROM fn_get_products();`);

        if (!rows.length) {
            return res.json({ success: false, message: 'No products found' });
        }

        const responseData = { success: true, data: rows };

        // 3️⃣ Store in Redis for 1 hour
        await redis.setEx(cacheKey, 3600, JSON.stringify(responseData));

        // 4️⃣ Return response
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: `Get Products Error: ${error.message}`,
        });
    }
};

// const getAllProducts = async (req, res) => {
//     try {
//         const cacheKey = "products:all";

//         // 1️⃣ Check Redis cache
//         const cachedData = await redis.get(cacheKey);
//         if (cachedData) {
//             console.log("⚡ Serving all products from Redis cache");
//             return res.json(JSON.parse(cachedData));
//         }

//         // 2️⃣ Fetch from PostgreSQL
//         const { rows } = await pool.query(`SELECT * FROM fn_get_products();`);

//         if (!rows.length) {
//             return res.json({ success: false, message: "No products found" });
//         }

//         const responseData = { success: true, data: rows };

//         // 3️⃣ Store in Redis for 1 hour
//         await redis.setEx(cacheKey, 3600, JSON.stringify(responseData));

//         res.json(responseData);
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).json({
//             success: false,
//             message: `Get Products Error: ${error.message}`,
//         });
//     }
// };


// ---------- Get Product by ID ----------
// const getProductById = async (req, res) => {
//     try {
//         const productId = parseInt(req.params.id);
//         const { rows } = await pool.query(`SELECT * FROM fn_get_product_by_id($1);`, [productId]);
//         if (!rows.length) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }
//         res.json({ success: true, data: rows[0] });
//     } catch (error) {
//         console.error('Error fetching product:', error);
//         res.status(500).json({ success: false, message: `Get Product Error: ${error.message}` });
//     }
// };

// ✅ Get Product By ID with Redis cache


const getProductById = async (req, res) => {
    try {
        // ✅ 1. Parse and validate productId
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
        }

        const cacheKey = `product:${productId}`;

        // ✅ 2. Try Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving product from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // ✅ 3. Fetch from PostgreSQL if not in cache
        const { rows } = await pool.query(
            `SELECT * FROM fn_get_product_by_id($1::integer)`, // ← explicit cast fixes the error
            [productId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const product = rows[0].product;

        // ✅ 4. Map imageData properly
        if (product.images && Array.isArray(product.images)) {
            product.images = product.images.map((img) => ({
                ...img,
                imageData: img.imageData
                    ? `http://localhost:8001${img.imageData}`
                    : null,
            }));
        }

        const responseData = { success: true, data: { product } };

        // ✅ 5. Store in Redis (TTL = 1 hour or from env)
        const ttl = process.env.REDIS_CACHE_TTL
            ? parseInt(process.env.REDIS_CACHE_TTL, 10)
            : 3600;
        await redis.setEx(cacheKey, ttl, JSON.stringify(responseData));

        // ✅ 6. Send response
        res.json(responseData);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({
            success: false,
            message: `Get Product Error: ${error.message}`,
        });
    }
};


// ---------- Soft Delete Product ----------
const deleteProduct = async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access Denied' });
    }

    try {
        const productId = parseInt(req.params.id);
        const { rows } = await pool.query(`
            UPDATE "ProductMaster"
            SET "IsActive" = FALSE, "Updated_By" = $2, "Updated_Date" = NOW()
            WHERE "ID" = $1
            RETURNING "ID";
        `, [productId, req.user.id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product deleted successfully', productId: rows[0].ID });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: `Delete Product Error: ${error.message}` });
    }
};

// ✅ Get 4 Products for Screen with Redis cache
const GetProductForScreen = async (req, res) => {
    try {
        const cacheKey = "products:four";

        // 1️⃣ Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving 4 products from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Fetch from PostgreSQL
        const { rows } = await pool.query(`SELECT * FROM "V_Four_Product";`);

        if (!rows.length) {
            return res.json({ success: false, message: "No products found" });
        }

        const responseData = { success: true, data: rows };

        // 3️⃣ Cache result for 1 hour (3600s)
        await redis.setEx(cacheKey, 3600, JSON.stringify(responseData));

        res.json(responseData);

    } catch (error) {
        console.error("Fetch 4 products Error:", error);
        res.status(500).json({
            success: false,
            message: `Fetch 4 products Error: ${error.message}`,
        });
    }
};



// ✅ Get Four Categories with Redis cache
const GetFourCategories = async (req, res) => {
    try {
        const cacheKey = "categories:four";

        // 1️⃣ Check Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving 4 categories from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Fetch from DB if not cached
        const { rows } = await pool.query(`SELECT * FROM "V_Four_Categories";`);

        if (!rows.length) {
            return res.json({ success: false, message: "No categories found" });
        }

        const responseData = { success: true, data: rows };

        // 3️⃣ Cache the result for 1 hour (3600 seconds)
        await redis.setEx(cacheKey, 3600, JSON.stringify(responseData));

        res.json(responseData);

    } catch (error) {
        console.error("Fetch 4 categories Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching categories"
        });
    }
};



// ✅ Get Gemstone Products with Redis cache
const GetGemstoneProducts = async (req, res) => {
    try {
        const cacheKey = "products:gemstones";

        // 1️⃣ Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving gemstone products from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Fetch from PostgreSQL
        const query = `SELECT * FROM "V_Get_Gemstone_Details";`;
        const { rows } = await pool.query(query);

        const responseData = { success: true, data: rows };

        // 3️⃣ Cache result for 1 hour (3600s)
        await redis.setEx(cacheKey, 3600, JSON.stringify(responseData));

        res.json(responseData);

    } catch (error) {
        console.error("Fetch gemstone products error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching gemstone products"
        });
    }
};



// const GetProductDetails = async (req, res) => {
//     try {
//         const { productId } = req.params;

//         const productQuery = `
//             SELECT *
//             FROM "ProductMaster"
//             WHERE "ID" = $1 AND "IsActive" = TRUE;
//         `;
//         const { rows: product } = await pool.query(productQuery, [productId]);


//         if (!product.length) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }

//         const imagesQuery = `
//             SELECT "Image", "Alt_Text", "IsPrimary"
//             FROM "ProductImages"
//             WHERE "ProductID" = $1 AND "IsActive" = TRUE
//             ORDER BY "IsPrimary" DESC, "ID";
//         `;
//         const { rows: images } = await pool.query(imagesQuery, [productId]);

//         res.json({ success: true, product: product[0], images });
//     } catch (error) {
//         console.error("Fetch product details error:", error);
//         res.status(500).json({ success: false, message: "Error fetching product details" });
//     }
// };


// getProductsByCategory.js

// ✅ Get Product Details with Redis cache
const GetProductDetails = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({ success: false, message: "ProductID is required" });
        }

        const cacheKey = `product:details:${productId}`;

        // 1️⃣ Check cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving Product Details from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Fetch product
        const productQuery = `
      SELECT *
      FROM "ProductMaster"
      WHERE "ID" = $1 AND "IsActive" = TRUE;
    `;
        const { rows: product } = await pool.query(productQuery, [productId]);

        if (!product.length) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // 3️⃣ Fetch product images
        const imagesQuery = `
      SELECT encode("Image", 'base64') AS "ImageBase64",
             "Alt_Text",
             "IsPrimary"
      FROM "ProductImages"
      WHERE "ProductID" = $1 AND "IsActive" = TRUE
      ORDER BY "IsPrimary" DESC, "ID";
    `;
        const { rows: images } = await pool.query(imagesQuery, [productId]);

        // 4️⃣ Fetch ratings (avg + count)
        const ratingQuery = `
      SELECT 
          COALESCE(AVG("Rating"), 0)::NUMERIC(2,1) AS "AvgRating",
          COUNT(*) AS "ReviewCount"
      FROM "ProductReview"
      WHERE "ProductID" = $1 AND "IsActive" = TRUE;
    `;
        const { rows: ratings } = await pool.query(ratingQuery, [productId]);

        // 5️⃣ Prepare response
        const responseData = {
            success: true,
            product: product[0],
            images,
            ratings: ratings[0], // { AvgRating: 4.2, ReviewCount: 15 }
        };

        // 6️⃣ Cache in Redis (10 min TTL for product details)
        await redis.setEx(cacheKey, 600, JSON.stringify(responseData));

        res.json(responseData);

    } catch (error) {
        console.error("Fetch product details error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching product details"
        });
    }
};



// ✅ Get Products By Category with Redis Cache
const GetProductsByCategory = async (req, res) => {
    const client = await pool.connect();
    try {
        const { categoryName, page = 1, limit = 20 } = req.body;

        if (!categoryName || typeof categoryName !== "string" || !categoryName.trim()) {
            return res.status(400).json({ success: false, message: "Valid categoryName is required" });
        }

        const categoryNameClean = `%${categoryName.trim()}%`; // pattern matching
        const pageNum = Number(page) > 0 ? Number(page) : 1;
        const limitNum = Number(limit) > 0 ? Number(limit) : 20;
        const offset = (pageNum - 1) * limitNum;

        // 🔑 Redis cache key
        const cacheKey = `products:category:${categoryName.trim().toLowerCase()}:page:${pageNum}:limit:${limitNum}`;

        // 🔹 1) Try Redis first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // 🔹 2) If no cache, query DB
        const sql = `
            SELECT * FROM fn_get_products_by_category($1)
            ORDER BY "ProductID" ASC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await client.query(sql, [categoryNameClean, limitNum, offset]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: `No products found for category ${categoryName.trim()}` });
        }

        const response = {
            success: true,
            page: pageNum,
            limit: limitNum,
            count: rows.length,
            products: rows
        };

        // 🔹 3) Save result in Redis (set TTL for freshness, e.g., 300 sec = 5 min)
        await redis.setEx(cacheKey, 300, JSON.stringify(response));

        res.json(response);
    } catch (error) {
        console.error("Get Products Error:", error);
        res.status(500).json({ success: false, message: `Get Products Error: ${error.message}` });
    } finally {
        client.release();
    }
};


// ✅ Toggle Featured Product with Redis cache invalidation
const toggleFeaturedProduct = async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const client = await pool.connect();
    try {
        const { id } = req.params;

        // Get current state
        const productResult = await client.query(
            `SELECT "IsFeatured" FROM "ProductMaster" WHERE "ID" = $1`,
            [id]
        );

        if (productResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const currentState = productResult.rows[0].IsFeatured;
        const newState = !currentState; // flip it

        if (newState) {
            // Count how many are already featured
            const countResult = await client.query(
                `SELECT COUNT(*) FROM "ProductMaster" WHERE "IsFeatured" = true`
            );
            if (parseInt(countResult.rows[0].count) >= 4) {
                return res.status(400).json({
                    success: false,
                    message: "You can only feature up to 4 products at a time"
                });
            }
        }

        // Update product
        await client.query(
            `UPDATE "ProductMaster"
             SET "IsFeatured" = $1,
                 "Updated_By" = $2,
                 "Updated_Date" = NOW()
             WHERE "ID" = $3`,
            [newState, req.user.id, id]
        );

        // ✅ Invalidate relevant cache keys
        await Promise.all([
            redis.del("products:active:names"),
            redis.del("products:featured"),
            redis.del(`product:${id}`)
        ]);

        res.json({
            success: true,
            message: `Product ${newState ? "featured" : "removed from featured"} successfully`
        });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};


// ✅ Get all featured products (max 4)
const getFeaturedProducts = async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM "V_FeaturedProducts"`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        console.error("Error fetching featured products:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    } finally {
        client.release();
    }
};


const getProductWithName = async (req, res) => {
    const cacheKey = "products:active:names"; // 🔑 unique key for this query

    try {
        // 1️⃣ Check cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving products from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Query DB if not cached
        const query = `SELECT "ID","Name" FROM "ProductMaster" WHERE "IsActive" = TRUE;`;
        const result = await pool.query(query);

        const responseData = {
            success: true,
            data: result.rows,
        };

        // 3️⃣ Save result in Redis with TTL (e.g., 10 mins)
        await redis.set(cacheKey, JSON.stringify(responseData), { EX: 600 });

        res.json(responseData);
    } catch (err) {
        console.error("❌ Error fetching products with name:", err);
        res.status(500).json({
            success: false,
            message: "Server Error: " + err.message,
        });
    }
    finally {
        pool.release();
    }
};


const getFilteredProducts = async (req, res) => {
    const client = await pool.connect();
    try {
        // 📌 Extract filters from query parameters
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const categoryName = req.query.categoryName || null;
        const rating = req.query.rating ? parseFloat(req.query.rating) : null;

        // 📌 Create unique cache key for given filters
        const cacheKey = `filtered_products:min=${minPrice || "null"}:max=${maxPrice || "null"
            }:cat=${categoryName || "null"}:rating=${rating || "null"}`;

        // 1️⃣ Check Redis cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Query DB if not cached
        const query = `
      SELECT * 
      FROM public.get_filtered_products($1, $2, $3, $4);
    `;
        const values = [minPrice, maxPrice, categoryName, rating];
        const result = await client.query(query, values);

        const responseData = {
            success: true,
            filters: { minPrice, maxPrice, categoryName, rating },
            data: result.rows,
        };

        // 3️⃣ Save to Redis with TTL (5 mins)
        await redis.set(cacheKey, JSON.stringify(responseData), { EX: 300 });

        res.json(responseData);
    } catch (err) {
        console.error("❌ Error fetching filtered products:", err);
        res
            .status(500)
            .json({ success: false, message: "Server Error: " + err.message });
    } finally {
        client.release(); // ✅ always release
    }
};

module.exports = {
    Product: {
        saveProduct,
        getAllProducts,
        getProductById,
        deleteProduct,
        GetProductForScreen,
        GetFourCategories,
        GetGemstoneProducts,
        GetProductDetails,
        GetProductsByCategory,
        toggleFeaturedProduct,
        getFeaturedProducts,
        getProductWithName,
        getFilteredProducts
    }
};

const pool = require('../../utils/PostgraceSql.Connection');
const fs = require('fs');
const path = require("path");

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
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const client = await pool.connect();

    try {
        // 1) Text fields (from req.body)
        let {
            id = 0,
            catogaryId,
            name,
            description = null,
            advantages = null,
            howToWear = null,
            isActive = true,
            sizes = [],      // Array of sizes
            images = []      // Array of image objects with base64
        } = req.body;

        if (!catogaryId || !name) throw new Error("catogaryId and name are required");

        // Convert to proper types
        id = Number(id) || 0;
        catogaryId = Number(catogaryId);
        isActive = (isActive === "true" || isActive === true);

        // Validate sizes
        if (!Array.isArray(sizes)) throw new Error("sizes must be an array");
        sizes = sizes.map(s => ({
            size: Number(s.size),
            price: Number(s.price),
            dummyPrice: s.dummyPrice ? Number(s.dummyPrice) : null,
            stock: Number(s.stock)
        }));

        // Validate images
        if (!Array.isArray(images) || images.length === 0) throw new Error("At least one image is required");
        const primaryCount = images.filter(i => i.isPrimary).length;
        if (primaryCount !== 1) throw new Error("Exactly one primary image is required");

        // Ensure uploads folder exists
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Convert base64 to files and prepare URLs for DB
        images = images.map((img, idx) => {
            const matches = img.imageData.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!matches) throw new Error("Invalid base64 image format");
            const ext = matches[1].split("/")[1];
            const base64Data = matches[2];
            const filename = `product-${Date.now()}-${idx}.${ext}`;
            const filepath = path.join(uploadDir, filename);

            fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

            return {
                image: `/uploads/${filename}`, // Store URL in DB
                altText: img.altText || "",
                isPrimary: img.isPrimary || false,
                isActive: img.isActive !== false
            };
        });

        // 3) Save product in DB
        await client.query("BEGIN");

        const saveProductSql = `
            SELECT fn_save_product_full(
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
            ) AS product_id
        `;
        const saveProductVals = [
            catogaryId,          // $1
            name,                // $2
            req.user.id,         // $3 created_by
            id,                  // $4 product_id
            description,         // $5
            advantages,          // $6
            howToWear,           // $7
            id ? req.user.id : null, // $8 updated_by
            isActive,            // $9
            JSON.stringify(sizes),   // $10
            JSON.stringify(images)   // $11
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
const getAllProducts = async (req, res) => {


    try {
        const { rows } = await pool.query(`SELECT * FROM fn_get_products();`);
        if (!rows.length) {
            return res.json({ success: false, message: 'No products found' });
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: `Get Products Error: ${error.message}` });
    }
};

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

const getProductById = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { rows } = await pool.query(
            `SELECT * FROM fn_get_product_by_id($1);`,
            [productId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = rows[0].product;

        // ✅ Format images
        if (product.images && Array.isArray(product.images)) {
            product.images = product.images.map(img => ({
                ...img,
                imageData: img.imageData
                    ? `http://localhost:8001/uploads/${img.imageData}`
                    : null
            }));
        }

        res.json({ success: true, data: { product } });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ success: false, message: `Get Product Error: ${error.message}` });
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

const GetProductForScreen = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM "V_Four_Product";`);
        if (!rows.length) {
            return res.json({ success: false, message: 'No products found' });
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch 4 products Error:', error);
        res.status(500).json({ success: false, message: `Fetch 4 products Errorr: ${error.message}` });
    }
};


const GetFourCategories = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM "V_Four_Categories";`);
        if (!rows.length) {
            return res.json({ success: false, message: 'No categories found' });
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch 4 categories Error:', error);
        res.status(500).json({ success: false, message: `Fetch 4 categories Error: ${error.message}` });
    }
};


const GetGemstoneProducts = async (req, res) => {
    try {
        const query = `SELECT * FROM "V_Get_Gemstone_Details";`;

        const { rows } = await pool.query(query);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Fetch gemstone products error:", error);
        res.status(500).json({ success: false, message: "Error fetching gemstone products" });
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

const GetProductDetails = async (req, res) => {
    try {
        const { productId } = req.params;

        // 1) Fetch product
        const productQuery = `
            SELECT *
            FROM "ProductMaster"
            WHERE "ID" = $1 AND "IsActive" = TRUE;
        `;
        const { rows: product } = await pool.query(productQuery, [productId]);

        if (!product.length) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // 2) Fetch product images
        const imagesQuery = `
            SELECT encode("Image", 'base64') AS "ImageBase64",
                   "Alt_Text",
                   "IsPrimary"
            FROM "ProductImages"
            WHERE "ProductID" = $1 AND "IsActive" = TRUE
            ORDER BY "IsPrimary" DESC, "ID";
        `;
        const { rows: images } = await pool.query(imagesQuery, [productId]);

        // 3) Fetch ratings (avg + count)
        const ratingQuery = `
            SELECT 
                COALESCE(AVG("Rating"), 0)::NUMERIC(2,1) AS "AvgRating",
                COUNT(*) AS "ReviewCount"
            FROM "ProductReview"
            WHERE "ProductID" = $1 AND "IsActive" = TRUE;
        `;
        const { rows: ratings } = await pool.query(ratingQuery, [productId]);

        res.json({
            success: true,
            product: product[0],
            images,
            ratings: ratings[0]  // { AvgRating: 4.2, ReviewCount: 15 }
        });

    } catch (error) {
        console.error("Fetch product details error:", error);
        res.status(500).json({ success: false, message: "Error fetching product details" });
    }
};


    // getProductsByCategory.js
  const GetProductsByCategory = async (req, res) => {
    const client = await pool.connect();
    try {
        const { categoryName, page = 1, limit = 20 } = req.body;

        if (!categoryName || typeof categoryName !== "string" || !categoryName.trim()) {
            return res.status(400).json({ success: false, message: "Valid categoryName is required" });
        }

        const categoryNameClean = `%${categoryName.trim()}%`; // Added % for pattern matching if needed
        const pageNum = Number(page) > 0 ? Number(page) : 1;
        const limitNum = Number(limit) > 0 ? Number(limit) : 20;
        const offset = (pageNum - 1) * limitNum;

        const sql = `
            SELECT * FROM fn_get_products_by_category($1)
            ORDER BY "ProductID" ASC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await client.query(sql, [categoryNameClean, limitNum, offset]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: `No products found for category ${categoryName.trim()}` });
        }

        res.json({
            success: true,
            page: pageNum,
            limit: limitNum,
            count: rows.length,
            products: rows
        });
    } catch (error) {
        console.error("Get Products Error:", error);
        res.status(500).json({ success: false, message: `Get Products Error: ${error.message}` });
    } finally {
        client.release();
    }
};


// ✅ Toggle Featured Product
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
    try {
        const query = `SELECT "ID","Name" FROM "ProductMaster" WHERE "IsActive" = TRUE;`;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (err) {
        console.error("Error fetching featured products:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
}


const getFilteredProducts = async (req, res) => {

    const client = await pool.connect();
    try {
        // Extract filters from query parameters
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const categoryName = req.query.categoryName || null;
        const rating = req.query.rating ? parseFloat(req.query.rating) : null;

        const query = `
            SELECT * FROM public.get_filtered_products($1, $2, $3, $4);
        `;
        const values = [minPrice, maxPrice, categoryName, rating];

        const result = await client.query(query, values);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        console.error("Error fetching filtered products:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
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

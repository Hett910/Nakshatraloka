const pool = require('../../utils/PostgraceSql.Connection');
const fs = require('fs');
const path = require("path");

// ---------- Save / Update Product ----------

// const saveProduct = async (req, res) => {
//     const client = await pool.connect();

//     try {
//         let {
//             id = 0,
//             categoryId,
//             name,
//             description = null,
//             advantages = null,
//             howToWear = null,
//             isActive = true,
//             createdBy = 1,
//             sizes = []
//         } = req.body;

//         // Parse sizes if coming as JSON string (from FormData)
//         if (typeof sizes === "string") {
//             try {
//                 sizes = JSON.parse(sizes);
//             } catch (err) {
//                 throw new Error("sizes must be a valid JSON array");
//             }
//         }

//         if (!Array.isArray(sizes)) throw new Error("sizes must be an array");

//         if (!categoryId || !name) throw new Error("categoryId and name are required");

//         id = Number(id) || 0;
//         categoryId = Number(categoryId);
//         isActive = (isActive === "true" || isActive === true);
//         createdBy = Number(createdBy) || 1;

//         // Convert sizes values to numbers
//         sizes = sizes.map(s => {
//             const size = s.size; // keep as-is, can be string or number
//             const price = Number(s.price);
//             const stock = Number(s.stock);
//             const dummyPrice = s.dummyPrice != null ? Number(s.dummyPrice) : null;

//             // Validate price and stock
//             if (isNaN(price) || price <= 0) {
//                 throw new Error("Each size must have a valid positive price");
//             }
//             if (isNaN(stock) || stock < 0) {
//                 throw new Error("Each size must have non-negative stock");
//             }

//             // Validate size
//             if (size === null || size === undefined || size === "") {
//                 throw new Error("Each size must have a valid size value");
//             }

//             return { size, price, dummyPrice, stock };
//         });



//         // Validate uploaded files (from multer)
//         if (!req.files || req.files.length === 0) throw new Error("At least one image is required");

//         const images = req.files.map((file, idx) => ({
//             image: `/${file.filename}`, // store path
//             altText: file.originalname || "",
//             isPrimary: idx === 0, // first image is primary
//             isActive: true
//         }));

//         // Save product in DB
//         await client.query("BEGIN");

//         const saveProductSql = `
//             SELECT fn_save_product_full(
//                 $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
//             ) AS product_id
//         `;

//         const saveProductVals = [
//             categoryId,                     // $1
//             name,                           // $2
//             createdBy,                      // $3
//             id,                             // $4
//             description,                    // $5
//             advantages,                     // $6
//             howToWear,                      // $7
//             id ? (req.user?.id || createdBy) : null, // $8 updated_by
//             isActive,                       // $9
//             JSON.stringify(sizes),          // $10
//             JSON.stringify(images)          // $11
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
                image: `/${file.filename}`,
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
const getAllProducts = async (req, res) => {


    try {
        const { rows } = await pool.query(`SELECT * FROM fn_get_products();`);
        if (!rows.length) {
            return res.json({ success: true, message: 'No products found' });
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
//         const { rows } = await pool.query(`SELECT * FROM fn_get_products($1);`, [productId]);
//         if (!rows.length) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }
//         res.json({ success: true, data: rows[0] });
//     } catch (error) {
//         console.error('Error fetching product:', error);
//         res.status(500).json({ success: false, message: `Get Product Error: ${error.message}` });
//     }
// };


// const getProductById = async (req, res) => {
//     try {
//         const productId = parseInt(req.params.id);
//         const { rows } = await pool.query(
//             `SELECT * FROM fn_get_product_by_id($1);`,
//             [productId]
//         );

//         if (!rows.length) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }

//         const product = rows[0].product;

//         // ✅ Format images
//         if (product.images && Array.isArray(product.images)) {
//             product.images = product.images.map(img => ({
//                 ...img,
//                 imageData: img.imageData
//                     ? `http://localhost:8001/uploads/${img.imageData}`
//                     : null
//             }));
//         }

//         res.json({ success: true, data: { product } });
//     } catch (error) {
//         console.error('Error fetching product:', error);
//         res.status(500).json({ success: false, message: `Get Product Error: ${error.message}` });
//     }
// };


const getProductById = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        const { rows } = await pool.query(
            `SELECT * FROM fn_get_product_by_id($1)`,
            [productId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = rows[0].product;

        // Fix: Map imageData properly with filename stored in DB
        // if (product.images && Array.isArray(product.images)) {
        //     product.images = product.images.map(img => ({
        //         ...img,
        //         imageData: img.imageData
        //             ? `http://localhost:8001/uploads/${img.imageData}`
        //             : null
        //     }));
        // }

        if (product.images && Array.isArray(product.images)) {
            product.images = product.images.map(img => ({
                ...img,
                imageData: img.imageData
                    ? `http://localhost:8001${img.imageData}` // ✅ no extra /uploads
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
            SET "IsActive" = FALSE, "Updated_By" = $2, "Updated_Date" = NOW(), "IsFeatured" = FALSE
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
    // console.log("API /getCategories called");
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

const GetProductDetails = async (req, res) => {
    try {
        const { productId } = req.params;

        const productQuery = `
            SELECT *
            FROM "ProductMaster"
            WHERE "ID" = $1 AND "IsActive" = TRUE;
        `;
        const { rows: product } = await pool.query(productQuery, [productId]);


        if (!product.length) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const imagesQuery = `
            SELECT "Image", "Alt_Text", "IsPrimary"
            FROM "ProductImages"
            WHERE "ProductID" = $1 AND "IsActive" = TRUE
            ORDER BY "IsPrimary" DESC, "ID";
        `;
        const { rows: images } = await pool.query(imagesQuery, [productId]);

        res.json({ success: true, product: product[0], images });
    } catch (error) {
        console.error("Fetch product details error:", error);
        res.status(500).json({ success: false, message: "Error fetching product details" });
    }
};

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


// getProductsByCategory.js
const GetProductsByCategory = async (req, res) => {
    const client = await pool.connect();
    try {
        const { categoryName, page = 1, limit = 20 } = req.body;

        if (!categoryName || typeof categoryName !== "string" || !categoryName.trim()) {
            return res.status(400).json({ success: false, message: "Valid categoryName is required" });
        }

        const categoryNameClean = categoryName.trim();
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
            return res.status(404).json({ success: false, message: `No products found for category "${categoryNameClean}"` });
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

const GetProductForCoupon = async (req, res) => {
    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT "ID", "Name" 
             FROM "ProductMaster" 
             WHERE "IsActive" = true`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        console.error("Error fetching active products:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
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
        getFilteredProducts,
        toggleFeaturedProduct,
        getFeaturedProducts,
        GetProductForCoupon
    }
};

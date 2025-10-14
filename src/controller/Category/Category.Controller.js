const express = require('express');
const { SaveCatogaryValidation } = require('../../utils/Validation')
const pool = require('../../utils/PostgraceSql.Connection');
const { validationResult } = require('express-validator');
const { redisUtils } = require('../../utils/redisClient'); // Import redisUtils




// const saveCategory = async (req, res) => {

//     const user = req.user;

//     if (user.role !== "admin") {
//         return res.status(403).json({ success: false, message: "Access Denied" });
//     }
//     try {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, errors: errors.array() });
//         }

//         const { id, name, description, isShown, isFeatured } = req.body;

//         // User ID comes from JWT token (auth middleware)
//         const userId = req.user.id; // make sure auth middleware sets this

//         // Handle uploaded image(s)
//         let imagePath = null;
//         if (req.files && req.files.length > 0) {
//             imagePath = req.files[0].filename; // save only first image, or join multiple if needed
//         }

//         // Decide who is creator/updater
//         const createdBy = id == 0 ? userId : null;
//         const updatedBy = id > 0 ? userId : null;

//         // SQL function call
//         const query = `
//             SELECT public."fn_save_catogary"($1, $2, $3, $4, $5, $6, $7)
//         `;

//         const SaveCatogary = await pool.query(query, [
//             parseInt(id) || 0,
//             name,
//             description,
//             createdBy,
//             updatedBy,
//             isFeatured === 'false' || isFeatured === true,
//             imagePath
//         ]);

//         res.json({
//             success: true,
//             message: SaveCatogary.rows[0].fn_save_catogary,
//             image: imagePath,
//             isFeatured: isFeatured === 'true' || isFeatured === true
//         });

//     } catch (error) {
//         console.error('Error saving category:', error);

//         if (error.code === 'P0001') {
//             return res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         res.status(500).json({
//             success: false,
//             message: 'Internal Server Error',
//             error: error.message
//         });
//     }
// };
const saveCategory = async (req, res) => {
    const user = req.user;

    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            id,
            name,
            description,
            createdBy,
            updatedBy,
            isActive,
            isFeatured,
            image
        } = req.body;

        let imagePath = image || null;
        if (req.files && req.files.length > 0) {
            imagePath = `/${req.files[0].filename}`;
        }

        const creatorId = id ? null : createdBy || user.id;
        const updaterId = user.id;

        const query = `SELECT public."fn_save_catogary"($1, $2, $3, $4, $5, $6, $7, $8)`;
        const result = await pool.query(query, [
            id || 0, name, description || null, creatorId, updaterId,
            isActive !== undefined ? isActive : true,
            isFeatured !== undefined ? isFeatured : false,
            imagePath || null
        ]);

        if (result.rows.length > 0) {
            // Clear all category-related cache after save
            await redisUtils.delPattern('categories:*');
            await redisUtils.del('all_categories');
            await redisUtils.del('featured_categories');

            console.log('✅ Category saved, cache cleared');

            return res.json({
                success: true,
                message: result.rows[0].fn_save_catogary,
                image: imagePath,
                isFeatured: isFeatured !== undefined ? isFeatured : false
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Error occurred while saving category"
            });
        }

    } catch (error) {
        console.error('Error saving category:', error);

        if (error.code === 'P0001') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

const getAllCategory = async (req, res) => {
    try {
        const { data, cached } = await redisUtils.cacheable(
            'all_categories',
            async () => {
                const query = `SELECT * FROM public."v_getallcatogary"`;
                const { rows } = await pool.query(query);
                return rows.length > 0 ? rows : null;
            },
            600 // 10 minutes
        );

        if (!data) {
            return res.json({
                success: false,
                message: "No data to show",
            });
        }

        return res.status(200).json({
            success: true,
            data,
            cached // Optional: to know if data came from cache
        });
    } catch (error) {
        console.error("Error fetching all category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const getAllFeaturedCategory = async (req, res) => {
    try {
        const { data, cached } = await redisUtils.cacheable(
            'featured_categories',
            async () => {
                const query = `SELECT * FROM public."v_getallcatogary" WHERE "IsFeatured" = TRUE LIMIT 4`;
                const { rows } = await pool.query(query);
                return rows.length > 0 ? rows : null;
            },
            3600 // 1 hour for featured categories
        );

        if (!data) {
            return res.json({
                success: false,
                message: "No featured categories found"
            });
        }

        return res.status(200).json({
            success: true,
            data,
            cached
        });

    } catch (error) {
        console.error("Error fetching featured categories:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const getCatogaryById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `category:${id}`;

        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                const query = `SELECT * FROM public."v_getallcatogary" WHERE "ID" = $1`;
                const { rows } = await pool.query(query, [id]);
                return rows.length > 0 ? rows[0] : null;
            },
            600 // 10 minutes
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Category with specific request not found",
            });
        }

        return res.status(200).json({
            success: true,
            data,
            cached
        });
    } catch (error) {
        console.error("Error fetching specific category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const deleteCategory = async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(401).json({
            success: false,
            message: 'Access Forbidden'
        });
    }

    try {
        const { id } = req.params;
        const { updatedBy } = req.body;
        const query = `UPDATE "CatogaryMaster" SET "IsActive" = FALSE, "IsFeatured" = FALSE, "Updated_Date" = CURRENT_TIMESTAMP, "Updated_By" = $2 WHERE "ID" = $1`;

        const result = await pool.query(query, [id, updatedBy]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Category with ID ${id} not found`,
            });
        }

        // Clear all category cache after deletion
        await redisUtils.delPattern('categories:*');
        await redisUtils.del('all_categories');
        await redisUtils.del('featured_categories');
        console.log('🗑️ Category deleted, cache cleared');

        return res.status(200).json({
            success: true,
            message: `Category deleted successfully`,
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

module.exports = {
    Catogary: {
        saveCategory,
        getAllCategory,
        getCatogaryById,
        deleteCategory,
        getAllFeaturedCategory
    }
}
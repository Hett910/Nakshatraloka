const express = require('express');
const { SaveCatogaryValidation } = require('../../utils/Validation')
const pool = require('../../utils/PostgraceSql.Connection');
const { validationResult } = require('express-validator');



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

    // Check if user is admin
    if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Destructure input fields from request body
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

        // Handle uploaded image(s) from multipart/form-data (optional)
        let imagePath = image || null;
        if (req.files && req.files.length > 0) {
            imagePath = `/${req.files[0].filename}`; // take first file
        }

        // Decide who is creator/updater
        const creatorId = id ? null : createdBy || user.id; // for update, don't change creator
        const updaterId = user.id; // whoever is updating

        // Call PostgreSQL function
        const query = `
            SELECT public."fn_save_catogary"($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        const result = await pool.query(query, [
            id || 0,                             // p_id
            name,                                // p_name
            description || null,                 // p_description
            creatorId,                           // p_created_by
            updaterId,                           // p_updated_by
            isActive !== undefined ? isActive : true,   // p_isactive
            isFeatured !== undefined ? isFeatured : false, // p_isfeatured
            imagePath || null                     // p_image
        ]);

        if (result.rows.length > 0) {
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

        if (error.code === 'P0001') { // PostgreSQL exception
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
        const query = `
            SELECT * from public."v_getallcatogary"
        `;

        const { rows } = await pool.query(query)

        if (rows.length > 0) {
            res.status(200).json({
                success: true,
                data: rows
            });
        } else {
            res.json({
                success: false,
                message: "No data to show"
            });
        }

    } catch (error) {
        console.error('Error fetching all category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}


// ---------- Get All Featured Categories ----------
const getAllFeaturedCategory = async (req, res) => {
    try {
        const query = `
            SELECT * 
            FROM public."v_getallcatogary"
            WHERE "IsFeatured" = TRUE LIMIT 4
        `;

        const { rows } = await pool.query(query);

        if (rows.length > 0) {
            res.status(200).json({
                success: true,
                data: rows
            });
        } else {
            res.json({
                success: false,
                message: "No featured categories found"
            });
        }

    } catch (error) {
        console.error('Error fetching featured categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};


const getCatogaryById = async (req, res) => {
    try {

        const { id } = req.params;

        const query = ` 
            SELECT * from public."v_getallcatogary" where "ID" = $1; 
        `;

        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Category with specific request not found`,
            });
        } else {
            res.status(200).json({
                success: true,
                data: rows[0], // return single category
            });
        }

    } catch (error) {
        console.error('Error fetching specific category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

const deleteCategory = async (req, res) => {
    if (req.user.role !== "admin") {
        console.log(req.user.role)
        res.status(401).json({
            success: false,
            message: 'Access Forbidden'
        })
    }
    try {
        const { id } = req.params;
        const { updatedBy } = req.body;
        const query = `
                UPDATE "CatogaryMaster" 
                SET "IsActive" = FALSE, "IsFeatured" = FALSE, "Updated_Date" = CURRENT_TIMESTAMP, "Updated_By" = $2
                WHERE "ID" = $1;
            `;


        const result = await pool.query(query, [id, updatedBy]);

        if (result.rowCount === 0) {
            // No row updated
            return res.status(404).json({
                success: false,
                message: `Category with ID ${id} not found`,
            });
        }

        // Successfully marked as inactive
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
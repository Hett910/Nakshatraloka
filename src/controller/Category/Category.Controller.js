const express = require('express');
const { SaveCatogaryValidation } = require('../../utils/Validation')
const pool = require('../../utils/PostgraceSql.Connection');
const { validationResult } = require('express-validator');

const saveCategory = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id, name, description, createdBy, updatedBy, isShown } = req.body;

        // CALL function instead of procedure
        const query = `
            SELECT public."fn_save_catogary"($1, $2, $3, $4, $5, $6)
        `;

        const SaveCatogary = await pool.query(query, [id, name, description, createdBy, updatedBy, isShown]);


        if (SaveCatogary) {
            res.json({
                success: true,
                message: SaveCatogary.rows[0].fn_save_catogary
                // message: id === 0 ? 'Category inserted successfully' : 'Category updated successfully'
            });
        } else {
            res.json({
                success: false,
                message: "Some error while saving catogary"
            });
        }

    } catch (error) {
        console.error('Error saving category:', error);

        if (error.code === 'P0001') { // PostgreSQL RAISE EXCEPTION
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        res.status(500).json({
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
                SET "IsActive" = FALSE, "Updated_Date" = CURRENT_TIMESTAMP, "Updated_By" = $2
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
        deleteCategory
    }
}
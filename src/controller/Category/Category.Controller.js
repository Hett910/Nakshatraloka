const express = require('express');
// const { SaveCatogaryValidation } = require('../../utils/Validation')
const pool = require('../../utils/PostgraceSql.Connection');
const { validationResult } = require('express-validator');
const { redis } = require('../../utils/redisClient');

// const saveCategory = async (req, res) => {

//     const user = req.user;
//     if(user.role !== "admin") return res.status(403).json({ success: false, message: "Access Denied" });

//     try {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, errors: errors.array() });
//         }

//         const { id, name, description, createdBy, updatedBy, isShown } = req.body;

//         // CALL function instead of procedure
//         const query = `
//             SELECT public."fn_save_catogary"($1, $2, $3, $4, $5, $6)
//         `;

//         const SaveCatogary = await pool.query(query, [id, name, description, createdBy, updatedBy, isShown]);


//         if (SaveCatogary) {
//             res.json({
//                 success: true,
//                 message: SaveCatogary.rows[0].fn_save_catogary
//                 // message: id === 0 ? 'Category inserted successfully' : 'Category updated successfully'
//             });
//         } else {
//             res.json({
//                 success: false,
//                 message: "Some error while saving catogary"
//             });
//         }

//     } catch (error) {
//         console.error('Error saving category:', error);

//         if (error.code === 'P0001') { // PostgreSQL RAISE EXCEPTION
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
      imagePath = `/${req.files[0].filename}`; 
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

// ✅ Get Category By ID with Redis caching
const getCatogaryById = async (req, res) => {

  const user = req.user;

  // Check if user is admin
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access Denied" });
  }

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const cacheKey = `category:${id}`;

    // 1️⃣ Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // 2️⃣ Query database if not cached
    const client = await pool.connect();
    try {
      const query = `
        SELECT *
        FROM public."v_getallcatogary"
        WHERE "ID" = $1;
      `;
      const { rows } = await client.query(query, [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Category with ID ${id} not found`,
        });
      }

      const responseData = {
        success: true,
        data: rows[0], // single category
      };

      // 3️⃣ Store result in Redis with TTL (5 minutes)
      await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

      return res.json(responseData);
    } finally {
      client.release();
    }
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


// ✅ Get Featured Categories with Redis caching
const getFeaturedCategories = async (req, res) => {
  const cacheKey = "featured_categories";

  try {
    // 1️⃣ Check Redis cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log("⚡ Serving featured categories from Redis cache");
      return res.json(JSON.parse(cachedData));
    }

    // 2️⃣ Query database if not cached
    const client = await pool.connect();
    try {
      const query = `
        SELECT "ID", "Name", "Image"
        FROM public."CatogaryMaster"
        WHERE "IsActive" = true AND "IsFeatured" = true
        ORDER BY "Name" ASC
      `;
      const result = await client.query(query);

      const responseData = {
        success: true,
        data: result.rows,
      };

      // 3️⃣ Cache the result in Redis for 5 minutes (300 seconds)
      await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

      return res.json(responseData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching featured categories:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
    getFeaturedCategories
  }
}
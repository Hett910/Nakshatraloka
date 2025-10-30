const pool = require("../../utils/PostgraceSql.Connection");
const { redisUtils } = require('../../utils/redisClient'); // Import redisUtils

// ✅ Create Consultation Type
const saveConsultationType = async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const client = await pool.connect();
    try {
        let { id = 0, name, price, isActive } = req.body;
        let result;

        if (id > 0) {
            // 🔹 UPDATE
            result = await client.query(
                `UPDATE public."Consultations Types"
                SET "Name" = $1,
                    "Price" = $2,
                    "Updated_By" = $3,
                    "Updated_Date" = CURRENT_DATE,
                    "IsActive" = $4
                WHERE "ID" = $5
                RETURNING *`,
                [name, price, req.user.id, isActive, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Not Found" });
            }

            // Clear consultation types cache after update
            await redisUtils.delPattern('consultation_types:*');
            console.log('🗑️ Consultation types cache cleared after update');

            return res.status(200).json({ success: true, message: "Updated Successfully" });

        } else {
            // 🔹 CREATE
            result = await client.query(
                `INSERT INTO public."Consultations Types"
                ("Name", "Price", "Created_By", "Created_Date", "IsActive")
                VALUES ($1, $2, $3, CURRENT_DATE, $4)
                RETURNING *`,
                [name, price, req.user.id, isActive]
            );

            // Clear consultation types cache after create
            await redisUtils.delPattern('consultation_types:*');
            console.log('🗑️ Consultation types cache cleared after create');

            return res.status(201).json({ success: true, message: "Created Successfully" });
        }

    } catch (error) {
        console.error("Error saving consultation type:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};

const getAllConsultationTypes = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { data, cached } = await redisUtils.cacheable(
            'consultation_types:all',
            async () => {
                const result = await client.query(
                    `SELECT * FROM public."Consultations Types" WHERE "IsActive" = TRUE ORDER BY "ID" ASC`
                );
                return result.rows.length > 0 ? result.rows : [];
            },
            600 // 10 minutes TTL for consultation types
        );

        res.status(200).json({ 
            success: true, 
            data,
            cached // Optional: to know if data came from cache
        });
    } catch (error) {
        console.error("Error fetching consultation types:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};

const getConsultationTypeById = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const cacheKey = `consultation_type:${id}`;

        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                const result = await client.query(
                    `SELECT * FROM public."Consultations Types" WHERE "ID" = $1 AND "IsActive" = TRUE`,
                    [id]
                );
                return result.rows.length > 0 ? result.rows[0] : null;
            },
            600 // 10 minutes TTL for single consultation type
        );

        if (!data) {
            return res.status(404).json({ success: false, message: "Not Found" });
        }

        res.status(200).json({ 
            success: true, 
            data,
            cached 
        });
    } catch (error) {
        console.error("Error fetching consultation type:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};

// ✅ Delete
const deleteConsultationType = async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const client = await pool.connect();
    try {
        const { id } = req.params;

        const result = await client.query(
            `UPDATE public."Consultations Types"
             SET "IsActive" = false,
                 "Updated_By" = $1,
                 "Updated_Date" = CURRENT_DATE
             WHERE "ID" = $2
             RETURNING *`,
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Not Found" });
        }

        // Clear consultation types cache after deletion
        await redisUtils.delPattern('consultation_types:*');
        console.log('🗑️ Consultation types cache cleared after deletion');

        res.status(200).json({ success: true, message: "Consultation Type Deleted Successfully" });
    } catch (error) {
        console.error("Error soft deleting consultation type:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};

module.exports = {
    ConsultationType: {
        saveConsultationType,
        getAllConsultationTypes,
        getConsultationTypeById,
        deleteConsultationType
    }
};
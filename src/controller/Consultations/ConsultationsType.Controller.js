const pool = require("../../utils/PostgraceSql.Connection");
const { redis } = require("../../utils/redisClient");

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

            return res.status(201).json({ success: true, message: "Created Successfully" });
        }

    } catch (error) {
        console.error("Error saving consultation type:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};


// ✅ Get all consultation types with Redis caching
const getAllConsultationTypes = async (req, res) => {
    const cacheKey = "consultation_types:all";

    try {
        // 1️⃣ Check cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Query database if not cached
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM public."Consultations Types" 
         WHERE "IsActive" = TRUE 
         ORDER BY "ID" ASC`
            );

            if (!result.rows.length) {
                return res.status(404).json({ success: false, message: "No consultation types found" });
            }

            const responseData = { success: true, data: result.rows };

            // 3️⃣ Store result in Redis for 5 minutes
            await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

            return res.json(responseData);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error fetching consultation types:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


// ✅ Get Consultation Type by ID with Redis caching
const getConsultationTypeById = async (req, res) => {
    const { id } = req.params;
    const cacheKey = `consultation_type:${id}`;

    try {
        // 1️⃣ Check Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Serving consultation type from Redis cache");
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Query database if not cached
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT * FROM public."Consultations Types" 
         WHERE "ID" = $1 AND "IsActive" = TRUE`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Not Found" });
            }

            const responseData = { success: true, data: result.rows[0] };

            // 3️⃣ Cache the result in Redis for 5 minutes
            await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

            return res.json(responseData);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error fetching consultation type:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// // ✅ Update
// const updateConsultationType = async (req, res) => {
//     if (!req.user || req.user.role !== "admin") {
//         return res.status(403).json({ success: false, message: "Access Denied" });
//     }

//     const client = await pool.connect();
//     try {
//         const { id } = req.params;
//         const { name, price, isActive } = req.body;

//         const result = await client.query(
//             `UPDATE public."Consultations Types"
//             SET "Name" = $1,
//                 "Price" = $2,
//                 "Updated_By" = $3,
//                 "Updated_Date" = CURRENT_DATE,
//                 "IsActive" = $4
//             WHERE "ID" = $5
//             RETURNING *`,
//             [name, price, req.user.id, isActive, id]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "Not Found" });
//         }

//         res.status(200).json({ success: true, data: result.rows[0] });
//     } catch (error) {
//         console.error("Error updating consultation type:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     } finally {
//         client.release();
//     }
// };

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

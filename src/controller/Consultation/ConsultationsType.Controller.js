const pool = require("../../utils/PostgraceSql.Connection");

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


// ✅ Get All
const getAllConsultationTypes = async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM public."Consultations Types" WHERE "IsActive" = TRUE ORDER BY "ID" ASC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching consultation types:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
    }
};

// ✅ Get by ID
const getConsultationTypeById = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const result = await client.query(
            `SELECT * FROM public."Consultations Types" WHERE "ID" = $1 AND "IsActive" = TRUE`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Not Found" });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error fetching consultation type:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    } finally {
        client.release();
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

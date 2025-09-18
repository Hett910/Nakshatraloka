const { validationResult } = require('express-validator');
const pool = require('../../utils/PostgraceSql.Connection'); // Adjust path accordingly
const { redis } = require('../../utils/redisClient');

// const saveConsultation = async (req, res) => {
//     try {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, errors: errors.array() });
//         }

//         const { id, userId, bookingDate, status, updatedBy, isActive, consultationType } = req.body;

//         const query = `
//             SELECT public."fn_save_consultation"($1, $2, $3, $4, $5, $6, $7)
//         `;

//         const result = await pool.query(query, [
//             id || 0,                         // p_id
//             userId,                           // p_userid
//             bookingDate,                      // p_bookingdate
//             status,                           // p_status
//             updatedBy,                        // p_updated_by
//             isActive !== undefined ? isActive : true, // p_isactive
//             consultationType                  // p_consultationtype
//         ]);

//         return res.json({
//             success: true,
//             message: result.rows[0].fn_save_consultation
//         });

//     } catch (error) {
//         console.error('Error saving consultation:', error);
//         if (error.code === 'P0001') {
//             return res.status(400).json({ success: false, message: error.message });
//         }
//         return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
//     }
// };


const saveConsultation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Get authenticated user ID from the auth middleware
        const userId = req.user.id;

        const {
            id,
            bookingDate,
            status,
            updatedBy,
            isActive,
            consultationType,
            fullName,
            phoneNumber,
            dateOfBirth,
            birthTime,
            gender,
            bookingTime
        } = req.body;

        let query = '';
        let values = [];

        if (id && id > 0) {
            // Update existing record
            query = `
                UPDATE public."Consultations"
                SET
                    "UserID" = $1,
                    "BookingDate" = $2,
                    "Status" = $3,
                    "Updated_Date" = current_date,
                    "IsActive" = $4,
                    "ConsultationType" = $5,
                    "FullName" = $6,
                    "PhoneNumber" = $7,
                    "DateOfBirth" = $8,
                    "BirthTime" = $9,
                    "Gender" = $10,
                    "BookingTime" = $11
                WHERE "ID" = $12
                RETURNING "ID";
            `;

            values = [
                userId, // use auth user id
                bookingDate,
                status,
                isActive !== undefined ? isActive : true,
                consultationType,
                fullName || null,
                phoneNumber || null,
                dateOfBirth || null,
                birthTime || null,
                gender || null,
                bookingTime || null,
                id
            ];
        } else {
            // Insert new record
            query = `
                INSERT INTO public."Consultations"(
                    "UserID",
                    "BookingDate",
                    "Status",
                    "Created_Date",
                    "IsActive",
                    "ConsultationType",
                    "FullName",
                    "PhoneNumber",
                    "DateOfBirth",
                    "BirthTime",
                    "Gender",
                    "BookingTime"
                ) VALUES (
                    $1, $2, $3, current_date, $4, $5, $6, $7, $8, $9, $10, $11
                )
                RETURNING "ID";
            `;

            values = [
                userId, // use auth user id
                bookingDate,
                status,
                isActive !== undefined ? isActive : true,
                consultationType,
                fullName || null,
                phoneNumber || null,
                dateOfBirth || null,
                birthTime || null,
                gender || null,
                bookingTime || null
            ];
        }

        const result = await pool.query(query, values);

        return res.json({
            success: true,
            message: id && id > 0 ? "Consultation updated successfully" : "Consultation saved successfully",
            consultationId: result.rows[0].ID
        });

    } catch (error) {
        console.error('Error saving consultation:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};


// ✅ Get consultations with optional ID and Redis caching
const getConsultations = async (req, res) => {
    try {
        const { id } = req.params; // optional ID from route params
        const cacheKey = id ? `consultation:${id}` : `consultations:all`;

        // 1️⃣ Check Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`⚡ Serving consultation(s) from Redis cache: ${id || "all"}`);
            return res.json(JSON.parse(cachedData));
        }

        // 2️⃣ Query database if not cached
        let query = `SELECT * FROM public."Consultations" WHERE "IsActive" = TRUE`;
        const params = [];

        if (id) {
            query += ` AND "ID" = $1`;
            params.push(id);
        }

        query += ` ORDER BY "BookingDate" DESC`;

        const { rows } = await pool.query(query, params);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'No consultations found' });
        }

        const responseData = { success: true, data: rows };

        // 3️⃣ Store in Redis with TTL (5 min)
        await redis.setEx(cacheKey, 300, JSON.stringify(responseData));

        return res.json(responseData);

    } catch (error) {
        console.error('Error fetching consultations:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};



const deleteConsultation = async (req, res) => {
    const user = req.user;

    if (user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access Denied' });
    }

    try {
        const { id } = req.params;

        const query = `
            UPDATE public."Consultations"
            SET "IsActive" = FALSE, "Updated_Date" = NOW()
            WHERE "ID" = $1
        `;

        await pool.query(query, [id]);

        res.json({
            success: true,
            message: 'Consultation deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting consultation:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

const updateConsultationStaus = async (req, res) => {
    const user = req.user;

    if (user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access Denied' });
    }

    try {
        const { id } = req.params;
        const { status } = req.body;

        const query = `
            UPDATE public."Consultations"
            SET "Status" = $1, "Updated_Date" = NOW()
            WHERE "ID" = $2
        `;

        await pool.query(query, [status, id]);

        res.json({
            success: true,
            message: 'Consultation status updated successfully'
        });

    } catch (error) {
        console.error('Error updating consultation status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};


const listPendingConsultations = async (req, res) => {
    const user = req.user;

    if (!user?.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied." });
    }

    const client = await pool.connect();
    try {
        const query = `
            SELECT *
            FROM public.fn_get_pending_consultations_by_user($1);
        `;

        const { rows } = await client.query(query, [user.id]);

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error(`Error listing pending consultations: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    } finally {
        client.release();
    }
};



module.exports = {
    Consultation: {
        saveConsultation,
        getConsultations,
        deleteConsultation,
        updateConsultationStaus,
        listPendingConsultations
    }
}
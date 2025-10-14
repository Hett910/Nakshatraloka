const { validationResult } = require('express-validator');
const pool = require('../../utils/PostgraceSql.Connection');
const { redisUtils } = require('../../utils/redisClient'); // Import redisUtils

const saveConsultation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            id,
            userId,
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
                userId,
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
                userId,
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

        // Clear consultations cache after save/update
        await redisUtils.delPattern('consultations:*');
        console.log('🗑️ Consultations cache cleared after save');

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

const getConsultations = async (req, res) => {
    try {
        const { id } = req.params; // optional ID
        const cacheKey = id ? `consultation:${id}` : `consultations:all`;

        // Use cacheable pattern for consultations data
        const { data, cached } = await redisUtils.cacheable(
            cacheKey,
            async () => {
                let query = `SELECT * FROM public."v_consultations" WHERE "IsActive" = TRUE`;
                const params = [];

                if (id) {
                    query += ` AND "ID" = $1`;
                    params.push(id);
                }

                query += ` ORDER BY "BookingDate" DESC`;

                const result = await pool.query(query, params);
                return result.rows.length > 0 ? result.rows : [];
            },
            600 // 10 minutes TTL for consultations
        );

        return res.status(200).json({
            success: true,
            data,
            cached // Optional: to know if data came from cache
        });

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

        // Clear consultations cache after deletion
        await redisUtils.delPattern('consultations:*');
        console.log('🗑️ Consultations cache cleared after deletion');

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

        // Clear consultations cache after status update
        await redisUtils.delPattern('consultations:*');
        console.log('🗑️ Consultations cache cleared after status update');

        res.json({
            success: true,
            message: 'Consultation status updated successfully'
        });

    } catch (error) {
        console.error('Error updating consultation status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

module.exports = {
    Consultation: {
        saveConsultation,
        getConsultations,
        deleteConsultation,
        updateConsultationStaus
    }
}
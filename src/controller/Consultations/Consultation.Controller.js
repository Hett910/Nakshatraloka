const { validationResult } = require('express-validator');
const pool = require('../../utils/PostgraceSql.Connection'); // Adjust path accordingly

const saveConsultation = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id, userId, bookingDate, status, updatedBy, isActive, consultationType } = req.body;

        const query = `
            SELECT public."fn_save_consultation"($1, $2, $3, $4, $5, $6, $7)
        `;

        const result = await pool.query(query, [
            id || 0,                         // p_id
            userId,                           // p_userid
            bookingDate,                      // p_bookingdate
            status,                           // p_status
            updatedBy,                        // p_updated_by
            isActive !== undefined ? isActive : true, // p_isactive
            consultationType                  // p_consultationtype
        ]);

        return res.json({
            success: true,
            message: result.rows[0].fn_save_consultation
        });

    } catch (error) {
        console.error('Error saving consultation:', error);
        if (error.code === 'P0001') {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};


const getConsultations = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from route params

        let query = `SELECT * FROM public."v_consultations" WHERE "IsActive" = TRUE`;
        const params = [];

        if (id) {
            query += ` AND "ID" = $1`;
            params.push(id);
        }

        query += ` ORDER BY "BookingDate" DESC`; // can use BookingDate

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
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


module.exports = {
    Consultation: {
        saveConsultation,
        getConsultations,
        deleteConsultation,
        updateConsultationStaus
    }
}
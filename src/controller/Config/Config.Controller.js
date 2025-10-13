const pool = require('../../utils/PostgraceSql.Connection');

const getAllConfigData = async (req, res) => {
    try {
        const query = `
            select * from "ConfigMaster" where "IsActive" = true;
        `

        const { rows } = await pool.query(query);

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
        console.log(`Error fetching data from config: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}

module.exports = {
    Config: {
        getAllConfigData
    }
}
const pool = require('../../utils/PostgraceSql.Connection');
const db = pool; // Alias for clarity

const getAdminDashboardStats = async (req, res) => {

    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access Denied" });
    }

    try {
        const result = await db.query(`SELECT * FROM get_admin_dashboard_stats();`);
        console.log(result.rows[0]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Dashboard fetch failed" });
    }
};

module.exports = {
    Admin: {
        getAdminDashboardStats
    }
};
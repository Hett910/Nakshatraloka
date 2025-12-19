const express = require('express');
const auth = require('../../middleware/Auth');
const { Admin } = require('../../controller/admin/Admin.controller');
const router = express.Router();

router.post('/admin/dashboardStats', auth, Admin.getAdminDashboardStats);

module.exports = router;
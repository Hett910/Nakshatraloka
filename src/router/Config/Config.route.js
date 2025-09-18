const express = require('express');
const { Config } = require('../../controller/Config/Config.Controller');
const router = express.Router();

router.post('/getAllConfigData', Config.getAllConfigData);
router.post('/GetAllStatus', Config.GetAllStatus);  

module.exports = router;
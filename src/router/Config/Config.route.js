const express = require('express');
const { Config } = require('../../controller/Config/Config.Controller');
const router = express.Router();

router.post('/getAllConfigData', Config.getAllConfigData);

module.exports = router;
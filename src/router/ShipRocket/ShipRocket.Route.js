const express = require('express');
const { ShipRocket } = require('../../controller/ShipRocket/ShipRocket.Controller');
const router = express.Router();

router.post('/getShiprocketToken', ShipRocket.getShiprocketToken);
module.exports = router;
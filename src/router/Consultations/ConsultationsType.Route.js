const express = require('express');
const router = express.Router();

const auth = require('../../middleware/Auth');
const { ConsultationType } = require('../../controller/Consultations/ConsultationsType.Controller');

router.post('/saveConsultationsType', auth, ConsultationType.saveConsultationType);
router.post('/getAllConsultationsType', ConsultationType.getAllConsultationTypes);
router.post('/getConsultationsTypeById/:id', auth, ConsultationType.getConsultationTypeById);
router.post('/deleteConsultationsType/:id', auth, ConsultationType.deleteConsultationType);

module.exports = router;
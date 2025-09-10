const express = require('express');
const router = express.Router();

const auth = require('../../middleware/Auth');

const { Consultation } = require('../../controller/Consultations/Consultation.Controller');

router.post('/saveConsultation', Consultation.saveConsultation);
router.post('/getConsultations', auth, Consultation.getConsultations);
router.post('/deleteConsultation/:id', auth, Consultation.deleteConsultation);
router.post('/updateConsultationStatus/:id', auth, Consultation.updateConsultationStaus);

module.exports = router;
const express = require('express');
const router = express.Router();

const auth = require('../../middleware/Auth');

const { Consultation } = require('../../controller/Consultations/Consultation.Controller');

router.post('/saveConsultation', auth,Consultation.saveConsultation);
router.post('/getConsultations', auth, Consultation.getConsultations);
router.post('/deleteConsultation/:id', auth, Consultation.deleteConsultation);
router.post('/updateConsultationStatus/:id', auth, Consultation.updateConsultationStaus);

//list of pendeing consultations
router.post('/listPendingConsultations', auth, Consultation.listPendingConsultations);
module.exports = router;
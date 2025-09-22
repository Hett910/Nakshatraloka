const express = require('express');
const router = express.Router();

const auth = require('../../middleware/Auth');
const { uploadMiddleware } = require('../../utils/Image');

const { Consultation } = require('../../controller/Consultation/Consultation.Controller');

router.post('/saveConsultation', [auth,uploadMiddleware], Consultation.saveConsultation);
router.post('/getConsultations', auth, Consultation.getConsultations);
router.post('/deleteConsultation/:id', auth, Consultation.deleteConsultation);
router.post('/updateConsultationStatus/:id', auth, Consultation.updateConsultationStaus);


module.exports = router;
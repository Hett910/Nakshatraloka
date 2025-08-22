const express = require('express');
const { SaveUserValidation } = require('../../utils/Validation');
const { User } = require('../../controller/User/User.Controller');
const auth = require('../../middleware/Auth');
const router = express.Router();

router.post('/saveUser', SaveUserValidation, User.saveUser);
router.post('/login', User.loginUser);
router.post('/updatePassword', auth, User.UpdatePassword)

module.exports = router;
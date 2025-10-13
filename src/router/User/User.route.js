const express = require('express');
const { SaveUserValidation } = require('../../utils/Validation');
const { User } = require('../../controller/User/User.Controller');
const auth = require('../../middleware/Auth');
const router = express.Router();

router.post('/saveUser', User.saveUser);
router.post('/login', User.loginUser);
router.post('/updatePassword', auth, User.UpdatePassword)
// No need for :id since we'll use token
router.post('/user/profile', auth, User.GetUserByID);

router.post("/updateUser", auth, User.updateUser)


module.exports = router;
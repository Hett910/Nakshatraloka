const express = require('express');
const router = express.Router();
const { Catogary } = require('../../controller/Category/Category.Controller');
const { SaveCatogaryValidation } = require('../../utils/Validation');
const auth = require('../../middleware/Auth');
const { uploadMiddleware } = require('../../utils/Image');

// router.post('/saveCatogary', [auth, SaveCatogaryValidation], Catogary.saveCategory);
router.post('/saveCatogary', [auth, uploadMiddleware], Catogary.saveCategory);
router.post('/getAllCatogary', Catogary.getAllCategory);
router.post('/getCatogaryById/:id', Catogary.getCatogaryById);
router.post('/deleteCatogary/:id', auth, Catogary.deleteCategory);

router.post('/getAllFeaturedCategory', Catogary.getAllFeaturedCategory)

module.exports = router;
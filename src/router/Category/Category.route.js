const express = require('express');
const router = express.Router();
const { Catogary } = require('../../controller/Category/Category.Controller');
const { SaveCatogaryValidation } = require('../../utils/Validation');
const auth = require('../../middleware/Auth');

router.post('/saveCatogary', [auth, SaveCatogaryValidation], Catogary.saveCategory);
router.post('/getAllCatogary', Catogary.getAllCategory);
router.post('/getCatogaryById/:id', Catogary.getCatogaryById);
router.post('/deleteCatogary/:id', auth, Catogary.deleteCategory);
router.post("/categories/featured", Catogary.getFeaturedCategories);

module.exports = router;
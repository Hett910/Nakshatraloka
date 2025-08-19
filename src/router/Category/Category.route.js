const express = require('express');
const router = express.Router();
const { Catogary } = require('../../controller/Category/Category.Controller');
const { SaveCatogaryValidation } = require('../../utils/Validation');

router.post('/saveCatogary', SaveCatogaryValidation, Catogary.saveCategory);
router.post('/getAllCatogary', Catogary.getAllCategory);
router.post('/getCatogaryById/:id', Catogary.getCatogaryById);
router.post('/deleteCatogary/:id', Catogary.deleteCategory);

module.exports = router;
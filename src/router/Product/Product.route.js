const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../../middleware/Auth');
const { Product } = require('../../controller/Product/Product.Controller');
const { uploadMiddleware } = require('../../utils/Image');


router.post('/saveProduct', [auth, uploadMiddleware], Product.saveProduct);
router.post('/getAllProducts', auth, Product.getAllProducts);
router.post('/getProductById/:id', auth, Product.getProductById);
router.post('/deleteProduct/:id', auth, Product.deleteProduct);
router.post('/getGemstoneProducts', Product.GetGemstoneProducts);

router.post('/getProductsByCategory', Product.GetProductsByCategory);

router.post('/getProductDetails/:productId', Product.GetProductDetails);
// 4 product for screen
router.post("/getProduct", Product.GetProductForScreen);
// 4 categories for screen
router.post("/getCategories", Product.GetFourCategories);
//toggleFeaturedProduct
router.post("/toggleFeaturedProduct/:id/feature", auth, Product.toggleFeaturedProduct); 
router.post("/getFeaturedProducts", Product.getFeaturedProducts);

router.post("/getProductName", Product.getProductWithName);

router.post("/getFilteredProducts", Product.getFilteredProducts);

module.exports = router;

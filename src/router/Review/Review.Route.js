const express = require('express');
const { Review } = require('../../controller/Review/Review.Controller');
const router = express.Router();
const auth = require('../../middleware/Auth');

router.post('/getProductReviewSummary', Review.GetProductReviewSummary);
router.post('/saveProductReview', auth, Review.SaveProductReview);
router.post('/getReviewById/:id',auth,   Review.GetReviewById);
router.post('/DeleteReview/:id', auth, Review.SoftDeleteReview);

router.post('/getReviewsByProductPagination/:productId', Review.GetProductReviewSummary);
router.post('/getReviewSummary', Review.GetReviewSummary);

router.post('/getAllReviews', auth, Review.GetAllActiveReviews);
router.post('/getReviewsByProduct/:productId', Review.GetReviewsByProduct); 


module.exports = router;
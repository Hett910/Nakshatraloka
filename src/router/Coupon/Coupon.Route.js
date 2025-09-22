const express = require('express');
const { Coupon } = require('../../controller/Coupon/Coupon.Controller');
const router = express.Router();
const auth = require('../../middleware/Auth');

// Add
router.post('/saveCoupon', auth ,Coupon.SaveCoupon);
// router.post('/saveCoupon', Coupon.SaveCoupon);
router.post('/getAllCoupons', auth ,Coupon.getAllCoupons);
// router.post('/getAllCoupons' ,Coupon.getAllCoupons);
router.post('/deleteCoupon/:id', auth ,Coupon.deleteCoupon);
router.post('/CouponUsage', auth ,Coupon.CouponUsage);

router.post("/getAllCouponsForDisplay", Coupon.getAllCouponsForDisplay);
router.post("/activeCouponProducts",auth, Coupon.ActiveCouponProducts);
module.exports = router;

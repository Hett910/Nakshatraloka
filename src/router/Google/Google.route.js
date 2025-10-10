// google.router.js

const express = require("express");
const passport = require("passport");
require("../../middleware/Google.Auth"); // ✅ make sure strategy is loaded
const router = express.Router();

// Step 1: Redirect to Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Step 2: Handle callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      // ✅ req.user is { user, token } from googleAuth.js
      const { user, token } = req.user;

      const redirectURL =
        process.env.NODE_ENV === "production"
          ? `${process.env.FRONTEND_URL}/auth/success?token=${token}`
          : `${process.env.FRONTEND_LOCAL_URL}/auth/success?token=${token}`;

      console.log("Redirecting user to:", redirectURL);
      console.log("NODE_ENV:", process.env.NODE_ENV);
      console.log("Frontend URL being used:", redirectURL);


      res.redirect(redirectURL);

      res.json({
        success: true,
        message: "Google login successful",
        token,
        user: {
          id: user.ID,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
        },
      });

    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
);

module.exports = router;
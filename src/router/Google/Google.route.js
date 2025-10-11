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
  passport.authenticate("google", { session: false, failureRedirect: "/auth/failure" }),
  (req, res) => {
    try {
      const { user, token } = req.user;

      // ✅ Detect environment
      const frontendUrl =
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL  
          : process.env.FRONTEND_LOCAL_URL;

      if (!frontendUrl) {
        console.error("❌ FRONTEND_URL or FRONTEND_LOCAL_URL not defined");
        return res.status(500).send("Frontend URL missing in environment");
      }

      const redirectURL = `${frontendUrl}/auth/success?token=${token}`;
      console.log("✅ Redirecting user to:", redirectURL);
      console.log("NODE_ENV:", process.env.NODE_ENV);

      res.redirect(redirectURL);
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
);

// Failure route
router.get("/auth/failure", (req, res) => {
  console.error("❌ Google auth failed");
  res.status(401).send("Google authentication failed");
});

module.exports = router;

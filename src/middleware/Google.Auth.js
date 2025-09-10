// googleAuth.js
// Code is great
require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const pool = require("../utils/PostgraceSql.Connection"); // PostgreSQL pool

passport.use(
    new GoogleStrategy(
        {
            clientID:
                process.env.GOOGLE_CLIENT_ID ,
            clientSecret:
                process.env.GOOGLE_CLIENT_SECRET,
            callbackURL:
                process.env.CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {

                // console.log("✅ Google Profile:", profile);
                // console.log("✅ Access Token:", accessToken);
                // console.log("✅ Refresh Token:", refreshToken);
                // this WORKSS 👇
                //return done(null, { user: profile, token: accessToken });
                 const email = profile.emails[0].value;
                 const fullname = profile.displayName;

      // check if user exists
      let user = await pool.query(
        `SELECT * FROM "UserMaster" WHERE email = $1`,
        [email]
      );

      if (user.rows.length === 0) {
        // insert new user
        const newUser = await pool.query(
          `INSERT INTO "UserMaster" (fullname, email, password_hash, role, is_active)
           VALUES ($1, $2, 'GOOGLE_LOGIN', 'customer', true)
           RETURNING *`,
          [fullname, email]
        );
        user = newUser;
      }

      const dbUser = user.rows[0];

      // create JWT token
      const payload = {
        id: dbUser.ID,    
        email: dbUser.email,
        role: dbUser.role,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET || "SECRET", {
        expiresIn: "7d",
      });

      // ✅ now return both user + token
      return done(null, { user: dbUser, token });
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// no serialize/deserialize needed because we are using JWT

module.exports = passport;

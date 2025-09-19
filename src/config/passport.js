const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_PATH || "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0]?.value) || null;
        if (!email)
          return done(new Error("Google không trả về email hợp lệ"), null);

        let user = await User.findOne({ email });
        if (!user) {
          const randPass = crypto.randomBytes(16).toString("hex");
          const passwordHash = await bcrypt.hash(
            randPass,
            Number(process.env.BCRYPT_SALT_ROUNDS) || 12
          );
          const username = `google_${profile.id}`;
          user = await User.create({
            name: profile.displayName || username,
            username,
            email,
            passwordHash,
            avatar: { url: profile.photos?.[0]?.value || "" },
            isVerified: true,
            accountStatus: "active",
            role: "employee",
          });
        }
        return done(null, user);
      } catch (e) {
        return done(e, null);
      }
    }
  )
);

module.exports = passport;

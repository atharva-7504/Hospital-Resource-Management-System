const crypto = require("crypto");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const initializePassport = (passport, User) => {
  passport.use(User.createStrategy());

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3000/auth/google/callback";

  const googleConfigured = Boolean(clientID && clientSecret && callbackURL);

  if (googleConfigured) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const firstName = String(profile.name?.givenName || "").trim();
            const lastName = String(profile.name?.familyName || "").trim();
            const email =
              profile.emails && profile.emails[0]
                ? String(profile.emails[0].value || "").trim().toLowerCase()
                : "";

            let user = await User.findOne({
              $or: [
                { googleId },
                ...(email ? [{ email }] : [])
              ]
            }).select("+hash +salt");

            if (user) {
              if (!user.googleId) {
                user.googleId = googleId;
              }
              if (!user.email && email) {
                user.email = email;
              }
              if (!user.first_name && firstName) {
                user.first_name = firstName;
              }
              if (!user.last_name && lastName) {
                user.last_name = lastName;
              }
              if (!user.username) {
                user.username = `google-${googleId}`;
              }
              if (!user.hash) {
                await user.setPassword(crypto.randomBytes(16).toString("hex"));
              }
              user.provider = "google";
              await user.save();
              return done(null, user);
            }

            user = new User({
              first_name: firstName || "Google",
              last_name: lastName || "User",
              username: `google-${googleId}`,
              email: email || `google-${googleId}@google.local`,
              role: "user",
              googleId,
              provider: "google"
            });
            await user.setPassword(crypto.randomBytes(16).toString("hex"));
            await user.save();
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  return { googleConfigured };
};

module.exports = initializePassport;

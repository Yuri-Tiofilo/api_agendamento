import passport from 'passport';
import User from './app/models/User';

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID:
        '798089071925-df9qm2o3aadrr8n6rogj3obfcfen36dl.apps.googleusercontent.com',
      clientSecret: 'gR5LuX6Qk7G_7GPq8TPpo5Kq',
      callbackURL: 'http://www.example.com/auth/google/callback',
    },
    async function(accessToken, refreshToken, profile, done) {
      await User.create({ googleId: profile.id }, function(err, user) {
        return done(err, user);
      });
    }
  )
);

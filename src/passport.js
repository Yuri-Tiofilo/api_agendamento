import passport from 'passport';
import GooglePlusTokenStrategy from 'passport-google-plus-token';

passport.use(
  'googleToken',
  new GooglePlusTokenStrategy(
    {
      clientID:
        '798089071925-isfr95efpiugo2tb1o8tmr37dbl0ok95.apps.googleusercontent.com',
      clientSecret: 'BMxnGNeJPF3aJhDbPWjLsHVW',
    },
    async (accessToken, refreshToken, profile, done) => {}
  )
);

const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user');
const keys = require('../config/keys');

passport.serializeUser((user, done)=>{
    done(null, user.id);
});

passport.deserializeUser((id, done)=>{
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

passport.use(new FacebookStrategy({
    clientID: keys.FacebookAppID,
    clientSecret: keys.FacebookAppSecret,
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['emails', 'name', 'displayName', 'photos']
},(accessToken, refreshToken, profile, done)=>{
    console.log(profile);
    User.findOne({facebook: profile.id}, (err, user)=>{
        if(err){
            return done(err);
        }
        if(user){
            return done(null, user);
        }else{
            const newUser = {
                facebook: profile.id,
                fullname: profile.displayName,
                firstname: profile.name.givenName,
                lastname: profile.name.familyName,
                image: `https://graph.facebook.com/${profile.id}/picture?type=large&access_token=${accessToken}`,
                email: profile.emails[0].value
            }
            new User(newUser).save((err, user)=>{
                if(err){
                    return done(err);
                }
                if(user){
                    return done(null, user);
                }
            });
        }
    })
}));
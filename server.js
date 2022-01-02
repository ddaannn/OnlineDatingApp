// import modules
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');

// load models
const Message = require('./models/message');
const User = require('./models/user');

const app = express();

// load keys file
const Keys = require('./config/keys');

// load helpers
const {requireLogin, ensureGuest} =  require('./helpers/auth');

// use body middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// configuration for authentication
app.use(cookieParser());
app.use(session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next)=>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// setup express static folder to serve js, css files
app.use(express.static('public'));

// make user global object
app.use((req, res, next) =>{
    res.locals.user = req.user || null;
    next();
});

// load facebook strategy
require('./passport/facebook');
// load google strategy
require('./passport/google');

// connect to mLab MongoDB
mongoose.connect(Keys.MongoDB, {useNewUrlParser: true}).then(()=>{
    console.log('Server is connected to MongDB');
}).catch((err)=>{
    console.log(err);
})


// environment variable for port
const port = process.env.PORT || 3000;
// setup view engine
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

app.get('/', ensureGuest, (req, res) => {
    res.render('home', {
        title: 'Home'
    });
});

app.get('/about', ensureGuest,(req,res) => {
    res.render('about', {
        title: 'About'
    });
});

app.get('/contact', ensureGuest, (req, res)=>{
    res.render('contact', {
        title: 'Contact'
    });
});

app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));
app.get('/auth/facebook/callback', passport.authenticate('facebook',{
    successRedirect: '/profile',
    failureRedirect: '/'
}));

app.get('/auth/google', passport.authenticate('google',{
    scope: ['profile']
}));
app.get('/auth/google/callback', passport.authenticate('google',{
    successRedirect: '/profile',
    failureRedirect: '/'
}));

app.get('/profile', requireLogin, (req,res)=>{
    User.findById({_id: req.user._id}).then((user)=>{
        if(user){
            console.log(user);
            user.online = true;
            user.save((err, user)=>{
                if(err){
                    throw err;
                }else{
                    res.render('profile',{
                        title: 'Profile',
                        user: user.toJSON()
                    });
                }
            })
        }
    });
});

app.get('/newAccount', (req, res)=>{
    res.render('newAccount', {
        title: 'Signup'
    });
});
app.post('/signup', (req, res)=>{
    console.log(req.body);
    let errors = [];
    if(req.body.password !== req.body.password2){
        errors.push({text: 'Password does not match'});
    }
    if(req.body.password.length < 5){
        errors.push({text: 'Password must be at least 5 characters'});
    }
    if(errors.length > 0){
        res.render('newAccount', {
            errors: errors,
            title: 'Error',
            fullname: req.body.username,
            email: req.body.email,
            password: req.body.password,
            password2: req.body.password2
        });
    }else{
        res.send('No errors! Ready to create new account!');
    }
})

app.get('/logout', (req, res)=>{
    User.findById({_id: req.user._id}).then((user)=>{
        user.online = false;
        user.save((err, user)=>{
            if(err){
                throw err;
            }
            if(user){
                req.logOut();
                res.redirect('/');
            }
        })
    })
})


app.post('/contactUs', (req,res) => {
    console.log(req.body);
    const newMessage = {
        fullname: req.body.fullname,
        email: req.body.email,
        message: req.body.message,
        date: new Date()
    }
    new Message(newMessage).save((err, message)=>{
        if(err){
            throw err;
        }else{
            Message.find({}).then((messages)=>{
                if(messages){
                    res.render('newmessage',{
                        title:'Sent',
                        messages: messages.map(msg => msg.toJSON())
                        // message: messages
                    });
                }else{
                    res.render('noMessage',{
                        title: 'Not Found'
                    });
                }
            })
        }
    })
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
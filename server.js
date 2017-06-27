var express = require('express');
var app = express();
var port = process.env.PORT || 8080;

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var userController = require("./controllers/user.js");
var adminController = require("./controllers/admin.js");
var sessionController = require("./controllers/session.js");

app.use(morgan('dev')); // log every request to the console
bodyParser.urlencoded({
    extended: true
}); // get information from html forms
app.use(bodyParser());

app.get('/', function (req, res) {
    res.sendfile("./index.html");
    // res.send('Hi, You are in the homepage'); // load the index.ejs file
});

app.post('/api/login', userController.login);
app.post('/api/auth/facebook', userController.fb_login );
app.post('/api/signup', userController.signup);

app.get('/api/profile', sessionController.isAuthenticated, userController.profile);
app.get('/api/leaderboard', sessionController.isAuthenticated, userController.leaderboard);

app.post('/api/submit', sessionController.isAuthenticated, userController.submit);

app.get('/api/approve', sessionController.isAuthenticated, sessionController.isAdmin, adminController.get_submissions);
app.post('/api/approve', sessionController.isAuthenticated, sessionController.isAdmin, adminController.approve_submission);


// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
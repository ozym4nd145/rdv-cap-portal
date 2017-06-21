// app/routes.js

//for file upload
var path = require('path');
var fs = require('fs');
var uuidV1 = require('uuid/v1');
var formidable = require('formidable');
var configCons = require('../config/constants.js');

module.exports = function(app, passport,AWS) {
    // =========================================================================
    // docClient setup ==================================================
    // =========================================================================
    var docClient = new AWS.DynamoDB.DocumentClient();

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================

    app.get('/', function(req, res) {
        if (req.isAuthenticated())
          res.redirect('/profile')
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // Upload PAGE =========================
    // =====================================
    app.get('/upload', function(req, res){
        res.render('upload.ejs');
    });

    app.post('/upload', function(req, res){
        // create an incoming form object
        var form = new formidable.IncomingForm();

        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;

        // store all uploads in the /uploads directory
        form.uploadDir = path.join(__dirname, '../uploads');

        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function(field, file) {
            fs.rename(file.path, path.join(form.uploadDir, file.name));
        });

        // log any errors that occur
        form.on('error', function(err) {
            console.log('An error has occured: \n' + err);
        });

        // once all the files have been uploaded, send a response to the client
        form.on('end', function() {
            res.end('success');
        });

        // parse the incoming request containing the form data
        form.parse(req);

    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        res.json(req.user);
        // res.render('profile.ejs', {
        //     user : req.user // get the user out of session and pass to template
        // });
    });

    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    // route for facebook authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/profile',
            failureRedirect : '/'
        }));


    
    
    
    
    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // =====================================
    // SUBMISSION ==========================
    // =====================================

    // Create new submission
    app.post('/submit',isLoggedIn,function(req,res) {
        console.log(req.body);
        post_id = req.body.post_id;
        url = req.body.image_url;
        // NOTE: PUT A CHECK IF POST_ID IS VALID!!
        user = req.user;
        console.log(user.submission);

        submission_id = uuidV1();
        // Adding new submission to table
        date = (new Date).getTime();
        var params = {
            TableName: 'RDV',
            Item: { // a map of attribute name to AttributeValue
                uuid: submission_id,
                "user_id": req.user.uuid,
                "type": "submission",
                "post_id": post_id,
                "url": url,
                "created": date,
                "is_checked": 0,
                "points": date,
            },
        };
        docClient.put(params, function(err, data) {
            if (err)
                throw (err); // an error occurred
            // successful response then add submission to the user array
            var params = {
                TableName:'RDV',
                Key:{
                    uuid: req.user.uuid,
                },
                ExpressionAttributeNames: { // a map of substitutions for attribute names with special characters
                    "#id": post_id,
                },
                ExpressionAttributeValues:{
                    ":r":[submission_id],
                },
                ReturnValues:"NONE"
            };
            if (!(post_id in user.submission)){
                // if new submission
                params["UpdateExpression"] = "set submission.#id = :r";
                
            } else {
                // adding submission
                params["UpdateExpression"] = "set submission.#id = list_append(submission.#id, :r)";
            }
            
            docClient.update(params, function(err, data) {
                if (err){
                    req.flash("failure", "Some error occurred. Please try after sometime.")
                    res.redirect("/profile");
                } // an error occurred
                // successful response
                else {
                    req.flash("success","Submission successfully made.")
                    res.redirect("/profile");
                }
            });
        });
    });

    // =====================================
    // APPROVE =============================
    // =====================================

    // Approve new submission
    app.post('/approve',isLoggedIn,isAdmin, function(req,res){
        submission_id = req.body.submission_id;
        points = parseInt(req.body.points,10);
        console.log(points);
        console.log(points*configCons.scaling_factor);
        date = (new Date).getTime();
        var params = {
            TableName: 'RDV',
            Key: { 
                uuid: submission_id,
            },
            UpdateExpression: 'SET is_checked = :ok, points = points + :value, approved_by = :name, approved_date = :date', // String representation of the update to an attribute
            ConditionExpression: 'is_checked < :ok',
            ExpressionAttributeValues: { // a map of substitutions for all attribute values
                ':value': points*configCons.scaling_factor,
                ':ok': 1,
                ':name': req.user.name,
                ':date': (new Date).getTime(),
            },
            ReturnValues: 'ALL_NEW', // optional (NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW)
        };

        docClient.update(params, function(err, data) {
            if(data==undefined || err){
                res.json(err);
                // res.json({"ok":0,"message": "Some error occurred while searching for submission"});
            }
            else {
                submission = data.Attributes;
                console.log(submission);
                var params = {
                    TableName: 'RDV',
                    Key: { 
                        uuid: submission.user_id,
                    },
                    UpdateExpression: 'SET points = points + :value', // String representation of the update to an attribute
                    ExpressionAttributeValues: { // a map of substitutions for all attribute values
                        ':value': points*configCons.scaling_factor,
                    },
                    ReturnValues: 'NONE', // optional (NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW)
                };
                docClient.update(params, function(err, data) {
                    if(data==undefined || err){
                        res.json({"ok":0,"message": "Couldn't update user points"});
                    }
                    else {
                        res.json({"ok":1,"message": "Successfully updated user points"})
                    }
                });
            }
        });

    });

    app.get('/approve',isLoggedIn,isAdmin,function(req,res){
        var params = {
            TableName: 'RDV',
            IndexName: 'submission', // optional (if querying an index)
            KeyConditionExpression: 'is_checked = :val', // a string representing a constraint on the attribute
            ExpressionAttributeValues: { // a map of substitutions for all attribute values
            ':val': 0
            },
            ScanIndexForward: true, // optional (true | false) defines direction of Query in the index
            Limit: 20, // optional (limit the number of items to evaluate)
        };
        docClient.query(params, function(err, data) {
            if (err || data==undefined){
                res.json(err);                
                // req.flash("failure", "Some error occurred. Please try after sometime.")
                // res.redirect("/profile");     
            }
            else{
                submissions = data.Items;
                res.json(submissions);
                // res.render("approve.ejs",{submissions: submissions});
            }
        });
    });

    // =====================================
    // LEADERBOARD ==========================
    // =====================================
    app.get('/leaderboard',isLoggedIn,function(req,res) {
        var params = {
            TableName: 'RDV',
            IndexName: 'leaderboard', // optional (if querying an index)
            Limit: 20,
            KeyConditionExpression: '#type = :val', // a string representing a constraint on the attribute
            // FilterExpression: 'attr_name = :val', // a string representing a constraint on the attribute
            ExpressionAttributeNames: { // a map of substitutions for attribute names with special characters
                '#type': 'type'
            },
            ExpressionAttributeValues: {
            ':val': "user"
            },
            ScanIndexForward: false, // optional (true | false) defines direction of Query in the index
        };
        docClient.query(params, function(err, data) {
            if (err){
                req.flash("failure", "Some error occurred. Please try after sometime.")
                res.redirect("/profile");
            } // an error occurred
            // successful response
            else {
                res.json(data.Items);
                // req.flash("success","Submission successfully made.")
                // res.render("leaderboard.ejs",{leaderboard: data.Items});
            }
        });
    });
    
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

// route middleware to make sure a user is logged in
function isAdmin(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.user.type == "admin" || req.user.type == "god")
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}
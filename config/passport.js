// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var uuidV1 = require('uuid/v1');
var bcrypt   = require('bcrypt-nodejs');

// load up the user model
// var User            = require('../app/models/user');
// var Temp            = require('../app/models/temp_user');


// load the auth variables
var configAuth = require('./auth');

const generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

const validPassword = function(password,hashed) {
    return bcrypt.compareSync(password, hashed);
};


// expose this function to our app using module.exports
module.exports = function(passport,AWS) {

    // =========================================================================
    // docClient setup ==================================================
    // =========================================================================
    var docClient = new AWS.DynamoDB.DocumentClient();

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        console.log("User id: " + user.uuid);
        done(null, user.uuid);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        console.log("User id: " + id);        
        // User.findById(id, function(err, user) {
        //     done(err, user);
        // });
        // Temp.findById(id,function(err,user) {
        //   done(err,user);
        // });
        var params = {
            TableName: 'Users',
            Key: {
                uuid: id,
            },
            ConsistentRead: false, // optional (true | false)
            ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
        };
        docClient.get(params, function(err, data) {
            if(data) done(err,data.Item);
            else done(err,data);
      });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        
        // User.findOne({ 'local.email' :  email }, function(err, user) {
        //     // if there are any errors, return the error
        //     if (err)
        //         return done(err);

        //     // check to see if theres already a user with that email
        //     if (user) {
        //         return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
        //     } else {

        //         // if there is no user with that email
        //         // create the user
        //         var newUser            = new User();

        //         // set the user's local credentials
        //         newUser.local.email    = email;
        //         newUser.local.password = newUser.generateHash(password);

        //         // save the user
        //         newUser.save(function(err) {
        //             if (err)
        //                 throw err;
        //             return done(null, newUser);
        //         });
        //     }

        // });

        var params = {
            TableName: 'Users',
            IndexName: 'mail_address', // optional (if querying an index)
            KeyConditionExpression: 'email = :value', // a string representing a constraint on the attribute
            ExpressionAttributeValues: { // a map of substitutions for all attribute values
              ':value': email,
            },
        };

        docClient.query(params, function(err, data) {
            if (err) return done(err); // an error occurred
            
            if (data.Count > 0) {
              return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
            }else{
              var params = {
                  TableName: 'Users',
                  Item: { // a map of attribute name to AttributeValue
                      uuid: uuidV1(),
                      email: email,
                      password: generateHash(password),
                  },
              };
              docClient.put(params, function(err, data) {
                  if (err)
                    throw (err); // an error occurred
                  return done(null,params.Item); // successful response
              });
            }
        });


        // console.log(Temp.db);
        
        // Temp.findByEmail(email,function(err, user) {
        //     // if there are any errors, return the error
        //     if (err)
        //         return done(err);

        //     // check to see if theres already a user with that email
        //     if (user) {
        //         return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
        //     } else {

        //         // if there is no user with that email
        //         // create the user
        //         var newUser            = Temp.new_user();

        //         // set the user's local credentials
        //         newUser.email    = email;
        //         newUser.password = password;

        //         // save the user
        //         Temp.save(newUser,function(err) {
        //             if (err)
        //                 throw err;
        //             return done(null, newUser);
        //         });
        //     }

        // });

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form
        console.log("entered here");
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        // User.findOne({ 'local.email' :  email }, function(err, user) {
        //     // if there are any errors, return the error before anything 
        //   console.log("found something");
            
        //     if (err)
        //         return done(err);

        //     // if no user is found, return the message
        //     if (!user)
        //         return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

        //     // if the user is found but the password is wrong
        //     if (!user.validPassword(password))
        //         return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

        //     // all is well, return successful user
        //     return done(null, user);
        // });

        var params = {
            TableName: 'Users',
            IndexName: 'mail_address', // optional (if querying an index)
            KeyConditionExpression: 'email = :value', // a string representing a constraint on the attribute
            ExpressionAttributeValues: { // a map of substitutions for all attribute values
              ':value': email,
            },
        };

        docClient.query(params, function(err, data) {
            if (err) return done(err); // an error occurred
            
            if (data.Count > 0) {
              var user = data.Items[0];
              if (!validPassword(password,user.password))
                return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
              
              return done(null, user);
            }else{
              return done(null, false, req.flash('loginMessage', 'No user found.'));
            }
        });

        // Temp.findByEmail(email , function(err, user) {
        //     // if there are any errors, return the error before anything else
        //     if (err)
        //         return done(err);

        //     // if no user is found, return the message
        //     if (!user)
        //         return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

        //     // if the user is found but the password is wrong
        //     if (!(user.password==password))
        //         return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

        //     // all is well, return successful user
        //     return done(null, user);
        // });

    }));


    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({

        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL

    },

    // facebook will send back the token and profile
    function(token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // find the user in the database based on their facebook id
            // User.findOne({ 'facebook.id' : profile.id }, function(err, user) {

            //     // if there is an error, stop everything and return that
            //     // ie an error connecting to the database
            //     if (err)
            //         return done(err);

            //     // if the user is found, then log them in
            //     if (user) {
            //         return done(null, user); // user found, return that user
            //     } else {
            //         // if there is no user found with that facebook id, create them
            //         var newUser            = new User();

            //         // set all of the facebook information in our user model
            //         newUser.facebook.id    = profile.id; // set the users facebook id                   
            //         newUser.facebook.token = token; // we will save the token that facebook provides to the user                    
            //         newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
            //         // newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

            //         // save our user to the database
            //         newUser.save(function(err) {
            //             if (err)
            //                 throw err;

            //             // if successful, return the new user
            //             return done(null, newUser);
            //         });
            //     }

            // });

            var params = {
                TableName: 'Users',
                IndexName: 'facebook_id', // optional (if querying an index)
                KeyConditionExpression: 'fb_id = :value', // a string representing a constraint on the attribute
                ExpressionAttributeValues: { // a map of substitutions for all attribute values
                  ':value': profile.id,
                },
            };

            docClient.query(params, function(err, data) {
                if (err) return done(err); // an error occurred
                
                if (data.Count > 0) {
                  var user = data.Items[0];
                  return done(null, user);
                }else{
                  var params = {
                      TableName: 'Users',
                      Item: { // a map of attribute name to AttributeValue
                          uuid: uuidV1(),
                          fb_id: profile.id,
                          fb_token: token,
                          name: profile.name.givenName + ' ' + profile.name.familyName,
                      },
                  };
                  docClient.put(params, function(err, data) {
                      if (err)
                        throw (err); // an error occurred
                      return done(null,params.Item); // successful response
                  });
                }
            });
        });

    }));

};
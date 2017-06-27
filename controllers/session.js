// route middleware to make sure a user is logged in
var config = require('../config/config.js');
var utils = require("../config/utils.js");
var jwt = require('jsonwebtoken');

var docClient = utils.connectToDB();

function isAuthenticated(req, res, next) {
    var token = req.body.token || req.param('token') || req.headers['x-access-token'];
    if (!token) {
        return utils.error(res, 401, "Token not found");
    }
    jwt.verify(token, config.token_secret, function (err, user) {
        if (err)
            return utils.error(res, 401, "Invalid Token");
        var params = {
            TableName: 'RDV',
            Key: {
                uuid: user.uuid,
            }
        };
        docClient.get(params, function (err, data) {
            if (err) {
                return utils.error(res, 500, "Internal Server Error");
            } else {
                if (!data.Item)
                    return utils.error(res, 401, "Invalid Token");
                req.user = data.Item;
            }
        });
        next();
    });
}
// route middleware to make sure a user is logged in
function isAdmin(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.user.type == "admin" || req.user.type == "god")
        return next();

    return utils.error(res, 403, "You do not have the required permissions");
}

module.exports = {
  isAuthenticated: isAuthenticated,
  isAdmin: isAdmin,  
}
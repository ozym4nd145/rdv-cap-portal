var bcrypt   = require('bcrypt-nodejs');
var configAuth = require('./config/auth');
var configCons = require("./config/constants");
var uuidV1 = require('uuid/v1');

var AWS = require("aws-sdk");
var configDB = require('./config/database.js');
AWS.config.update(configDB);
var docClient = new AWS.DynamoDB.DocumentClient();

const generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};


function create(name,email,password,type){
    date = (new Date).getTime();    
    var params = {
        TableName: 'RDV',
        Item: { // a map of attribute name to AttributeValue
            uuid: uuidV1(),
            email: email,
            name: name,
            password: generateHash(password),
            created: date,
            is_checked: 1,
            type: type,
            submission: {},
            points: date,
        },
    };
    return docClient.put(params, function(err, data) {
        if (err)
            throw (err); // an error occurred
        return 1; // successful response
    });
}

module.exports = create;
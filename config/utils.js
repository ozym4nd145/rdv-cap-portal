const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const config = require('./config');

AWS.config.update({
  accessKeyId: "myKeyId",
  secretAccessKey: "secretKey",
  region: "us-west-2",
  endpoint: "http://localhost:8000",
});

function connectToDB() {
  return new AWS.DynamoDB.DocumentClient();
}

function generateToken(user) {
  //1. Dont use password and other sensitive fields
  //2. Use fields that are useful in other parts of the
  //app/collections/models
  var u = {
    uuid: user.uuid,
  };
  return token = jwt.sign(u, config.token_secret, {
    expiresIn: 60 * 60 * 24 * 60 // expires in 60 days
  });
}

function error(res, statusCode, msg) {
  res.status(statusCode).json({
    error: true,
    message: msg,
  })
}

module.exports = {
  connectToDB: connectToDB,
  generateToken: generateToken,
  error: error,
};
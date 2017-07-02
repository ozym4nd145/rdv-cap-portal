const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: "myKeyId",
  secretAccessKey: "secretKey",
  region: "us-west-2",
  endpoint: "http://localhost:8000",
});

var dynamodb = new AWS.DynamoDB()
var params = {
    TableName: 'RDV',
};
dynamodb.deleteTable(params, function(err, data) {
    if (err) console.log(err); // an error occurred
    else console.log(data); // successful response
});
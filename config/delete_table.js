var utils = require("../config/utils.js");

var dynamodb = utils.connectTableDB();

var params = {
    TableName: 'RDV',
};
dynamodb.deleteTable(params, function(err, data) {
    if (err) console.log(err); // an error occurred
    else console.log(data); // successful response
});
var AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: "myKeyId",
  secretAccessKey: "secretKey",
  region: "us-west-2",
  endpoint: "http://localhost:8000"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName: 'Users',
    KeySchema: [ // The type of of schema.  Must start with a HASH type, with an optional second RANGE.
        { // Required HASH type attribute
            AttributeName: 'uuid',
            KeyType: 'HASH',
        }
    ],
    AttributeDefinitions: [ // The names and types of all primary and index key attributes only
        {
            AttributeName: 'uuid',
            AttributeType: 'S', // (S | N | B) for string, number, binary
        },
        {
            AttributeName: 'fb_id',
            AttributeType: 'S', // (S | N | B) for string, number, binary
        },
        {
            AttributeName: 'email',
            AttributeType: 'S', // (S | N | B) for string, number, binary
        },
    ],
    ProvisionedThroughput: { // required provisioned throughput for the table
        ReadCapacityUnits: 100, 
        WriteCapacityUnits: 100, 
    },
    GlobalSecondaryIndexes: [ // optional (list of GlobalSecondaryIndex)
        { 
            IndexName: 'mail_address', 
            KeySchema: [
                { // Required HASH type attribute
                    AttributeName: 'email',
                    KeyType: 'HASH',
                }
            ],
            Projection: { // attributes to project into the index
                ProjectionType: 'ALL', // (ALL | KEYS_ONLY | INCLUDE)
            },
            ProvisionedThroughput: { // throughput to provision to the index
                ReadCapacityUnits: 100,
                WriteCapacityUnits: 100,
            },
        },
        { 
            IndexName: 'facebook_id', 
            KeySchema: [
                { // Required HASH type attribute
                    AttributeName: 'fb_id',
                    KeyType: 'HASH',
                }
            ],
            Projection: { // attributes to project into the index
                ProjectionType: 'ALL', // (ALL | KEYS_ONLY | INCLUDE)
            },
            ProvisionedThroughput: { // throughput to provision to the index
                ReadCapacityUnits: 100,
                WriteCapacityUnits: 100,
            },
        },
        // ... more global secondary indexes ...
    ],
    
};
dynamodb.createTable(params, function(err, data) {
    if (err) console.log(err); // an error occurred
    else console.log(data); // successful response

});
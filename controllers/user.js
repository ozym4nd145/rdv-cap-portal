var uuidV1 = require('uuid/v1');
var utils = require('../config/utils.js');
var bcrypt   = require('bcrypt-nodejs');

var docClient = utils.connectToDB();

function login(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password)
    return utils.error(res, 401, "Email or Password is wrong");
  var params = {
    TableName: 'RDV',
    IndexName: 'mail_address', // optional (if querying an index)
    KeyConditionExpression: 'email = :value', // a string representing a constraint on the attribute
    ExpressionAttributeValues: { // a map of substitutions for all attribute values
      ':value': email,
    },
  };
  docClient.query(params, function (err, data) {
    if (err) {
      return utils.error(res, 500, "Internal Server Error");
    } else {
      if (!(data.Count > 0))
        return utils.error(res, 401, "Email does not exist");
      var user = data.Items[0];
      if (!validPassword(password, user.password))
        return utils.error(res, 401, "Password incorrect");
      delete user['password'];
      const token = utils.generateToken(user);
      return res.json({
        user: user,
        token: token,
      });
    }
  });
}

function signup(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password)
    return utils.error(res, 401, "Email or Password is wrong");
  var params = {
    TableName: 'RDV',
    IndexName: 'mail_address', // optional (if querying an index)
    KeyConditionExpression: 'email = :value', // a string representing a constraint on the attribute
    ExpressionAttributeValues: { // a map of substitutions for all attribute values
      ':value': email,
    },
  };

  docClient.query(params, function (err, data) {
    if (err) {
      return utils.error(res, 500, "Internal Server Error");
    } else {
      if (data.Count > 0) {
        return utils.error(res, 401, "User already exists");
      } else {
        date = (new Date).getTime();
        var params = {
          TableName: 'RDV',
          Item: { // a map of attribute name to AttributeValue
            uuid: uuidV1(),
            email: email,
            password: generateHash(password),
            type: "user",
            created: date,
            is_checked: 1,
            submission: {},
            points: date,
          },
        };
        docClient.put(params, function (err, data) {
          if (err)
            return utils.error(res, 500, "Internal Server Error");

          delete params.Item['password'];
          const token = utils.generateToken(params.Item);
          return res.json({
            user: params.Item,
            token: token,
          });
        });
      }
    }
  });
}

function profile(req, res) {
  var params = {
    TableName: 'RDV',
    Key: {
      uuid: req.user.uuid,
    }
  };
  docClient.get(params, function (err, data) {
    if (err) {
      return utils.error(res, 500, "Internal Server Error");
    } else {
      if (!data.Item)
        return utils.error(res, 401, "Invalid Token");
      delete data.Item['password'];
      return res.json({
        user: data.Item,
      });
    }
  });
}

function submit(req, res) {
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
  docClient.put(params, function (err, data) {
    if (err)
      throw (err); // an error occurred
    // successful response then add submission to the user array
    var params = {
      TableName: 'RDV',
      Key: {
        uuid: req.user.uuid,
      },
      ExpressionAttributeNames: { // a map of substitutions for attribute names with special characters
        "#id": post_id,
      },
      ExpressionAttributeValues: {
        ":r": [submission_id],
      },
      ReturnValues: "NONE"
    };
    if (!(post_id in user.submission)) {
      // if new submission
      params["UpdateExpression"] = "set submission.#id = :r";

    } else {
      // adding submission
      params["UpdateExpression"] = "set submission.#id = list_append(submission.#id, :r)";
    }

    docClient.update(params, function (err, data) {
      if (err) {
        return utils.error(res, 500, "Internal Server Error");
      } else {
        return res.json({
          error: false,
          message: "Submission successfully made!"
        });

      }
    });
  });
}

function leaderboard(req, res) {
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
  docClient.query(params, function (err, data) {
    if (err) {
      return utils.error(res, 500, "Internal Server Error");
    } else {
      if (!data.Items)
        return utils.error(res, 500, "Internal Server Error");
      return res.json({
        leaderboard: data.Items,
      });
    }
  });
}

const generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

const validPassword = function(password,hashed) {
    return bcrypt.compareSync(password, hashed);
};

module.exports = {
  login: login,
  signup: signup,
  profile: profile,
  submit: submit,
  leaderboard: leaderboard
}
var utils = require("../config/utils.js");
var config = require("../config/config.js");

var docClient = utils.connectToDB();

function approve_submission(req, res) {
  submission_id = req.body.submission_id;
  points = parseInt(req.body.points, 10);

  if(!submission_id || !points)
    return utils.error(res, 401, "Post submission id or points not given");

  date = (new Date).getTime();
  var params = {
    TableName: 'RDV',
    Key: {
      uuid: submission_id,
    },
    UpdateExpression: 'SET is_checked = :ok, points = points + :value, approved_by = :name, approved_date = :date', // String representation of the update to an attribute
    ConditionExpression: 'is_checked < :ok',
    ExpressionAttributeValues: { // a map of substitutions for all attribute values
      ':value': points * config.scaling_factor,
      ':ok': 1,
      ':name': req.user.name,
      ':date': (new Date).getTime(),
    },
    ReturnValues: 'ALL_NEW', // optional (NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW)
  };

  docClient.update(params, function (err, data) {
    if (data == undefined || err) {
      res.json(err);
      // res.json({"ok":0,"message": "Some error occurred while searching for submission"});
    } else {
      submission = data.Attributes;
      console.log(submission);
      var params = {
        TableName: 'RDV',
        Key: {
          uuid: submission.user_id,
        },
        UpdateExpression: 'SET points = points + :value', // String representation of the update to an attribute
        ExpressionAttributeValues: { // a map of substitutions for all attribute values
          ':value': points * config.scaling_factor,
        },
        ReturnValues: 'NONE', // optional (NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW)
      };
      docClient.update(params, function (err, data) {
        if (data == undefined || err) {
          res.json({
            "ok": 0,
            "message": "Couldn't update user points"
          });
        } else {
          res.json({
            "ok": 1,
            "message": "Successfully updated user points"
          })
        }
      });
    }
  });

}

function get_submissions(req, res) {
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
  docClient.query(params, function (err, data) {
    if (err || data == undefined) {
      res.json(err);
      // req.flash("failure", "Some error occurred. Please try after sometime.")
      // res.redirect("/profile");     
    } else {
      submissions = data.Items;
      res.json(submissions);
      // res.render("approve.ejs",{submissions: submissions});
    }
  });
}

module.exports = {
  approve_submission: approve_submission,
  get_submissions: get_submissions
}
database = JSON.parse('[{"password": "haha", "email": "suyash1212@gmail.com" , "id": 0}, {"password": "lol", "email": "rdv_temp", "id" : 1}]');

class Temp {
  
  constructor(database) {
    this.db = database;
    this.id = database.length;
  }
  
  findById(id,callback)
  {
    var len = this.db.length;
    for(var i=0;i<len;i++)
    {
      if(this.db[i].id == id)
      {
        return callback(null,this.db[i])
      }
    }
    return callback(null,null);
  }

  findByEmail(email,callback)
  {
    var len = this.db.length;
    for(var i=0;i<len;i++)
    {
      if(this.db[i].email == email)
      {
        return callback(null,this.db[i])
      }
    }
    return callback(null,null)
  }

  save(user,callback)
  {
    this.db.push(user);
    return callback(null);
  }

  new_user()
  {
    this.id += 1;
    return {"id": this.id-1};
  }

}
// var cal = function(err,user) { if(err){console.log("Not found");}else{console.log(user);} }
// var tmp = Temp(database);
module.exports = new Temp(database);
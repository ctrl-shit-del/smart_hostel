require('dotenv').config({path:'.env'});
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGO_URI, {dbName:'hostel_db'}).then(async () => {
  const db = mongoose.connection.db;
  const hashedPassword = await bcrypt.hash('laundry123', 12);
  const res = await db.collection('staff').updateOne(
    {name: 'Mr. Rajesh Kumar'}, 
    {$set: {username: 'dhobi_rajesh', password: hashedPassword, sys_role: 'housekeeping'}}
  );
  console.log('Updated staff user. Modified: ' + res.modifiedCount);
  process.exit(0);
});

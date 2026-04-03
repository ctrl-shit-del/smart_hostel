require('dotenv').config({path:'.env'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {dbName:'hostel_db'}).then(async () => {
  const db = mongoose.connection.db;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  for(let f=1;f<=10;f++){ 
    await db.collection('mongoose_rooms').updateMany({floor_no: f}, JSON.parse('{"$set":{"laundry_day":"' + days[f%7] + '"}}')); 
  }
  console.log('Done mapping floors');
  process.exit(0);
});

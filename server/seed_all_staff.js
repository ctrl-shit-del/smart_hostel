require('dotenv').config({path:'.env'});
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const generatePass = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for(let i=0; i<10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
};

const generateUsername = async (db) => {
  let isUnique = false;
  let username = '';
  while(!isUnique) {
    username = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await db.collection('staff').findOne({username});
    if(!existing) isUnique = true;
  }
  return username;
};

mongoose.connect(process.env.MONGO_URI, {dbName:'hostel_db'}).then(async () => {
  const db = mongoose.connection.db;
  const cursor = db.collection('staff').find({});
  const allStaff = await cursor.toArray();
  
  console.log('--- STAFF CREDENTIALS ---');
  for (const staff of allStaff) {
    const username = await generateUsername(db);
    const rawPass = generatePass();
    const hashedPassword = await bcrypt.hash(rawPass, 12);
    
    await db.collection('staff').updateOne(
      { _id: staff._id },
      { $set: { username, password: hashedPassword } }
    );
    
    console.log(`Name: ${staff.name}`);
    console.log(`Role: ${staff.role}`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${rawPass}`);
    console.log('-------------------------');
  }
  
  console.log(`Successfully updated ${allStaff.length} staff members.`);
  process.exit(0);
});

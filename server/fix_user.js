require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://mayankthakur827_db_user:M%40y%40nk310805@ac-uz5geau-shard-00-00.at0ov7b.mongodb.net:27017,ac-uz5geau-shard-00-01.at0ov7b.mongodb.net:27017,ac-uz5geau-shard-00-02.at0ov7b.mongodb.net:27017/?authSource=admin&replicaSet=atlas-91k89r-shard-0&tls=true';

const updateData = {
  name: "Parth Shah",
  register_number: "23BEC1106",
  password: "S7wJ0UlaKN",
  block_name: "A Block",
  floor_no: 1, // 'Floor 1' -> 1
  floor: "Floor 1",
  room_no: 102,
  bed: "Bed C",
  bed_type: "3 Bed NAC",
  mess: "Non-Veg Fusion",
  phone: "+91-6236087634",
  email: "parth.shah@vit.ac.in",
  gender: "Male",
  parent_name: "Ramesh Shah",
  parent_phone: "+91-8604726172",
  parent_email: "ramesh.shah@gmail.com"
};

async function fix() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { dbName: 'hostel_db' });
    console.log('Connected!');

    const db = mongoose.connection.db;
    const usersCol = db.collection('users');

    updateData.updatedAt = new Date();

    const result = await usersCol.updateOne(
      { register_number: "23BEC1106" },
      { $set: updateData },
      { upsert: true }
    );

    console.log('Update result:', result);
    console.log('Successfully updated 23BEC1106 with real data from JSON');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fix();

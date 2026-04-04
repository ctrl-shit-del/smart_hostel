require('dotenv').config();
const mongoose = require('mongoose');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const Student = mongoose.connection.collection('students');
    const User = mongoose.connection.collection('users');

    const students = await Student.find({}, { projection: { register_number: 1, _id: 0, block_name: 1, role: 1 } }).limit(50).toArray();
    console.log('Students in DB:');
    console.log(students);

    const legacy = await User.find({}, { projection: { register_number: 1, _id: 0 } }).limit(20).toArray();
    console.log('\nLegacy Users in DB:');
    console.log(legacy);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listUsers();

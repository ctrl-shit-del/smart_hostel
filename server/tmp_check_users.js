require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const students = await Student.find({}, 'register_number name').limit(5);
    console.log(students);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUsers();

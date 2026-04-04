require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
const bcrypt = require('bcryptjs');

async function upsertFlags() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const regNumRaw = '23BEC1106';
    const regNum = regNumRaw.trim().toUpperCase();

    // Use findOneAndUpdate with upsert: true
    const updatedStudent = await Student.findOneAndUpdate(
      { register_number: regNum },
      {
        $setOnInsert: {
          name: 'Test Student',
          email: 'test@student.com',
          password: await bcrypt.hash('password123', 10),
          role: 'student',
          block_name: 'A Block',
          floor: 'Floor 1',
          room_no: 101,
          is_active: true
        },
        $set: {
          dhobi_offence: 2,
          community_strikes: 1,
          outing_flag_count: 1,
          is_flagged: true
        }
      },
      { new: true, upsert: true }
    );

    console.log(`Successfully added/updated testing flags for student:`);
    console.log(updatedStudent);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

upsertFlags();

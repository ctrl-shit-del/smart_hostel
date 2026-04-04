require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');

async function forceUpdateFlags() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'hostel_db' });
    console.log('Connected to DB: hostel_db');

    const objectId = new mongoose.Types.ObjectId("69cff49390f89024a4467d3a");
    const student = await Student.findById(objectId);

    if (!student) {
      console.log('User not found by ID! Trying by Register Number...');
      const fallback = await Student.findOne({ register_number: '23BEC1106' });
      if (fallback) {
        fallback.dhobi_offence = 2;
        fallback.community_strikes = 1;
        fallback.outing_flag_count = 1;
        fallback.is_flagged = true;
        await fallback.save();
        console.log('Successfully added flags to user via Register Number fallback!');
        return;
      }
      console.log('User completely not found!');
      return;
    }

    student.dhobi_offence = 2;
    student.community_strikes = 1;
    student.outing_flag_count = 1;
    student.is_flagged = true;

    await student.save();
    console.log('Successfully forced the flags on the specific document!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

forceUpdateFlags();

require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./src/models/Student');

async function addFlags() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Robust search using regex
    const regNumRaw = '23BEC1106';
    const student = await Student.findOne({ 
      register_number: new RegExp(regNumRaw.trim(), 'i') 
    });

    if (!student) {
      console.log(`Student matching ${regNumRaw} not found!`);
      // Fallback: lookup in legacy users collection if they haven't run migration fully?
      const LegacyUser = mongoose.connection.collection('users');
      const legacy = await LegacyUser.findOne({ register_number: new RegExp(regNumRaw.trim(), 'i') });
      if (legacy) {
        console.log(`Found in legacy 'users' collection instead of 'students'. The migration might not have moved this user.`);
      }
      process.exit(1);
    }

    console.log(`Found student: ${student.name} in Student collection.`);
    
    student.dhobi_offence = 2;
    student.community_strikes = 1;
    student.outing_flag_count = 1;
    student.is_flagged = true;

    await student.save();
    console.log(`Successfully added testing flags to ${student.register_number}!`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

addFlags();

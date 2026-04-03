/**
 * Seed Users — Creates User documents from existing Atlas students + demo staff accounts.
 * Run from project root: node scripts/seed/seed_users.js
 */
const path = require('path');
const serverDir = path.join(__dirname, '..', '..', 'server');
// Add server's node_modules to require resolution
module.paths.unshift(path.join(serverDir, 'node_modules'));

require('dotenv').config({ path: path.join(serverDir, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'hostel_db';

const DEMO_STAFF = [
  {
    name: 'Dr. Raghav Sharma',
    register_number: 'ADMIN01',
    email: 'admin@smarthostel.in',
    role: 'hostel_admin',
    password: 'Admin@123',
    block_name: 'A Block',
    gender: 'Male',
    is_campus_wide: true,
    staff_role: 'Director',
  },
  {
    name: 'Prof. Meena Iyer',
    register_number: 'WARDEN01',
    email: 'warden@smarthostel.in',
    role: 'warden',
    password: 'Warden@123',
    block_name: 'A Block',
    floor_no: 1,
    gender: 'Female',
    staff_role: 'Chief Warden',
    shift_start: '08:00',
    shift_end: '20:00',
  },
  {
    name: 'Suresh Kumar',
    register_number: 'GUARD01',
    email: 'guard@smarthostel.in',
    role: 'guard',
    password: 'Guard@123',
    block_name: 'A Block',
    gender: 'Male',
    staff_role: 'Security Guard',
    shift_start: '06:00',
    shift_end: '18:00',
  },
  {
    name: 'Anitha Devi',
    register_number: 'FLOOR01',
    email: 'flooradmin@smarthostel.in',
    role: 'floor_admin',
    password: 'Floor@123',
    block_name: 'A Block',
    floor_no: 1,
    gender: 'Female',
    staff_role: 'Floor Admin',
  },
  {
    name: 'Ravi Shankar',
    register_number: 'MESS01',
    email: 'mess@smarthostel.in',
    role: 'mess_incharge',
    password: 'Mess@123',
    block_name: 'A Block',
    gender: 'Male',
    staff_role: 'Mess In-charge',
  },
];

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const conn = await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = conn.connection.db;
  console.log('Connected to: ' + conn.connection.host);

  const usersCol = db.collection('users');

  // 1. Create staff/demo accounts
  console.log('\n--- Creating demo staff accounts ---');
  for (const staff of DEMO_STAFF) {
    const exists = await usersCol.findOne({ register_number: staff.register_number });
    if (exists) {
      console.log('  [SKIP] ' + staff.register_number + ' already exists');
      continue;
    }
    const hashed = await bcrypt.hash(staff.password, 12);
    await usersCol.insertOne({
      ...staff,
      password: hashed,
      is_active: true,
      is_flagged: false,
      created_at: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  [OK] Created ' + staff.register_number + ' (' + staff.role + ')');
  }

  // 2. Read existing students collection and create User documents
  console.log('\n--- Migrating students to users collection ---');
  const studentsCol = db.collection('students');
  const students = await studentsCol.find({}).toArray();
  console.log('Found ' + students.length + ' students in Atlas');

  const defaultPassword = await bcrypt.hash('Student@123', 12);
  let created = 0, skipped = 0;

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    const ops = [];

    for (const s of batch) {
      // Check if user already exists
      const regNum = (s.register_number || '').toUpperCase();
      if (!regNum) continue;

      ops.push({
        updateOne: {
          filter: { register_number: regNum },
          update: {
            $setOnInsert: {
              name: s.name || 'Student ' + regNum,
              register_number: regNum,
              password: defaultPassword,
              role: 'student',
              block_name: s.block_name || 'A Block',
              floor_no: s.floor || null,
              room_no: s.room_no || null,
              bed_type: s.bed_type || null,
              gender: s.gender || null,
              is_active: true,
              is_flagged: false,
              created_at: s.created_at || new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length > 0) {
      const result = await usersCol.bulkWrite(ops);
      created += result.upsertedCount;
      skipped += (ops.length - result.upsertedCount);
    }

    process.stdout.write('  Progress: ' + Math.min(i + batchSize, students.length) + '/' + students.length + '\r');
  }

  console.log('\n  Created: ' + created + ', Skipped (already exist): ' + skipped);

  // 3. Ensure a specific demo student exists (the one referenced in the login page)
  const demoStudent = await usersCol.findOne({ register_number: '23BCE1001' });
  if (!demoStudent) {
    // Find any student and alias or create one
    const anyStudent = await studentsCol.findOne({});
    const hashed = await bcrypt.hash('Student@123', 12);
    await usersCol.insertOne({
      name: anyStudent?.name || 'Demo Student',
      register_number: '23BCE1001',
      password: hashed,
      role: 'student',
      block_name: anyStudent?.block_name || 'A Block',
      floor_no: anyStudent?.floor || 1,
      room_no: anyStudent?.room_no || 101,
      gender: anyStudent?.gender || 'Male',
      bed_type: anyStudent?.bed_type || '3 Bed NAC',
      is_active: true,
      is_flagged: false,
      created_at: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('\n  [OK] Created demo student 23BCE1001');
  } else {
    console.log('\n  [SKIP] Demo student 23BCE1001 already exists');
  }

  // 4. Seed user's specific requested credentials
  const targetHashed = await bcrypt.hash('S7wJ0UlaKN', 12);
  const atlasStudent = await studentsCol.findOne({ register_number: /23BEC1106/i });
  
  if (atlasStudent) {
    const existing = await usersCol.findOne({ register_number: '23BEC1106' });
    if (existing) {
      await usersCol.updateOne(
        { register_number: '23BEC1106' },
        { 
          $set: { 
            password: targetHashed,
            name: atlasStudent.name // Override 'Hostel User' with actual name from database
          } 
        }
      );
      console.log('\n  [OK] Updated password and name for requested user 23BEC1106 from students DB');
    } else {
      await usersCol.insertOne({
        name: atlasStudent.name || 'Student 23BEC1106',
        register_number: '23BEC1106',
        password: targetHashed,
        role: 'student',
        block_name: atlasStudent.block_name || 'B Block',
        floor_no: atlasStudent.floor || 2,
        room_no: atlasStudent.room_no || 204,
        gender: atlasStudent.gender || 'Male',
        bed_type: atlasStudent.bed_type || '2 Bed AC',
        is_active: true,
        is_flagged: false,
        created_at: atlasStudent.created_at || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('\n  [OK] Created requested user 23BEC1106 from students DB');
    }
  } else {
    // If running in Memory DB, atlasStudent won't be found. We must fallback to exact provided data instead of 'Hostel User'.
    const existing = await usersCol.findOne({ register_number: '23BEC1106' });
    if (!existing) {
      await usersCol.insertOne({
        "name": "Parth Shah",
        "register_number": "23BEC1106",
        "password": "S7wJ0UlaKN", // The pre-save hook won't apply to native driver, but comparePassword allows plain-text!
        "password_hash": targetHashed, // Just in case it checks standard
        "role": "student",
        "block_name": "A Block",
        "floor": "Floor 1",
        "floor_no": 1,
        "room_no": 102,
        "bed": "Bed C",
        "bed_type": "3 Bed NAC",
        "mess": "Non-Veg Fusion",
        "phone": "+91-6236087634",
        "email": "parth.shah@vit.ac.in",
        "gender": "Male",
        "parent_name": "Ramesh Shah",
        "parent_phone": "+91-8604726172",
        "parent_email": "ramesh.shah@gmail.com",
        "is_active": true,
        "is_flagged": false,
        "created_at": new Date(),
        "createdAt": new Date(),
        "updatedAt": new Date()
      });
      
      // Update directly with the hash to be safe against both plaintext and bcrypt checks
      await usersCol.updateOne({ register_number: '23BEC1106' }, { $set: { password: targetHashed } });
      
      console.log('\n  [OK] Created requested user 23BEC1106 using fallback local JSON schema');
    }
  }

  // 4. Create indexes
  console.log('\n--- Ensuring indexes ---');
  await usersCol.createIndex({ register_number: 1 }, { unique: true, sparse: true });
  await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true });
  await usersCol.createIndex({ role: 1 });
  await usersCol.createIndex({ block_name: 1, floor_no: 1 });
  console.log('  Indexes created');

  // Summary
  const totalUsers = await usersCol.countDocuments();
  const studentCount = await usersCol.countDocuments({ role: 'student' });
  const staffCount = await usersCol.countDocuments({ role: { $ne: 'student' } });

  console.log('\n=== SEED COMPLETE ===');
  console.log('  Total users: ' + totalUsers);
  console.log('  Students:    ' + studentCount);
  console.log('  Staff/Admin: ' + staffCount);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('SEED ERROR:', err.message);
  process.exit(1);
});

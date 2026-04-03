/**
 * Sync Rooms — Reads existing Atlas `rooms` collection and creates proper
 * Mongoose-compatible Room documents with beds[] subdocuments.
 * Run from project root: node scripts/seed/sync_rooms.js
 */
const path = require('path');
const serverDir = path.join(__dirname, '..', '..', 'server');
module.paths.unshift(path.join(serverDir, 'node_modules'));

require('dotenv').config({ path: path.join(serverDir, '.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'hostel_db';

// Room type config — maps `type` + `size` to bed labels
const BED_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function roomTypeToEnum(type, size) {
  const t = (type || '').toLowerCase();
  if (t.includes('nac') || t.includes('non ac') || t.includes('non-ac')) {
    if (size === 2) return '2 Bed NAC';
    if (size === 3) return '3 Bed NAC';
    if (size === 4) return '4 Bed NAC';
    if (size === 6) return '6 Bed NAC';
  }
  if (t.includes('ac')) {
    if (size === 2) return '2 Bed AC';
    if (size === 3) return '3 Bed AC';
    if (size === 4) return '4 Bed AC';
  }
  // Fallback
  return size + ' Bed NAC';
}

function computeOccupancyStatus(beds, maintenanceFlag) {
  if (maintenanceFlag) return 'Under Maintenance';
  const occupiedCount = beds.filter(b => b.is_occupied).length;
  const total = beds.length;
  if (occupiedCount === 0) return 'Vacant';
  if (occupiedCount === total) return 'Occupied';
  return 'Partially Occupied';
}

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const conn = await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = conn.connection.db;
  console.log('Connected to: ' + conn.connection.host);

  const oldRoomsCol = db.collection('rooms');
  const newRoomsCol = db.collection('mongoose_rooms'); // Separate collection to avoid conflicts
  const usersCol = db.collection('users');
  const studentsCol = db.collection('students');

  // Check if already synced
  const existingCount = await newRoomsCol.countDocuments();
  if (existingCount > 0) {
    console.log('\nmongoose_rooms already has ' + existingCount + ' documents.');
    console.log('Drop and re-sync? Proceeding with drop...');
    await newRoomsCol.drop().catch(() => {});
  }

  // Read all old rooms
  const oldRooms = await oldRoomsCol.find({}).sort({ floor: 1, room_no: 1 }).toArray();
  console.log('\nFound ' + oldRooms.length + ' rooms in Atlas');

  // Build a map of register_number -> user _id from the users collection
  const userMap = {};
  const users = await usersCol.find({ role: 'student' }).toArray();
  for (const u of users) {
    if (u.register_number) userMap[u.register_number] = u;
  }
  console.log('Loaded ' + Object.keys(userMap).length + ' student users for mapping');

  // Convert each old room to new schema
  const newRooms = [];
  let totalBedsCreated = 0;
  let totalBedsOccupied = 0;

  for (const old of oldRooms) {
    const size = old.size || 3;
    const roomType = roomTypeToEnum(old.type || '', size);
    const floorNo = old.floor || 1;
    const roomNumber = old.room_no || 0;
    const blockName = old.block_name || 'A Block';
    const residents = old.residents || [];
    const occupied = old.occupied || 0;

    // Build beds array
    const beds = [];
    for (let i = 0; i < size; i++) {
      const bedId = BED_LABELS[i];
      const residentRegNum = residents[i] || null;
      let studentId = null;
      let studentName = null;

      if (residentRegNum && userMap[residentRegNum]) {
        studentId = userMap[residentRegNum]._id;
        studentName = userMap[residentRegNum].name;
      }

      const isOccupied = !!residentRegNum;
      beds.push({
        bed_id: bedId,
        student_id: studentId,
        student_name: studentName,
        register_number: residentRegNum,
        is_occupied: isOccupied,
        assigned_at: isOccupied ? new Date() : null,
      });

      totalBedsCreated++;
      if (isOccupied) totalBedsOccupied++;
    }

    const occupancyStatus = computeOccupancyStatus(beds, false);

    newRooms.push({
      block_name: blockName,
      floor_no: floorNo,
      room_number: roomNumber,
      room_type: roomType,
      total_beds: size,
      beds: beds,
      occupancy_status: occupancyStatus,
      maintenance_flag: false,
      maintenance_reason: '',
      swap_history: [],
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Bulk insert
  console.log('\nInserting ' + newRooms.length + ' rooms into mongoose_rooms...');
  await newRoomsCol.insertMany(newRooms);

  // Create indexes
  await newRoomsCol.createIndex({ block_name: 1, floor_no: 1, room_number: 1 }, { unique: true });
  await newRoomsCol.createIndex({ block_name: 1, occupancy_status: 1 });

  // Also link bed assignments back to users (update user.bed_id)
  console.log('\nUpdating user bed assignments...');
  let bedUpdates = 0;
  for (const room of newRooms) {
    for (const bed of room.beds) {
      if (bed.student_id) {
        await usersCol.updateOne(
          { _id: bed.student_id },
          { $set: { bed_id: bed.bed_id, room_no: room.room_number, floor_no: room.floor_no, block_name: room.block_name } }
        );
        bedUpdates++;
      }
    }
  }
  console.log('  Updated ' + bedUpdates + ' student bed assignments');

  // Summary
  const statusCounts = {};
  for (const r of newRooms) {
    statusCounts[r.occupancy_status] = (statusCounts[r.occupancy_status] || 0) + 1;
  }

  console.log('\n=== SYNC COMPLETE ===');
  console.log('  Rooms:          ' + newRooms.length);
  console.log('  Total Beds:     ' + totalBedsCreated);
  console.log('  Occupied Beds:  ' + totalBedsOccupied);
  console.log('  Vacancy Rate:   ' + (((totalBedsCreated - totalBedsOccupied) / totalBedsCreated) * 100).toFixed(1) + '%');
  console.log('  Status breakdown:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log('    ' + status + ': ' + count);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('SYNC ERROR:', err.message);
  process.exit(1);
});

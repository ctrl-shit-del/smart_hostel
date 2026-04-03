#!/usr/bin/env python3
"""
SmartHostel AI — Database Seeder
Generates realistic data for demo: 200 students, rooms, complaints, gatepasses, attendance, mess menu, staff, block
"""

import os
import sys
import random
from datetime import datetime, timedelta

try:
    from pymongo import MongoClient
    from pymongo.errors import DuplicateKeyError
except ImportError:
    print("❌ pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/hostel_db")
DB_NAME = "hostel_db"

# ─── Name pools ───────────────────────────────────────────────────────────────
HINDU_NAMES = ["Arjun Sharma", "Vikram Gupta", "Rohit Verma", "Rahul Singh", "Karthik Rajan",
               "Sanjay Nair", "Vivek Mishra", "Amit Patel", "Suresh Kumar", "Deepak Yadav",
               "Ravi Shankar", "Anil Joshi", "Pranav Malhotra", "Nikhil Tiwari", "Harsh Vardhan",
               "Ankur Srivastava", "Gaurav Chaudhary", "Shubham Pandey", "Mayank Agarwal", "Tarun Mehta"]
MUSLIM_NAMES = ["Mohammed Irfan", "Abdul Karim", "Imran Khan", "Faisal Ahmed", "Zubair Sheikh",
                "Tariq Hussain", "Adnan Qureshi", "Salman Ali", "Rizwan Pasha", "Bilal Siddiqui"]
CHRISTIAN_NAMES = ["Alan Matthew", "Chris Thomas", "Daniel Joseph", "Kevin George", "Samuel John",
                   "Andrew Paul", "Robert Louis", "Stephen James", "Michael David", "Brian Philip"]
JAIN_NAMES = ["Ankit Jain", "Rajesh Shah", "Viral Mehta", "Saumil Doshi", "Chirag Parekh"]
JEW_NAMES = ["Aaron Levy", "David Cohen", "Ethan Goldberg", "Nathan Steinberg", "Jacob Rosenberg"]

ALL_NAMES = (
    random.choices(HINDU_NAMES, k=140) +
    random.choices(MUSLIM_NAMES, k=30) +
    random.choices(CHRISTIAN_NAMES, k=20) +
    random.choices(JAIN_NAMES, k=6) +
    random.choices(JEW_NAMES, k=4)
)
random.shuffle(ALL_NAMES)

DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "AIDS", "AIML"]
BED_TYPES = ["2 Bed AC", "2 Bed NAC", "4 Bed AC", "4 Bed NAC", "6 Bed NAC"]
MESS_COMBOS = ["Veg Fusion", "Non-Veg Fusion", "Veg Rassence", "Non-Veg Rassence"]

COMPLAINT_SAMPLES = [
    ("Fan not working in room", "Electrical"),
    ("Water leakage from bathroom ceiling", "Plumbing"),
    ("Internet connection is very slow", "Internet"),
    ("Cockroaches in room", "Pest Control"),
    ("Room not properly cleaned", "Housekeeping"),
    ("Door lock broken", "Civil"),
    ("Room light not working", "Electrical"),
    ("Toilet flush broken", "Plumbing"),
    ("Wall paint peeling off", "Civil"),
    ("Rats in corridor", "Pest Control"),
]

DESTINATIONS = ["Chennai Central", "T Nagar", "Pondy Bazaar", "Guindy", "Home - Tamil Nadu",
                 "Vellore", "Anna Nagar", "Velachery", "Airport", "Bus Terminus"]

MESS_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MEALS = ["Breakfast", "Lunch", "Dinner"]

MESS_MENU_ITEMS = {
    "Breakfast": [["Idli", "Sambar", "Chutney"], ["Dosa", "Sambar", "Coconut Chutney"], ["Pongal", "Gotsu"], ["Oats Porridge", "Banana"]],
    "Lunch":     [["Rice", "Dal", "Rasam", "Papad", "Curd"], ["Rice", "Sambar", "Kootu", "Pickles"], ["Chapati", "Paneer Curry", "Rice", "Dal Fry"]],
    "Dinner":    [["Chapati", "Dal Makhani", "Rice"], ["Parotta", "Salna", "Rice"], ["Fried Rice", "Manchurian", "Soup"]],
}


def seed():
    print(f"\n🌱 SmartHostel AI — Seeder")
    print(f"   Connecting to: {MONGO_URI}")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # ─── Drop & re-create collections ──────────────────────────────────────────
    for col in ["students", "staff", "blocks", "rooms", "complaints", "gatepasses", "attendances", "messmenues", "healthevents", "announcements"]:
        db[col].drop()
    print("   ✓ Cleared old data")

    # ─── Block ──────────────────────────────────────────────────────────────────
    block_doc = {
        "block_name": "A Block", "full_name": "A Block Mens Hostel", "gender": "Male",
        "total_floors": 15, "rooms_per_floor": 60, "total_rooms": 900,
        "available_bed_types": ["2 Bed AC", "2 Bed NAC", "4 Bed AC", "4 Bed NAC", "6 Bed NAC"],
        "facilities": ["Wi-Fi", "24hr Security", "CCTV", "Laundry", "Common Room"],
        "mess_caterers": ["Fusion", "Rassence"], "warden_in_charge": "Prof. Balasubramanian N",
        "is_active": True, "created_at": datetime.utcnow(),
    }
    db["blocks"].insert_one(block_doc)
    db["blocks"].create_index("block_name", unique=True)
    print("   ✓ Block inserted")

    # ─── Staff ──────────────────────────────────────────────────────────────────
    import bcrypt
    def hash_pw(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    try:
        import bcrypt as _b  # noqa
    except ImportError:
        print("   ⚠️  bcrypt not installed — passwords stored as plaintext for demo")
        def hash_pw(pw): return pw

    staff_data = [
        {"name": "Dr. Venkatraman Iyer", "role": "hostel_admin", "staff_role": "Director of Hostels", "is_campus_wide": True, "shift_start": "09:00", "shift_end": "17:00"},
        {"name": "Prof. Balasubramanian N", "role": "warden", "staff_role": "Chief Warden", "is_campus_wide": False, "shift_start": "09:00", "shift_end": "18:00"},
        {"name": "Dr. Karthikeyan Murugesan", "role": "warden", "staff_role": "Deputy Warden", "shift_start": "13:00", "shift_end": "21:00"},
        {"name": "Mr. Srinivasan R", "role": "warden", "staff_role": "Warden", "shift_start": "07:00", "shift_end": "15:00"},
        {"name": "Mr. Ranganathan V", "role": "warden", "staff_role": "Warden", "shift_start": "06:00", "shift_end": "14:00"},
        {"name": "Mr. Ganesan K", "role": "warden", "staff_role": "Warden", "shift_start": "13:00", "shift_end": "21:00"},
        {"name": "Mr. Venkatesh Prabhu", "role": "warden", "staff_role": "Night Warden", "shift_start": "21:00", "shift_end": "06:00"},
        {"name": "Mr. Harish Kalyan", "role": "warden", "staff_role": "Night Warden", "shift_start": "21:00", "shift_end": "06:00"},
        {"name": "Mr. Muthukumar P", "role": "mess_incharge", "staff_role": "Mess Incharge", "shift_start": "06:00", "shift_end": "15:00"},
        {"name": "Mr. Dhanush V", "role": "housekeeping", "staff_role": "Cleaning Incharge", "shift_start": "07:00", "shift_end": "16:00"},
        {"name": "Mr. Prakash Raj", "role": "technician", "staff_role": "Technical Warden", "shift_start": "09:00", "shift_end": "18:00"},
        {"name": "Guard Ramu", "role": "guard", "staff_role": "Security Guard", "shift_start": "18:00", "shift_end": "06:00"},
    ]

    staff_ids = {}
    for i, s in enumerate(staff_data):
        reg = f"{'ADMIN' if s['role'] == 'hostel_admin' else s['role'].upper()[:6]}{i+1:02d}"
        doc = {**s, "register_number": reg, "block_name": "A Block", "gender": "Male",
               "assigned_hostels": ["A Block"], "password": hash_pw(f"{s['role'].capitalize()[:1].upper()}{s['role'][1:]}@123"),
               "is_active": True, "created_at": datetime.utcnow()}
        result = db["staff"].insert_one(doc)
        staff_ids[s["role"]] = result.inserted_id
    print(f"   ✓ {len(staff_data)} staff inserted")

    # ─── Rooms (floors 1-5, 60 rooms each for demo) ────────────────────────────
    room_docs = []
    for floor in range(1, 6):
        for room_num in range(1, 61):
            bed_type = random.choice(BED_TYPES)
            total_beds = int(bed_type.split()[0])
            room_docs.append({
                "block_name": "A Block", "floor_no": floor, "room_number": int(f"{floor}{room_num:02d}"),
                "room_type": bed_type, "total_beds": total_beds,
                "beds": [{"bed_id": chr(65 + i), "is_occupied": False, "student_id": None} for i in range(total_beds)],
                "occupancy_status": "Vacant", "maintenance_flag": random.random() < 0.02,
                "created_at": datetime.utcnow(),
            })
    db["rooms"].insert_many(room_docs)
    db["rooms"].create_index([("block_name", 1), ("floor_no", 1), ("room_number", 1)], unique=True)
    print(f"   ✓ {len(room_docs)} rooms inserted (Floors 1-5)")

    # ─── Students ───────────────────────────────────────────────────────────────
    student_docs = []
    room_cursor = list(db["rooms"].find({"occupancy_status": "Vacant"}, {"_id": 1, "floor_no": 1, "room_number": 1, "beds": 1}).limit(300))
    room_idx = 0

    for i, name in enumerate(ALL_NAMES[:200]):
        yr = str(random.randint(22, 24))
        dept_code = random.choice(["BCE", "BEC", "BME", "BLC", "BAI"])
        reg = f"{yr}{dept_code}{1000 + i + 1}"
        mat = random.choice(MESS_COMBOS)
        bt = random.choice(BED_TYPES)
        floor = random.randint(1, 5)
        room_no = int(f"{floor}{random.randint(1, 60):02d}")

        doc = {
            "name": name, "register_number": reg, "email": f"{reg.lower()}@vitstudent.ac.in",
            "password": hash_pw("Student@123"), "role": "student", "gender": "Male",
            "block_name": "A Block", "floor_no": floor, "room_no": room_no, "bed_id": random.choice(["A", "B"]),
            "bed_type": bt, "mess_information": mat, "department": random.choice(DEPARTMENTS),
            "academic_year": random.randint(1, 4), "phone": f"9{random.randint(100000000, 999999999)}",
            "parent_name": f"Mr. {name.split()[0]} Sr.", "parent_phone": f"9{random.randint(100000000, 999999999)}",
            "device_mac": ":".join([f"{random.randint(0,255):02x}" for _ in range(6)]),
            "is_active": True, "created_at": datetime.utcnow(),
        }
        student_docs.append(doc)

    result = db["students"].insert_many(student_docs)
    student_ids = result.inserted_ids
    db["students"].create_index("register_number", unique=True)
    print(f"   ✓ {len(student_docs)} students inserted")

    # ─── Complaints ──────────────────────────────────────────────────────────────
    complaint_docs = []
    statuses = ["Open", "Assigned", "In Progress", "Resolved", "Resolved", "Resolved"]
    for _ in range(60):
        sid = random.choice(student_ids)
        student = db["students"].find_one({"_id": sid})
        title, category = random.choice(COMPLAINT_SAMPLES)
        severity = random.choice(["Normal", "Normal", "Normal", "Urgent"])
        sla_hrs = 2 if severity == "Urgent" else 24
        raised_at = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        status = random.choice(statuses)
        complaint_docs.append({
            "raised_by": sid, "student_name": student["name"], "register_number": student["register_number"],
            "block_name": "A Block", "floor_no": student["floor_no"], "room_no": student["room_no"],
            "title": title, "description": f"{title} since {random.randint(1, 5)} days. Please fix urgently.",
            "category": category, "severity": severity, "status": status,
            "sla_deadline": raised_at + timedelta(hours=sla_hrs),
            "sla_breached": status not in ["Resolved", "Closed"] and (raised_at + timedelta(hours=sla_hrs)) < datetime.utcnow(),
            "raised_at": raised_at, "is_systemic": False, "photos": [], "createdAt": raised_at,
        })
    db["complaints"].insert_many(complaint_docs)
    print(f"   ✓ {len(complaint_docs)} complaints seeded")

    # ─── Gatepasses ──────────────────────────────────────────────────────────────
    gatepass_docs = []
    gp_statuses = ["Pending", "Approved", "Returned", "Returned", "Rejected"]
    for _ in range(40):
        sid = random.choice(student_ids)
        student = db["students"].find_one({"_id": sid})
        exit_time = datetime.utcnow() - timedelta(hours=random.randint(2, 48))
        return_time = exit_time + timedelta(hours=random.randint(2, 6))
        status = random.choice(gp_statuses)
        gatepass_docs.append({
            "student_id": sid, "student_name": student["name"], "register_number": student["register_number"],
            "block_name": "A Block", "floor_no": student["floor_no"], "room_no": student["room_no"],
            "type": random.choice(["Outing", "Leave"]), "destination": random.choice(DESTINATIONS),
            "reason": "Personal work", "expected_exit": exit_time, "expected_return": return_time,
            "status": status, "applied_at": exit_time - timedelta(hours=1), "is_overdue": False, "late_return_count": 0,
        })
    db["gatepasses"].insert_many(gatepass_docs)
    print(f"   ✓ {len(gatepass_docs)} gatepasses seeded")

    # ─── Attendance (last 7 days) ─────────────────────────────────────────────
    att_docs = []
    for i in range(7):
        date_str = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        sample = random.sample(list(student_ids), min(150, len(student_ids)))
        for sid in sample:
            student = db["students"].find_one({"_id": sid})
            att_docs.append({
                "student_id": sid, "student_name": student["name"], "register_number": student["register_number"],
                "block_name": "A Block", "floor_no": student.get("floor_no", 1), "room_no": student.get("room_no", 101),
                "date": date_str, "status": "Present" if random.random() > 0.12 else "Absent",
                "method": random.choice(["wifi", "qr"]), "wifi_detected_at": datetime.utcnow() - timedelta(days=i),
                "created_at": datetime.utcnow(),
            })
    try:
        db["attendances"].insert_many(att_docs, ordered=False)
    except Exception:
        pass
    print(f"   ✓ {len(att_docs)} attendance records seeded (7 days)")

    # ─── Mess Menu ────────────────────────────────────────────────────────────
    menu_docs = []
    for day in MESS_DAYS:
        for meal in MEALS:
            items = random.choice(MESS_MENU_ITEMS[meal])
            menu_docs.append({
                "block_name": "A Block", "day": day, "meal": meal,
                "type": random.choice(["Veg", "Non-Veg"]),
                "caterer": random.choice(["Fusion", "Rassence"]),
                "items": [{"name": it, "calories": random.randint(80, 400)} for it in items],
                "updated_by": None, "createdAt": datetime.utcnow(),
            })
    db["messmenues"].insert_many(menu_docs)
    print(f"   ✓ {len(menu_docs)} mess menu items seeded (7 days × 3 meals)")

    # ─── Announcements ────────────────────────────────────────────────────────
    db["announcements"].insert_many([
        {"title": "WiFi Maintenance Tonight", "content": "WiFi will be down from 11 PM to 1 AM tonight for maintenance. Plan accordingly.", "priority": "High", "target_roles": [], "target_blocks": ["A Block"], "is_active": True, "createdAt": datetime.utcnow()},
        {"title": "Mess Timings for Exams Week", "content": "During exam week (April 10-15), dinner will be served until 10 PM. Night mess available until midnight.", "priority": "Medium", "target_roles": [], "target_blocks": [], "is_active": True, "createdAt": datetime.utcnow()},
        {"title": "Gatepass Submission Deadline", "content": "All gatepass applications for the weekend must be submitted by Friday 6 PM.", "priority": "Medium", "target_roles": ["student"], "target_blocks": [], "is_active": True, "createdAt": datetime.utcnow()},
    ])
    print("   ✓ 3 announcements seeded")

    # ─── Summary ─────────────────────────────────────────────────────────────
    print(f"\n✅ Seeding complete!")
    print(f"   Database: {DB_NAME} @ {MONGO_URI}")
    print(f"   Collections:")
    for col in db.list_collection_names():
        count = db[col].count_documents({})
        print(f"     {col}: {count} documents")
    print(f"\n   Demo Login Credentials:")
    print(f"     Student:  23BCE1001 / Student@123")
    print(f"     Warden:   WARDN02   / Warden@123")
    print(f"     Admin:    HOSTEL01  / Hostel_admin@123")
    print(f"     Guard:    GUARD12   / Guard@123")

    client.close()


if __name__ == "__main__":
    try:
        import bcrypt
    except ImportError:
        print("⚠️  Installing bcrypt for password hashing...")
        os.system("pip install bcrypt")
        import bcrypt
    seed()

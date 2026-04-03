import random
import string
from datetime import datetime
from pymongo import MongoClient, ASCENDING

# ════════════════════════════════════════════════
#  🔧 CONFIGURE THIS BEFORE RUNNING
# ════════════════════════════════════════════════
# Replace 'xxxxx' with your real cluster ID from Atlas!
MONGO_URI = "mongodb+srv://mayankthakur827_db_user:M%40y%40nk310805@hostel-cluster.at0ov7b.mongodb.net/?appName=hostel-cluster"
DB_NAME   = "hostel_db"
# ════════════════════════════════════════════════

MESS_TYPES = ["Veg", "Non-Veg", "Special", "Foodpark"]
CATERERS = ["Fusion", "Rassence"]

def get_room_config(room_in_floor):
    if 1 <= room_in_floor <= 15:   return {"type": "NAC", "size": 3, "label": "3 Bed NAC"}
    if 16 <= room_in_floor <= 30:  return {"type": "NAC", "size": 4, "label": "4 Bed NAC"}
    if 31 <= room_in_floor <= 40:  return {"type": "AC",  "size": 2, "label": "2 Bed AC"}
    if 41 <= room_in_floor <= 45:  return {"type": "AC",  "size": 3, "label": "3 Bed AC"}
    if 46 <= room_in_floor <= 50:  return {"type": "AC",  "size": 4, "label": "4 Bed AC"}
    return None

def gen_phone(): return f"+91-{random.randint(6000000000, 9999999999)}"
def gen_pass(): return ''.join(random.choices(string.ascii_letters + string.digits, k=10))

NAMES = ["Aarav Sharma", "Vivaan Patel", "Aditya Kumar", "Mohammed Arif", "Abdul Raheem", 
         "Aaron Thomas", "Kevin Joseph", "Parth Shah", "David Solomon", "Rohan Mehta"]

PARENT_NAMES = ["Rajesh", "Suresh", "Ramesh", "Vikram", "Anil", "Sunil", "Manoj"]

def main():
    print("=" * 60)
    print("   SMART HOSTEL — FULL PROFILE SEEDER")
    print("=" * 60)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    rooms_to_insert = []
    students_to_insert = []
    used_reg = set()

    print("[1/3] Generating 15 floors with full contact/mess details...")

    for floor in range(1, 16):
        for r_idx in range(1, 51):
            config = get_room_config(r_idx)
            room_no = (floor * 100) + r_idx
            residents_in_room = []
            
            # Bed labels (A, B, C, D)
            bed_labels = ["Bed A", "Bed B", "Bed C", "Bed D"]

            for i in range(config["size"]):
                if random.random() < 0.70: # 30% Vacancy
                    reg = f"{random.choice(['23','24','25'])}BEC{random.randint(1000, 9999)}"
                    while reg in used_reg: reg = f"{random.choice(['23','24','25'])}BEC{random.randint(1000, 9999)}"
                    used_reg.add(reg)
                    
                    name = random.choice(NAMES)
                    p_name = f"{random.choice(PARENT_NAMES)} {name.split()[-1]}"
                    
                    student = {
                        "name": name,
                        "register_number": reg,
                        "password": gen_pass(),
                        "block_name": "A Block",
                        "floor": f"Floor {floor}",
                        "room_no": room_no,
                        "bed": bed_labels[i],
                        "bed_type": config["label"],
                        "mess": f"{random.choice(MESS_TYPES)} {random.choice(CATERERS)}",
                        "phone": gen_phone(),
                        "email": f"{name.lower().replace(' ', '.')}@vit.ac.in",
                        "gender": "Male",
                        "parent_name": p_name,
                        "parent_phone": gen_phone(),
                        "parent_email": f"{p_name.lower().replace(' ', '.')}@gmail.com",
                        "created_at": datetime.utcnow()
                    }
                    students_to_insert.append(student)
                    residents_in_room.append(reg)

            rooms_to_insert.append({
                "room_no": room_no,
                "floor": floor,
                "type": config["type"],
                "size": config["size"],
                "occupied": len(residents_in_room),
                "residents": residents_in_room,
                "block_name": "A Block"
            })

    print("[2/3] Cleaning and Uploading...")
    db["rooms"].delete_many({})
    db["students"].delete_many({})
    db["rooms"].insert_many(rooms_to_insert)
    db["students"].insert_many(students_to_insert)

    print("[3/3] Creating Indexes...")
    db["students"].create_index([("register_number", ASCENDING)], unique=True)
    
    print(f"\n✅ SUCCESS: {len(students_to_insert)} students seeded with full profile data.")
    client.close()

if __name__ == "__main__":
    main()





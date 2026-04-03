from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import random

app = Flask(__name__)
CORS(app)

# ─── NLP Complaint Classifier ─────────────────────────────────────────────────

CATEGORY_KEYWORDS = {
    'Electrical': {
        'keywords': ['electric', 'switch', 'fan', 'light', 'bulb', 'wire', 'plug', 'socket', 'power', 'current', 'short circuit', 'tripped', 'fuse', 'mcb', 'tube light', 'wiring'],
        'urgency_base': 0.7,
    },
    'Plumbing': {
        'keywords': ['water', 'pipe', 'leak', 'drain', 'tap', 'flush', 'toilet', 'plumb', 'overflow', 'blockage', 'sewage', 'bathroom', 'wet', 'dripping', 'no water'],
        'urgency_base': 0.85,
    },
    'Civil': {
        'keywords': ['wall', 'ceiling', 'floor', 'crack', 'door', 'window', 'lock', 'paint', 'broken', 'seepage', 'plaster', 'tile', 'damp', 'mold', 'mould'],
        'urgency_base': 0.4,
    },
    'Housekeeping': {
        'keywords': ['clean', 'dirt', 'waste', 'garbage', 'sweep', 'mop', 'dust', 'dirty', 'smell', 'odour', 'cockroach room', 'uncleaned', 'hygiene'],
        'urgency_base': 0.35,
    },
    'Pest Control': {
        'keywords': ['pest', 'cockroach', 'rat', 'mice', 'mosquito', 'insect', 'bug', 'lizard', 'ants', 'termite', 'spider', 'rodent', 'infestation'],
        'urgency_base': 0.65,
    },
    'Internet': {
        'keywords': ['wifi', 'internet', 'router', 'network', 'connection', 'slow', 'no wifi', 'disconnected', 'bandwidth', 'lan', 'ethernet'],
        'urgency_base': 0.5,
    },
}

URGENT_MODIFIERS = ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'severe', 'serious', 'help', 'flood', 'fire', 'not working since', 'days']

def classify_complaint(description: str):
    text = description.lower()
    
    scores = {}
    for category, data in CATEGORY_KEYWORDS.items():
        matched = [kw for kw in data['keywords'] if kw in text]
        if matched:
            score = len(matched) / max(len(data['keywords']), 1)
            scores[category] = {'score': score, 'matched': matched, 'urgency_base': data['urgency_base']}
    
    if not scores:
        return {'category': 'Other', 'confidence': 0.5, 'urgency_score': 0.3, 'matched_keywords': []}
    
    best = max(scores, key=lambda c: scores[c]['score'])
    data = scores[best]
    
    # Urgency modifier
    urgent_matches = [um for um in URGENT_MODIFIERS if um in text]
    urgency_boost = min(len(urgent_matches) * 0.1, 0.3)
    urgency_score = min(data['urgency_base'] + urgency_boost, 1.0)
    
    # Confidence is based on match density
    confidence = min(0.5 + data['score'] * 2, 0.98)
    
    return {
        'category': best,
        'confidence': round(confidence, 2),
        'urgency_score': round(urgency_score, 2),
        'matched_keywords': data['matched'],
        'all_scores': {k: round(v['score'], 2) for k, v in scores.items()},
    }


# ─── Attendance Anomaly Detection ─────────────────────────────────────────────

def detect_anomaly(attendance_history: list):
    """
    attendance_history: list of {'date': 'YYYY-MM-DD', 'status': 'Present'|'Absent'}
    Returns anomaly score and flags
    """
    if not attendance_history:
        return {'anomaly_score': 0, 'consecutive_absences': 0, 'flags': []}
    
    consecutive = 0
    max_consecutive = 0
    current_run = 0
    flags = []
    
    for record in sorted(attendance_history, key=lambda r: r['date'], reverse=True):
        if record['status'] == 'Absent':
            current_run += 1
            max_consecutive = max(max_consecutive, current_run)
        else:
            current_run = 0
    
    consecutive = current_run  # from most recent going backward
    
    total = len(attendance_history)
    absent_count = sum(1 for r in attendance_history if r['status'] == 'Absent')
    absence_rate = absent_count / max(total, 1)
    
    if consecutive >= 3:
        flags.append(f'CONSECUTIVE_ABSENCES: {consecutive} nights')
    if absence_rate > 0.5:
        flags.append(f'HIGH_ABSENCE_RATE: {round(absence_rate * 100)}%')
    
    anomaly_score = min((consecutive * 0.2) + (absence_rate * 0.5), 1.0)
    
    return {
        'anomaly_score': round(anomaly_score, 2),
        'consecutive_absences': consecutive,
        'absence_rate': round(absence_rate, 2),
        'flags': flags,
        'alert_required': consecutive >= 3,
    }


# ─── Mess Crowd Predictor ──────────────────────────────────────────────────────

CROWD_SCHEDULE = {
    (7, 9): {'meal': 'Breakfast', 'level': 'High', 'percent': 65},
    (9, 12): {'meal': 'Post-Breakfast', 'level': 'Low', 'percent': 10},
    (12, 13): {'meal': 'Lunch Peak', 'level': 'Very High', 'percent': 90},
    (13, 14): {'meal': 'Lunch', 'level': 'High', 'percent': 70},
    (14, 19): {'meal': 'Off Peak', 'level': 'Low', 'percent': 15},
    (19, 20): {'meal': 'Dinner', 'level': 'High', 'percent': 75},
    (20, 21): {'meal': 'Dinner Peak', 'level': 'Very High', 'percent': 85},
    (21, 24): {'meal': 'Night Mess', 'level': 'Low', 'percent': 20},
}

def predict_crowd(hour: int, day_of_week: str = ''):
    schedule = {'meal': 'Off Peak', 'level': 'Low', 'percent': 10}
    for (start, end), data in CROWD_SCHEDULE.items():
        if start <= hour < end:
            schedule = data
            break
    
    # Weekend boost
    if day_of_week in ('Saturday', 'Sunday'):
        schedule['percent'] = min(schedule['percent'] + 10, 100)
    
    # Add slight random variation (+/- 5%)
    variation = random.randint(-5, 5)
    schedule['percent'] = max(0, min(100, schedule['percent'] + variation))
    
    return {
        'hour': hour,
        'day': day_of_week,
        'meal': schedule['meal'],
        'crowd_level': schedule['level'],
        'estimated_fill_percent': schedule['percent'],
        'recommendation': 'Recommended to visit now' if schedule['percent'] < 40 else ('Peak hours — expect a queue' if schedule['percent'] > 70 else 'Moderate crowd'),
    }


# ─── Flask Routes ─────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'SmartHostel AI', 'version': '1.0'})

@app.route('/classify-complaint', methods=['POST'])
def classify_complaint_route():
    data = request.get_json()
    if not data or 'description' not in data:
        return jsonify({'error': 'description is required'}), 400
    result = classify_complaint(data['description'])
    return jsonify(result)

@app.route('/detect-anomaly', methods=['POST'])
def detect_anomaly_route():
    data = request.get_json()
    if not data or 'attendance_history' not in data:
        return jsonify({'error': 'attendance_history is required'}), 400
    result = detect_anomaly(data['attendance_history'])
    return jsonify(result)

@app.route('/predict-crowd', methods=['POST'])
def predict_crowd_route():
    data = request.get_json()
    hour = data.get('hour', 12)
    day = data.get('day', '')
    result = predict_crowd(hour, day)
    return jsonify(result)

@app.route('/face/verify', methods=['POST'])
def face_verify():
    """Demo stub — returns realistic mock confidence scores"""
    data = request.get_json()
    known_ids = data.get('known_student_ids', [])
    probe_id = data.get('probe_id', '')
    
    if probe_id in known_ids:
        # Known face: high confidence
        confidence = round(random.uniform(0.87, 0.98), 2)
        result = 'ACCEPT'
    else:
        # Unknown face: low confidence
        confidence = round(random.uniform(0.28, 0.62), 2)
        result = 'REJECT' if confidence < 0.70 else 'MANUAL_REVIEW'
    
    return jsonify({
        'confidence': confidence,
        'result': result,
        'threshold_auto_accept': 0.95,
        'threshold_manual_review': 0.70,
        'face_match': confidence >= 0.95,
        'requires_manual_check': 0.70 <= confidence < 0.95,
    })

@app.route('/face/enroll', methods=['POST'])
def face_enroll():
    """Mock enrollment — in production would generate FaceNet embeddings"""
    data = request.get_json()
    student_id = data.get('student_id')
    return jsonify({
        'success': True,
        'student_id': student_id,
        'embeddings_generated': 128,
        'message': 'Face profile enrolled successfully',
    })


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5001))
    print(f'\n🧠 SmartHostel AI Service running on port {port}')
    app.run(host='0.0.0.0', port=port, debug=True)

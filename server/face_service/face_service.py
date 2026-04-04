"""
Face Detection Microservice
Uses OpenCV Haar cascade for face detection + frame-differencing for liveness.

Install deps:
    pip install flask flask-cors opencv-python

Run:
    python face_service.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64

app = Flask(__name__)
CORS(app, origins='*')

# Haar cascade ships with OpenCV — no model files to download
CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

if face_cascade.empty():
    raise RuntimeError(f'Could not load Haar cascade from {CASCADE_PATH}')

print(f'✅ Haar cascade loaded from {CASCADE_PATH}')


def decode_frame(b64_str: str):
    """Decode a base64 JPEG/PNG (with or without data-URL prefix) to a BGR numpy array."""
    if not b64_str:
        return None
    if ',' in b64_str:
        b64_str = b64_str.split(',', 1)[1]
    try:
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception:
        return None


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'face-detection-cv'})


@app.route('/detect', methods=['POST'])
def detect():
    """
    POST body (JSON):
      frame      : base64-encoded JPEG of the current camera frame  (required)
      prev_frame : base64-encoded JPEG of the previous frame        (optional, for liveness)

    Response JSON:
      face_detected  : bool
      face_count     : int
      face_area      : float  (fraction of frame covered by the largest face box)
      motion_score   : float  (0 = no motion, higher = more motion)
      is_live        : bool   (face detected AND motion detected)
    """
    data = request.get_json(force=True, silent=True) or {}

    frame = decode_frame(data.get('frame', ''))
    if frame is None:
        return jsonify({'ok': False, 'error': 'Invalid or missing frame'}), 400

    # Preprocessing for better detection in varied lighting
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=4,
        minSize=(50, 50),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )

    face_detected = len(faces) > 0
    face_area = 0.0
    if face_detected:
        x, y, w, h = faces[0]
        face_area = float(w * h) / float(frame.shape[0] * frame.shape[1])

    # ── Liveness: per-pixel motion between frames ─────────────────────────────
    motion_score = 0.0
    is_live = False

    prev_frame_b64 = data.get('prev_frame', '')
    if prev_frame_b64:
        prev = decode_frame(prev_frame_b64)
        if prev is not None:
            # Resize both to a small canvas for speed
            curr_small = cv2.resize(frame, (160, 120))
            prev_small = cv2.resize(prev, (160, 120))

            diff = cv2.absdiff(curr_small, prev_small)
            motion_score = float(cv2.mean(diff)[0])   # 0–255 range

            # Thresholds: a printed photo scores ~0, a live face scores > 1.5
            is_live = face_detected and motion_score > 1.5 and face_area > 0.03

    return jsonify({
        'face_detected': face_detected,
        'face_count': int(len(faces)),
        'face_area': round(face_area, 4),
        'motion_score': round(motion_score, 3),
        'is_live': is_live,
    })


if __name__ == '__main__':
    print('🔍 Face Detection Service starting on http://0.0.0.0:6001')
    app.run(host='0.0.0.0', port=6001, debug=False, threaded=True)

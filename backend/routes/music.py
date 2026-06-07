import os
import json
import uuid
from flask import Blueprint, request, jsonify, send_from_directory
from backend.config import MUSIC_DIR, PLAYLIST_FILE, DEFAULT_PLAYLIST

music_bp = Blueprint('music', __name__)

def load_playlist():
    if not os.path.exists(PLAYLIST_FILE):
        with open(PLAYLIST_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_PLAYLIST, f, ensure_ascii=False, indent=2)
        return DEFAULT_PLAYLIST.copy()
    with open(PLAYLIST_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_playlist(data):
    with open(PLAYLIST_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@music_bp.route('/get_data')
def get_data():
    return jsonify(load_playlist())

@music_bp.route('/save_data', methods=['POST'])
def save_data():
    data = request.get_json()
    if data is not None:
        save_playlist(data)
        return jsonify({"status": "ok"})
    return jsonify({"error": "No data"}), 400

@music_bp.route('/upload', methods=['POST'])
def upload():
    uploaded = []
    for file in request.files.getlist('files'):
        if file.filename.lower().endswith('.mp3'):
            file.save(os.path.join(MUSIC_DIR, os.path.basename(file.filename)))
            uploaded.append(os.path.basename(file.filename))
    return jsonify({'files': uploaded})

@music_bp.route('/music/<path:filename>')
def serve_music(filename):
    return send_from_directory(MUSIC_DIR, filename, conditional=True)
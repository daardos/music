from flask import Blueprint, request, jsonify
from backend.services.notes_service import get_notes, save_notes

notes_bp = Blueprint('notes', __name__)

@notes_bp.route('/get_notes')
def get_notes_route():
    return jsonify({'content': get_notes()})

@notes_bp.route('/save_notes', methods=['POST'])
def save_notes_route():
    content = request.json.get('content', '')
    save_notes(content)
    return jsonify({'status': 'ok'})
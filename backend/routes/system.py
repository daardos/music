from flask import Blueprint, request, jsonify
from backend.services.system_service import (
    set_windows_theme,
    reset_theme_to_default,
    launch_application,
    load_presets,
    run_preset
)

system_bp = Blueprint('system', __name__)

@system_bp.route('/set_theme', methods=['POST'])
def set_theme():
    mode = request.json.get('mode', 'dark')
    success, message = set_windows_theme(mode)
    return jsonify({'success': success, 'message': message})

@system_bp.route('/reset_theme', methods=['POST'])
def reset_theme():
    success, message = reset_theme_to_default()
    return jsonify({'success': success, 'message': message})

@system_bp.route('/launch_app', methods=['POST'])
def launch_app():
    app_id = request.json.get('app_id')
    success, message = launch_application(app_id)
    if not success:
        return jsonify({'success': False, 'message': message}), 400
    return jsonify({'success': True, 'message': message})

@system_bp.route('/get_presets', methods=['GET'])
def get_presets():
    presets = load_presets()
    return jsonify({'presets': [{'name': p['name']} for p in presets]})

@system_bp.route('/run_preset', methods=['POST'])
def run_preset_route():
    preset_name = request.json.get('preset')
    if not preset_name:
        return jsonify({'success': False, 'message': 'Не указан пресет'}), 400
    success, message = run_preset(preset_name)
    return jsonify({'success': success, 'message': message})
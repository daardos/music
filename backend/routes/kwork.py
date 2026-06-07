import os
import webbrowser
from flask import Blueprint, request, jsonify
from backend.config import KWORK_CREDS_FILE
from backend.services.kwork_service import (
    load_credentials,
    save_credentials,
    load_config,
    save_config,
    kwork_orders,
    kwork_lock,
    parse_kwork,
    filter_by_keywords,
    save_orders_to_file
)

kwork_bp = Blueprint('kwork', __name__)

@kwork_bp.route('/get_kwork')
def get_kwork():
    with kwork_lock:
        orders = kwork_orders.copy()
    return jsonify(orders)

@kwork_bp.route('/get_kwork_creds')
def get_kwork_creds():
    username, password = load_credentials()
    return jsonify({
        'username': username or '',
        'has_password': bool(password)
    })

@kwork_bp.route('/set_kwork_creds', methods=['POST'])
def set_kwork_creds():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if not username or not password:
        if os.path.exists(KWORK_CREDS_FILE):
            os.remove(KWORK_CREDS_FILE)
        with kwork_lock:
            kwork_orders.clear()
        return jsonify({'success': True, 'message': 'Данные удалены'})
    save_credentials(username, password)
    with kwork_lock:
        kwork_orders.clear()
    return jsonify({'success': True, 'message': 'Сохранено'})

@kwork_bp.route('/get_kwork_config')
def get_kwork_config():
    config = load_config()
    return jsonify(config)

@kwork_bp.route('/save_kwork_config', methods=['POST'])
def save_kwork_config():
    config = request.get_json()
    if not config or 'keywords' not in config:
        return jsonify({'success': False, 'message': 'Неверные данные'}), 400
    save_config(config)
    # Сразу перефильтровать текущие заказы
    with kwork_lock:
        kwork_orders = filter_by_keywords(kwork_orders, config['keywords'])
    return jsonify({'success': True, 'message': 'Настройки сохранены'})

@kwork_bp.route('/force_update', methods=['POST'])
def force_update():
    orders = parse_kwork()
    config = load_config()
    keywords = config.get('keywords', [])
    filtered = filter_by_keywords(orders, keywords)
    with kwork_lock:
        kwork_orders.clear()
        kwork_orders.extend(filtered)
    save_orders_to_file(filtered)
    return jsonify({'success': True, 'message': f'Обновлено, найдено {len(filtered)} заказов'})

@kwork_bp.route('/open_link', methods=['POST'])
def open_link():
    url = request.json.get('url')
    if not url:
        return jsonify({'success': False, 'message': 'Нет ссылки'}), 400
    webbrowser.open(url)
    return jsonify({'success': True})
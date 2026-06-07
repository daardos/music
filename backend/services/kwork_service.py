import requests
from bs4 import BeautifulSoup
import threading
import time
import json
import os
from backend.config import KWORK_INTERVAL, KWORK_CREDS_FILE, DATA_DIR

KWORK_CONFIG_FILE = os.path.join(DATA_DIR, 'kwork_config.json')
KWORK_ORDERS_FILE = os.path.join(DATA_DIR, 'kwork_orders.json')

kwork_orders = []
kwork_lock = threading.Lock()

# ---------- Работа с учётными данными ----------
def load_credentials():
    if not os.path.exists(KWORK_CREDS_FILE):
        return None, None
    with open(KWORK_CREDS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('username'), data.get('password')

def save_credentials(username, password):
    with open(KWORK_CREDS_FILE, 'w', encoding='utf-8') as f:
        json.dump({'username': username, 'password': password}, f, ensure_ascii=False)

# ---------- Работа с конфигом ----------
def load_config():
    """Загружает конфигурацию (ключевые слова и категории)."""
    if not os.path.exists(KWORK_CONFIG_FILE):
        default_config = {
            "keywords": ["верстка", "html", "css", "python"],
            "categories": [
                "https://kwork.ru/projects?c=1",   # Разработка сайтов
                "https://kwork.ru/projects?c=5"    # Дизайн
            ]
        }
        with open(KWORK_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, ensure_ascii=False, indent=2)
        return default_config
    with open(KWORK_CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(config):
    with open(KWORK_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

# ---------- Фильтрация ----------
def filter_by_keywords(orders, keywords):
    if not keywords:
        return orders
    filtered = []
    for order in orders:
        text = (order.get('title', '') + ' ' + order.get('description', '')).lower()
        if any(kw.lower() in text for kw in keywords):
            filtered.append(order)
    return filtered

# ---------- Парсинг одной страницы ----------
def parse_projects_page(session, url):
    """Извлекает заказы с одной страницы категории (или общей ленты)."""
    items = []
    try:
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, 'html.parser')
        # Селекторы под актуальную вёрстку Kwork (могут меняться, при необходимости корректируйте)
        for card in soup.select('.project-card, .card__project, .projects-list__item, .want-card'):
            title_el = card.select_one('.project-title, .project-card__title a, .want-title a')
            title = title_el.text.strip() if title_el else 'Без названия'

            link_el = card.select_one('a[href^="/projects/"]') or card.select_one('a[href^="/wants/"]')
            link = 'https://kwork.ru' + link_el['href'] if link_el else '#'

            budget_el = card.select_one('.project-price, .price, .wants-card__price, .want-price')
            budget = budget_el.text.strip() if budget_el else 'Не указан'

            desc_el = card.select_one('.project-description, .project-card__description, .want-description')
            description = desc_el.text.strip()[:300] + '...' if desc_el else ''

            items.append({
                'title': title,
                'description': description,
                'link': link,
                'budget': budget
            })
    except Exception as e:
        # Логирование можно добавить при необходимости
        pass
    return items

# ---------- Основной цикл парсинга ----------
def parse_kwork():
    username, password = load_credentials()
    if not username or not password:
        return []

    session = requests.Session()
    # Авторизация
    login_url = 'https://kwork.ru/login'
    try:
        resp = session.get(login_url, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        csrf_tag = soup.find('meta', {'name': 'csrf-token'})
        csrf_token = csrf_tag['content'] if csrf_tag else ''
    except Exception:
        return []

    login_data = {
        'login[username]': username,
        'login[password]': password,
    }
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf_token,
        'Referer': login_url,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        auth_resp = session.post(login_url, data=login_data, headers=headers, timeout=10)
        if auth_resp.status_code != 200 or 'logout' not in auth_resp.text.lower():
            return []
    except Exception:
        return []

    # Загружаем конфиг, получаем список категорий
    config = load_config()
    categories = config.get('categories', [])
    if not categories:
        # Если категорий нет, парсим общую ленту
        categories = ['https://kwork.ru/projects']

    all_orders = []
    for cat_url in categories:
        orders = parse_projects_page(session, cat_url)
        all_orders.extend(orders)
        time.sleep(1)  # небольшая пауза между категориями, чтобы не нагружать сервер

    return all_orders

def save_orders_to_file(orders):
    with open(KWORK_ORDERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)

def background_kwork_worker():
    global kwork_orders
    while True:
        orders = parse_kwork()
        if orders:
            config = load_config()
            keywords = config.get('keywords', [])
            filtered = filter_by_keywords(orders, keywords)
            with kwork_lock:
                kwork_orders = filtered
            save_orders_to_file(filtered)
        time.sleep(KWORK_INTERVAL)

def start_kwork_thread():
    t = threading.Thread(target=background_kwork_worker, daemon=True)
    t.start()
import sys
import os
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.config import FIXED_PORT
import threading
import time
import socket
import traceback
from flask import Flask, send_from_directory
import webview
from backend.config import BASE_DIR, PORT_FILE
from backend.services.kwork_service import start_kwork_thread
from backend.routes.music import music_bp
from backend.routes.kwork import kwork_bp
from backend.routes.system import system_bp   # <-- важно!

ERRORS_LOG = os.path.join(BASE_DIR, 'errors.txt')

def log_error(message):
    with open(ERRORS_LOG, 'a', encoding='utf-8') as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {message}\n")

def create_app():
    app = Flask(__name__, static_folder=None)
    app.register_blueprint(music_bp)
    app.register_blueprint(kwork_bp)
    app.register_blueprint(system_bp)   # <-- регистрация системных маршрутов

    @app.route('/')
    def index():
        return send_from_directory(os.path.join(BASE_DIR, 'frontend'), 'index.html')

    @app.route('/<path:filename>')
    def static_files(filename):
        return send_from_directory(os.path.join(BASE_DIR, 'frontend'), filename)

    @app.route('/shutdown')
    def shutdown():
        os._exit(0)

    return app

def start_flask(app):
    try:
        # Пытаемся занять фиксированный порт
        port = FIXED_PORT
        # Сохраняем порт в файл (для информации и совместимости)
        with open(PORT_FILE, 'w') as f:
            f.write(str(port))
        app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
    except Exception as e:
        log_error(f"Flask start error:\n{traceback.format_exc()}")
        sys.exit(1)

def on_closing():
    os._exit(0)

if __name__ == '__main__':
    try:
        app = create_app()
        start_kwork_thread()

        flask_thread = threading.Thread(target=start_flask, args=(app,), daemon=True)
        flask_thread.start()
        time.sleep(0.5)

        port = FIXED_PORT

        try:
            window = webview.create_window(
                title='Админ-панель',
                url=f'http://127.0.0.1:{port}/',
                width=600,
                height=800,
                resizable=True,
                easy_drag=False,
                on_top=True,
                hidden=False
            )
            window.events.closing += on_closing
            webview.start()
        except Exception as e:
            log_error(f"Pywebview window error:\n{traceback.format_exc()}")
    except Exception as e:
        log_error(f"Server startup error:\n{traceback.format_exc()}")
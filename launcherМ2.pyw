import subprocess
import sys
import os
import time
import socket
import keyboard

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_SCRIPT = os.path.join(BASE_DIR, 'backend', 'server.py')
FIXED_PORT = 8765

def is_player_running():
    """Проверяет, открыт ли фиксированный порт."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', FIXED_PORT)) == 0

def launch_player():
    subprocess.Popen([sys.executable, SERVER_SCRIPT], creationflags=subprocess.CREATE_NO_WINDOW)

def close_player():
    try:
        import urllib.request
        urllib.request.urlopen(f'http://127.0.0.1:{FIXED_PORT}/shutdown', timeout=0.5)
    except:
        pass
    time.sleep(0.5)
    if is_player_running():
        subprocess.call(['taskkill', '/F', '/IM', 'python.exe'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def toggle():
    if is_player_running():
        close_player()
    else:
        launch_player()

if __name__ == '__main__':
    keyboard.add_hotkey('alt+m', toggle)
    keyboard.wait()
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC_DIR = os.path.join(BASE_DIR, 'music')
DATA_DIR = os.path.join(BASE_DIR, 'data')
PLAYLIST_FILE = os.path.join(DATA_DIR, 'playlist.json')
NOTES_FILE = os.path.join(DATA_DIR, 'notes.txt')
KWORK_CREDS_FILE = os.path.join(DATA_DIR, 'kwork_creds.json')
PORT_FILE = os.path.join(BASE_DIR, 'port.txt')
ERRORS_LOG = os.path.join(BASE_DIR, 'errors.txt')

KWORK_INTERVAL = 600

# Фиксированный порт, чтобы не терялись данные IndexedDB/localStorage
FIXED_PORT = 8765

os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_PLAYLIST = {
    "tabs": [{"id": "tab1", "name": "Музыка", "tracks": []}],
    "active_tab_index": 0
}

LAUNCH_APPS = {
    'vscode': r'C:\Users\DnsUSer\AppData\Local\Programs\Microsoft VS Code\Code.exe',
    'browser': r'C:\Program Files\Yandex\YandexBrowser\Application\browser.exe',
    'docker': r'C:\Program Files\Docker\Docker\Docker Desktop.exe',
    'terminal': 'cmd.exe'
}
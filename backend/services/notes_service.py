import os
from backend.config import NOTES_FILE

def get_notes():
    if os.path.exists(NOTES_FILE):
        with open(NOTES_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    return ''

def save_notes(content):
    with open(NOTES_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
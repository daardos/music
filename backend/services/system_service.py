import sys
import os
import json
import subprocess
import winreg
from backend.config import DATA_DIR, LAUNCH_APPS

PRESETS_FILE = os.path.join(DATA_DIR, 'presets.json')
THEME_BACKUP_FILE = os.path.join(DATA_DIR, 'original_theme.json')

def _get_registry_values():
    """Возвращает текущие значения ColorPrevalence и AccentColor из реестра."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                             r'Software\Microsoft\Windows\DWM',
                             0, winreg.KEY_READ)
        prevalence, _ = winreg.QueryValueEx(key, 'ColorPrevalence')
        accent, _ = winreg.QueryValueEx(key, 'AccentColor')
        winreg.CloseKey(key)
        return prevalence, accent
    except:
        return None, None

def _save_original_theme():
    """Сохраняет текущие параметры темы, если файл еще не существует."""
    if os.path.exists(THEME_BACKUP_FILE):
        return
    prevalence, accent = _get_registry_values()
    if prevalence is not None and accent is not None:
        with open(THEME_BACKUP_FILE, 'w') as f:
            json.dump({'ColorPrevalence': prevalence, 'AccentColor': accent}, f)

def set_windows_theme(mode):
    """Устанавливает тему (dark, light, teal). Возвращает (success, message)."""
    if sys.platform != 'win32':
        return False, "Только Windows"
    try:
        # Перед первой сменой сохраняем исходные параметры
        _save_original_theme()

        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                             r'Software\Microsoft\Windows\DWM',
                             0, winreg.KEY_SET_VALUE)
        if mode == 'dark':
            winreg.SetValueEx(key, 'ColorPrevalence', 0, winreg.REG_DWORD, 0)
            winreg.SetValueEx(key, 'AccentColor', 0, winreg.REG_DWORD, 0x00000000)
        elif mode == 'light':
            winreg.SetValueEx(key, 'ColorPrevalence', 0, winreg.REG_DWORD, 1)
            winreg.SetValueEx(key, 'AccentColor', 0, winreg.REG_DWORD, 0xFFFFFFFF)
        elif mode == 'teal':
            winreg.SetValueEx(key, 'ColorPrevalence', 0, winreg.REG_DWORD, 1)
            winreg.SetValueEx(key, 'AccentColor', 0, winreg.REG_DWORD, 0x00D4BC00)  # #00bcd4 в BGR
        winreg.CloseKey(key)

        # Применяем изменения без перезагрузки
        subprocess.run('RUNDLL32.EXE USER32.DLL,UpdatePerUserSystemParameters 1, True', shell=True)
        return True, f'Тема "{mode}" применена'
    except Exception as e:
        return False, str(e)

def reset_theme_to_default():
    """Восстанавливает тему из сохранённого файла original_theme.json, затем удаляет его."""
    if not os.path.exists(THEME_BACKUP_FILE):
        return False, "Нет сохранённых исходных настроек (тема ещё не менялась)."
    try:
        with open(THEME_BACKUP_FILE, 'r') as f:
            original = json.load(f)
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                             r'Software\Microsoft\Windows\DWM',
                             0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, 'ColorPrevalence', 0, winreg.REG_DWORD, original['ColorPrevalence'])
        winreg.SetValueEx(key, 'AccentColor', 0, winreg.REG_DWORD, original['AccentColor'])
        winreg.CloseKey(key)
        subprocess.run('RUNDLL32.EXE USER32.DLL,UpdatePerUserSystemParameters 1, True', shell=True)
        os.remove(THEME_BACKUP_FILE)
        return True, "Тема сброшена к исходным параметрам."
    except Exception as e:
        return False, str(e)

def launch_application(app_id):
    """Запуск одного приложения по ключу из LAUNCH_APPS."""
    if app_id not in LAUNCH_APPS:
        return False, 'Неизвестное приложение'
    try:
        path = LAUNCH_APPS[app_id]
        subprocess.Popen(path, shell=True)
        return True, f'Запущено: {app_id}'
    except Exception as e:
        return False, str(e)

def load_presets():
    """Читает список пресетов из data/presets.json."""
    if not os.path.exists(PRESETS_FILE):
        return []
    with open(PRESETS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('presets', [])

def run_preset(preset_name):
    """Запускает все приложения из указанного пресета (асинхронно)."""
    presets = load_presets()
    target = next((p for p in presets if p['name'] == preset_name), None)
    if not target:
        return False, f'Пресет "{preset_name}" не найден.'
    launched = []
    errors = []
    for command in target.get('commands', []):
        try:
            # Если команда начинается с http, открываем в браузере
            if command.startswith('http'):
                subprocess.Popen(f'start "" "{command}"', shell=True)
            else:
                subprocess.Popen(command, shell=True)
            launched.append(command)
        except Exception as e:
            errors.append(f'{command}: {e}')
    if errors:
        return True, f"Частично запущено. Ошибки: {', '.join(errors)}"
    return True, f'Пресет "{preset_name}" запущен ({len(launched)} приложений).'
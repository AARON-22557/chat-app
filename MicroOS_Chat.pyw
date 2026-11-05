"""
====================================================================
  💻 MicroOS PC - Lanzador Silencioso en Python (.pyw)
====================================================================
Al tener la extensión .pyw, Windows lo ejecuta con pythonw.exe
de forma 100% silenciosa (sin NINGUNA ventana negra de consola).

1. Localiza server.js automáticamente.
2. Inicia node server.js en segundo plano si no está encendido.
3. Abre http://localhost:3000 en el navegador predeterminado.
4. Si se ejecuta con el argumento --autostart, también se añade al
   inicio de Windows para encenderse solo con el PC.
====================================================================
"""

import os
import sys
import time
import socket
import subprocess
import webbrowser
from pathlib import Path

PORT = 3000
SERVER_URL = f"http://localhost:{PORT}"
SCRIPT_DIR = Path(__file__).resolve().parent

def find_app_dir():
    """Busca server.js en la carpeta actual, en Descargas o en el proyecto."""
    # 1. En la misma carpeta que este script
    if (SCRIPT_DIR / "server.js").exists():
        return SCRIPT_DIR
    
    # 2. En Descargas
    downloads_app = Path.home() / "Downloads" / "MicroOS_PC_Chat_App"
    if (downloads_app / "server.js").exists():
        return downloads_app
    
    # 3. En scratch
    scratch_dir = Path(r"C:\Users\aaron\.gemini\antigravity\scratch\jules_app")
    if (scratch_dir / "server.js").exists():
        return scratch_dir
        
    return SCRIPT_DIR

APP_DIR = find_app_dir()

def is_server_online(host="127.0.0.1", port=PORT, timeout=0.6):
    """Comprueba si el servidor ya está activo."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

def find_node_executable():
    """Busca la ruta exacta de node.exe en el sistema."""
    default_paths = [
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\nodejs\node.exe")
    ]
    for p in default_paths:
        if os.path.exists(p):
            return p
    return "node"

def start_server_silently():
    """Arranca node server.js en segundo plano de forma totalmente invisible."""
    server_script = APP_DIR / "server.js"
    if not server_script.exists():
        return False

    node_bin = find_node_executable()

    DETACHED_PROCESS = 0x00000008
    CREATE_NO_WINDOW = 0x08000000

    try:
        subprocess.Popen(
            [node_bin, "server.js"],
            cwd=str(APP_DIR),
            creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True
        )
        return True
    except Exception:
        return False

def register_windows_startup():
    """Copia un archivo de auto-arranque en la carpeta Inicio de Windows."""
    try:
        startup_dir = Path(os.environ.get("APPDATA", "")) / r"Microsoft\Windows\Start Menu\Programs\Startup"
        if not startup_dir.exists():
            return False

        launcher_path = str(Path(__file__).resolve())
        bat_file = startup_dir / "MicroOS_Chat_AutoStart.bat"
        # Usamos start /b pythonw para que sea 100% invisible
        bat_content = f'@start "" pythonw "{launcher_path}"\n'
        bat_file.write_text(bat_content, encoding="utf-8")
        return True
    except Exception:
        return False

def main():
    # Si se pide registrar inicio automático con Windows
    if "--autostart" in sys.argv or "--instalar-inicio" in sys.argv:
        register_windows_startup()

    # 1. Si no está activo el servidor, arrancarlo
    if not is_server_online():
        start_server_silently()
        for _ in range(15):
            time.sleep(0.3)
            if is_server_online():
                break

    # 2. Abrir automáticamente en el navegador web
    webbrowser.open(SERVER_URL)

if __name__ == "__main__":
    main()

"""
====================================================================
  💻 MicroOS PC - Lanzador Automático Inteligente (Python)
====================================================================
Este script:
1. Localiza automáticamente los archivos de MicroOS Chat.
2. Inicia el servidor Node.js en segundo plano (100% invisible).
3. Abre tu navegador automáticamente en la app.
4. Puede configurarse para arrancar solo cada vez que enciendes el PC.
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
    """Busca automáticamente la carpeta con server.js."""
    # 1. En la misma carpeta que el script
    if (SCRIPT_DIR / "server.js").exists():
        return SCRIPT_DIR
    
    # 2. En la carpeta de Descargas del usuario
    downloads_app = Path.home() / "Downloads" / "MicroOS_PC_Chat_App"
    if (downloads_app / "server.js").exists():
        return downloads_app
    
    # 3. En el directorio de trabajo predeterminado
    scratch_dir = Path(r"C:\Users\aaron\.gemini\antigravity\scratch\jules_app")
    if (scratch_dir / "server.js").exists():
        return scratch_dir
        
    return SCRIPT_DIR

APP_DIR = find_app_dir()

def is_server_online(host="127.0.0.1", port=PORT, timeout=0.6):
    """Comprueba si el servidor ya está respondiendo."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

def start_server_silently():
    """Inicia el servidor en segundo plano sin ventana negra."""
    server_script = APP_DIR / "server.js"
    if not server_script.exists():
        print(f"❌ Error: No se encontró 'server.js' en: {APP_DIR}")
        return False

    DETACHED_PROCESS = 0x00000008
    CREATE_NO_WINDOW = 0x08000000

    try:
        subprocess.Popen(
            ["node", "server.js"],
            cwd=str(APP_DIR),
            creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True
        )
        return True
    except FileNotFoundError:
        print("❌ Error: Node.js no está en el sistema. Descárgalo desde https://nodejs.org/")
        return False
    except Exception as e:
        print(f"❌ Error al iniciar servidor: {e}")
        return False

def enable_windows_startup():
    """Activa el inicio automático con Windows al prender el PC."""
    try:
        startup_dir = Path(os.environ.get("APPDATA", "")) / r"Microsoft\Windows\Start Menu\Programs\Startup"
        if not startup_dir.exists():
            print("❌ No se encontró la carpeta Inicio de Windows.")
            return False

        vbs_path = startup_dir / "MicroOS_Chat_AutoStart.vbs"
        launcher_path = str(Path(__file__).resolve())
        python_exe = sys.executable.replace("python.exe", "pythonw.exe")

        vbs_content = (
            f'Set WshShell = CreateObject("WScript.Shell")\n'
            f'WshShell.Run "{python_exe} \"{launcher_path}\" --silent", 0, False\n'
        )

        vbs_path.write_text(vbs_content, encoding="utf-8")
        print("\n==========================================================")
        print("  ✅ ¡Inicio automático activado con éxito!")
        print("  Ahora MicroOS Chat se iniciará solo al encender tu PC.")
        print("==========================================================")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def disable_windows_startup():
    """Desactiva el inicio automático con Windows."""
    try:
        startup_dir = Path(os.environ.get("APPDATA", "")) / r"Microsoft\Windows\Start Menu\Programs\Startup"
        vbs_path = startup_dir / "MicroOS_Chat_AutoStart.vbs"
        if vbs_path.exists():
            vbs_path.unlink()
            print("✅ Inicio automático desactivado.")
        else:
            print("ℹ️ El inicio automático no estaba activado.")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def launch_app(silent=False):
    """Lanza el servidor y abre el navegador."""
    if not silent:
        print(f"📁 Directorio de la app: {APP_DIR}")

    if is_server_online():
        if not silent:
            print("🟢 El servidor ya está activo.")
    else:
        if not silent:
            print("🔄 Iniciando servidor de chat en segundo plano...")
        if not start_server_silently():
            return False

        # Esperar hasta que responda
        for _ in range(15):
            time.sleep(0.3)
            if is_server_online():
                break

    if not silent:
        print(f"🌐 Abriendo {SERVER_URL}...")
    webbrowser.open(SERVER_URL)
    return True

def main():
    # Modo silencioso (cuando arranca solo con Windows)
    if "--silent" in sys.argv:
        launch_app(silent=True)
        return

    # Flags manuales
    if "--activar-inicio" in sys.argv:
        enable_windows_startup()
        return
    elif "--desactivar-inicio" in sys.argv:
        disable_windows_startup()
        return

    print("==========================================================")
    print("  💻 MicroOS PC - Lanzador Automático")
    print("==========================================================")
    print(" [1] Iniciar MicroOS Chat ahora")
    print(" [2] Activar inicio automático (se abre al encender el PC)")
    print(" [3] Desactivar inicio automático")
    print("==========================================================")

    # Si se pulsa o se ejecuta directo, inicia en 2 segundos por defecto
    try:
        opcion = input("Elige una opción (Enter para [1]): ").strip()
    except Exception:
        opcion = "1"

    if opcion == "2":
        enable_windows_startup()
        input("\nPresiona Enter para salir...")
    elif opcion == "3":
        disable_windows_startup()
        input("\nPresiona Enter para salir...")
    else:
        launch_app()

if __name__ == "__main__":
    main()

import sys, asyncio, threading, webbrowser, os, time, ctypes
from pathlib import Path
import uvicorn
import webview
import httpx

API_PORT = 8765
CURRENT_DIR = Path(__file__).parent.absolute()

if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BASE_DIR = Path(sys._MEIPASS)
    sys.path.insert(0, str(BASE_DIR))
else:
    BASE_DIR = CURRENT_DIR

FRONTEND_DIR = BASE_DIR / "frontend" / "dist"

def hide_console():
    """隐藏控制台窗口"""
    if sys.platform == 'win32':
        try:
            kernel32 = ctypes.WinDLL('kernel32')
            user32 = ctypes.WinDLL('user32')
            hWnd = kernel32.GetConsoleWindow()
            if hWnd:
                user32.ShowWindow(hWnd, 0) # SW_HIDE = 0
        except:
            pass

class WindowApi:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def minimize(self):
        if self._window: self._window.minimize()

    def toggle_maximize(self):
        if self._window:
            self._window.toggle_fullscreen() # pywebview maximize is essentially fullscreen or we can switch
            # Actually pywebview doesn't have a direct 'maximize' vs 'restore' toggle easily exposed in all platforms
            # But let's try toggle_fullscreen or just maximize
            # self._window.evaluate_js('...') to check state?
            # Start with toggle_fullscreen for "frameless" feel or use specialized maximize
            pass
            # NOTE: pywebview's maximize support varies. 
            # On Windows, toggle_fullscreen might be too much. 
            # Let's try to just do nothing for now or map to maximize if available.
            # Unfortunately webview.Window has maximize() but check is_maximized is hard.
            self._window.maximize() # Simple maximize for now

    def close(self):
        if self._window: self._window.destroy()

    def start_drag(self):
        # pywebview handles drag via CSS class usually? 
        # Actually easy_drag=False means we need explicit drag.
        # But commonly we use a specially marked element.
        # If we use pywebview-drag-region class, we don't need this API.
        pass

def run_server():
    import api_server
    # Minimize logs
    config = uvicorn.Config(app=api_server.app, host="127.0.0.1", port=API_PORT, log_level="error")
    server = uvicorn.Server(config)
    server.run()

def wait_for_server(timeout=30):
    print(f"等待API服务器启动...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = httpx.get(f"http://127.0.0.1:{API_PORT}/api/status", timeout=2)
            if response.status_code == 200:
                print(f"API服务器已就绪")
                return True
        except:
            time.sleep(0.5)
    print(f"API服务器启动超时")
    return False

def main():
    # 隐藏控制台
    hide_console() 
    
    print("=" * 50)
    print("  Game Latest - Steam游戏入库工具")
    print("  版本: 1.0.0")
    print("=" * 50)

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    print(f"后端服务已启动: http://127.0.0.1:{API_PORT}")

    if not wait_for_server():
        print("错误: API服务器启动失败")
        sys.exit(1)

    window_title = "Game Latest - Steam游戏入库工具"
    window_width = 1200
    window_height = 750

    window_api = WindowApi()

    def on_closing(window):
        print("正在关闭应用...")

    html_path = FRONTEND_DIR / "index.html"
    if not html_path.exists():
        print(f"错误: 未找到前端文件 {html_path}")
        sys.exit(1)

    print(f"加载前端文件: {html_path}")

    try:
        window = webview.create_window(
            window_title,
            url=f"http://127.0.0.1:{API_PORT}/",
            width=window_width,
            height=window_height,
            min_size=(800, 600),
            background_color="#FFFFFF",
            frameless=True,
            easy_drag=False,
            js_api=window_api
        )
        window_api.set_window(window)
        print("窗口创建成功")
    except Exception as e:
        print(f"创建窗口失败: {e}")
        sys.exit(1)

    try:
        webview.start(on_closing, [window])
        print("应用已关闭")
    except Exception as e:
        print(f"webview 启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"程序异常: {e}")
        sys.exit(1)

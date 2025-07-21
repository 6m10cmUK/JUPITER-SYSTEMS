import uvicorn
import logging
import sys
import os
import signal
import atexit
import time

# グレースフルシャットダウンのための設定
server_process = None

def cleanup():
    """Clean up resources on exit"""
    print("\n[INFO] Cleaning up resources...")
    if server_process:
        try:
            server_process.terminate()
            time.sleep(1)
        except:
            pass

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n[INFO] Received shutdown signal...")
    cleanup()
    sys.exit(0)

# シグナルハンドラーの登録
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)
atexit.register(cleanup)

if __name__ == "__main__":
    # 環境変数設定
    os.environ["PYTHONUNBUFFERED"] = "1"
    
    print("[INFO] Starting FastAPI development server...")
    print("[INFO] Press Ctrl+C to stop the server")
    print("[INFO] Auto-reload is enabled")
    print(f"[INFO] Working directory: {os.getcwd()}")
    
    try:
        # uvicornの実行
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_dirs=["."],
            log_level="info",
            access_log=True,
            use_colors=False,  # Windows環境でのカラー出力を無効化
            workers=1  # リロード時はワーカーを1つに
        )
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Server error: {e}")
    finally:
        print("[INFO] Server shutdown complete")
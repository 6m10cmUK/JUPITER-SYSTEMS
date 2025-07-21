import uvicorn
import signal
import sys
import os

# グレースフルシャットダウンのためのシグナルハンドラー
def signal_handler(sig, frame):
    print("\n[INFO] Shutting down server gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    # 環境変数設定
    os.environ["PYTHONUNBUFFERED"] = "1"
    
    print("[INFO] Starting FastAPI server...")
    print(f"[INFO] Working directory: {os.getcwd()}")
    print("[INFO] Press Ctrl+C to stop the server")
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,  # 本番環境ではreloadを無効化
            workers=1,     # シングルワーカーで動作
            log_level="info",
            access_log=True,
            use_colors=False,  # Windows対応
            loop="asyncio",
            server_header=False,
            date_header=False
        )
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Server error: {e}")
    finally:
        print("[INFO] Server shutdown complete")
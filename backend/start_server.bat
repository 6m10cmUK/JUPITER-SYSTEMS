@echo off
echo Starting PDF to Markdown API Server...
echo.

REM 仮想環境をアクティベート
call venv\Scripts\activate

REM 依存関係をインストール
echo Installing dependencies...
pip install -r requirements.txt

REM サーバーを起動
echo.
echo Starting FastAPI server on http://localhost:8000
echo API documentation: http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
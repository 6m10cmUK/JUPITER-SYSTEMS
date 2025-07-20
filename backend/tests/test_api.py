import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    """ルートエンドポイントのテスト"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "PDF to Markdown API",
        "version": "1.0.0"
    }

def test_extract_text_no_file():
    """ファイルなしでのテキスト抽出エンドポイントのテスト"""
    response = client.post("/api/extract-text")
    assert response.status_code == 422  # Validation error

def test_extract_text_invalid_file():
    """無効なファイルでのテキスト抽出エンドポイントのテスト"""
    response = client.post(
        "/api/extract-text",
        files={"file": ("test.txt", b"This is not a PDF", "text/plain")}
    )
    assert response.status_code == 400
    assert "PDFファイルのみ対応しています" in response.json()["detail"]

def test_analyze_layout_no_file():
    """ファイルなしでのレイアウト解析エンドポイントのテスト"""
    response = client.post("/api/analyze-layout")
    assert response.status_code == 422  # Validation error

# 実際のPDFファイルを使用したテストは、テスト用PDFを用意してから追加
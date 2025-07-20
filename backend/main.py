from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import io
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import hashlib
from datetime import datetime
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import base64
import os
import json
import secrets

app = FastAPI(title="PDF to Markdown API")

# AES暗号化の設定

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    start_page: Optional[int] = 1
    end_page: Optional[int] = None
    extract_images: Optional[bool] = False
    preserve_layout: Optional[bool] = True

class PageText(BaseModel):
    page_number: int
    text: str
    blocks: List[Dict]
    column_count: int = 1

class ExtractResponse(BaseModel):
    total_pages: int
    extracted_pages: List[PageText]
    full_text: str

class EncryptedExtractResponse(BaseModel):
    encrypted_data: str
    iv: str  # 初期化ベクトル
    metadata: Dict[str, Any]  # 暗号化されていないメタデータ

@app.get("/")
async def root():
    return {"message": "PDF to Markdown API", "version": "1.0.0"}

@app.post("/api/extract-text", response_model=ExtractResponse)
async def extract_text(
    file: UploadFile = File(...),
    start_page: int = 1,
    end_page: Optional[int] = None,
    preserve_layout: bool = True
):
    """
    PDFからテキストを高精度で抽出
    """
    # ファイルタイプ検証
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみ対応しています")
    
    # ファイルサイズ制限（100MB）- 大型TRPGシナリオにも対応
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    file_size = 0
    
    # Content-Type検証
    if file.content_type not in ["application/pdf", "application/x-pdf"]:
        raise HTTPException(status_code=400, detail="無効なファイルタイプです")
    
    try:
        # PDFファイルを読み込み
        pdf_bytes = await file.read()
        
        # ファイルサイズチェック
        file_size = len(pdf_bytes)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"ファイルサイズが大きすぎます。最大{MAX_FILE_SIZE // (1024*1024)}MBまで対応しています")
        
        # PDFファイルとして開けるか検証
        try:
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # 暗号化されているかチェック
            if pdf_document.is_encrypted:
                # パスワードなしで開けるか試す（一部のPDFは印刷制限のみ）
                if not pdf_document.authenticate(""):
                    pdf_document.close()
                    raise HTTPException(
                        status_code=403, 
                        detail="暗号化されたPDFです。パスワード保護されたPDFは現在サポートしていません。"
                    )
                # 認証成功した場合は続行（印刷制限のみのPDF等）
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail="有効なPDFファイルではありません")
        
        total_pages = len(pdf_document)
        
        # ページ範囲の検証
        if start_page < 1:
            start_page = 1
        if end_page is None or end_page > total_pages:
            end_page = total_pages
            
        extracted_pages = []
        full_text_parts = []
        
        for page_num in range(start_page - 1, end_page):
            page = pdf_document[page_num]
            
            if preserve_layout:
                # レイアウトを保持した抽出
                text, blocks, column_count = extract_with_layout(page)
            else:
                # シンプルなテキスト抽出
                text = page.get_text()
                blocks = []
                column_count = 1
            
            page_data = PageText(
                page_number=page_num + 1,
                text=text,
                blocks=blocks,
                column_count=column_count
            )
            
            extracted_pages.append(page_data)
            full_text_parts.append(f"--- ページ {page_num + 1} ---\n{text}")
        
        pdf_document.close()
        
        return ExtractResponse(
            total_pages=total_pages,
            extracted_pages=extracted_pages,
            full_text="\n\n".join(full_text_parts)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"処理エラー: {str(e)}")

@app.post("/api/extract-text-encrypted", response_model=EncryptedExtractResponse)
async def extract_text_encrypted(
    file: UploadFile = File(...),
    start_page: int = 1,
    end_page: Optional[int] = None,
    preserve_layout: bool = True,
    user_key: str = None  # クライアントから送信される暗号化キー
):
    """
    PDFからテキストを抽出してクライアントの暗号化キーで暗号化して返す
    """
    if not user_key:
        raise HTTPException(status_code=400, detail="暗号化キーが必要です")
    
    # 通常の抽出処理を実行
    result = await extract_text(file, start_page, end_page, preserve_layout)
    
    # 結果をJSON文字列に変換
    result_dict = result.dict()
    result_json = json.dumps(result_dict, ensure_ascii=False)
    
    # AES暗号化の準備
    try:
        # キーをバイト配列に変換（Base64デコード）
        key_bytes = base64.b64decode(user_key)[:32]  # 32バイト（256ビット）に制限
        
        # 初期化ベクトル（IV）を生成
        iv = os.urandom(12)  # GCMモードでは12バイトのIV
        
        # AES-GCM暗号化
        cipher = Cipher(
            algorithms.AES(key_bytes),
            modes.GCM(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # データを暗号化
        encrypted_data = encryptor.update(result_json.encode('utf-8')) + encryptor.finalize()
        
        # 認証タグを取得
        auth_tag = encryptor.tag
        
        # 暗号化データと認証タグを結合
        encrypted_with_tag = encrypted_data + auth_tag
        
        return EncryptedExtractResponse(
            encrypted_data=base64.b64encode(encrypted_with_tag).decode(),
            iv=base64.b64encode(iv).decode(),
            metadata={
                "total_pages": result_dict["total_pages"],
                "extracted_pages_count": len(result_dict["extracted_pages"]),
                "status": "encrypted"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"暗号化エラー: {str(e)}")

def extract_with_layout(page):
    """
    レイアウト情報を保持してテキストを抽出（マルチカラム対応）
    """
    blocks = page.get_text("dict")["blocks"]
    
    # テキストブロックのみをフィルタ
    text_blocks = [b for b in blocks if b["type"] == 0]
    
    if not text_blocks:
        return "", [], 1
    
    # カラムを検出
    columns = detect_columns_with_blocks(text_blocks)
    column_count = len(columns)
    
    text_parts = []
    block_infos = []
    
    if column_count > 1:
        # マルチカラムの場合：カラムごとに処理
        for col_blocks in columns:
            # 各カラム内でY座標でソート
            col_blocks_sorted = sorted(col_blocks, key=lambda b: b["bbox"][1])
            
            for block in col_blocks_sorted:
                text, info = process_block(block)
                if text:
                    text_parts.append(text)
                    block_infos.append(info)
    else:
        # シングルカラムの場合：通常通りY座標でソート
        sorted_blocks = sorted(text_blocks, key=lambda b: b["bbox"][1])
        
        for block in sorted_blocks:
            text, info = process_block(block)
            if text:
                text_parts.append(text)
                block_infos.append(info)
    
    return "\n\n".join(text_parts), block_infos, column_count

def process_block(block):
    """
    単一ブロックを処理してテキストと情報を抽出
    """
    block_text = []
    
    for line in block["lines"]:
        line_text = ""
        for span in line["spans"]:
            line_text += span["text"]
        block_text.append(line_text)
    
    block_full_text = "\n".join(block_text)
    
    # ブロック情報を作成
    block_info = {
        "bbox": block["bbox"],
        "text": block_full_text,
        "font_size": get_average_font_size(block),
        "is_bold": is_bold_block(block)
    }
    
    return block_full_text, block_info

def detect_columns_with_blocks(blocks):
    """
    テキストブロックからカラムを検出してグループ化
    """
    if not blocks:
        return []
    
    # X座標でブロックをグループ化
    x_groups = {}
    threshold = 50  # X座標の差の閾値
    
    for block in blocks:
        x = block["bbox"][0]  # 左端のX座標
        
        # 既存のグループに属するかチェック
        added = False
        for group_x in list(x_groups.keys()):
            if abs(x - group_x) < threshold:
                x_groups[group_x].append(block)
                added = True
                break
        
        # 新しいグループを作成
        if not added:
            x_groups[x] = [block]
    
    # X座標でソートしてカラムとして返す
    sorted_columns = [x_groups[x] for x in sorted(x_groups.keys())]
    
    # 各カラムに十分なブロックがあるかチェック（ノイズを除去）
    significant_columns = []
    for col in sorted_columns:
        if len(col) > 2:  # 3つ以上のブロックがあるカラムのみ
            significant_columns.append(col)
    
    # 有効なカラムが1つ以下の場合は、すべてのブロックを1つのカラムとして扱う
    if len(significant_columns) <= 1:
        return [blocks]
    
    return significant_columns

def get_average_font_size(block):
    """ブロックの平均フォントサイズを取得"""
    sizes = []
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            sizes.append(span.get("size", 12))
    return sum(sizes) / len(sizes) if sizes else 12

def is_bold_block(block):
    """ブロックが太字かどうかを判定"""
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            if "bold" in span.get("font", "").lower():
                return True
    return False

@app.post("/api/analyze-layout")
async def analyze_layout(file: UploadFile = File(...)):
    """
    PDFのレイアウトを解析して構造情報を返す
    """
    try:
        pdf_bytes = await file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        layout_info = {
            "total_pages": len(pdf_document),
            "pages": []
        }
        
        for page_num in range(min(5, len(pdf_document))):  # 最初の5ページを解析
            page = pdf_document[page_num]
            blocks = page.get_text("dict")["blocks"]
            
            page_info = {
                "page_number": page_num + 1,
                "text_blocks": len([b for b in blocks if b["type"] == 0]),
                "image_blocks": len([b for b in blocks if b["type"] == 1]),
                "columns": detect_columns(blocks),
                "has_header": detect_header(blocks),
                "has_footer": detect_footer(blocks, page.rect.height)
            }
            
            layout_info["pages"].append(page_info)
        
        pdf_document.close()
        return layout_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"レイアウト解析エラー: {str(e)}")

def detect_columns(blocks):
    """カラム数を検出"""
    if not blocks:
        return 1
    
    text_blocks = [b for b in blocks if b["type"] == 0]
    if not text_blocks:
        return 1
    
    # X座標でクラスタリング
    x_positions = [b["bbox"][0] for b in text_blocks]
    unique_x = list(set(x_positions))
    
    # 近いX座標をグループ化
    threshold = 50
    columns = []
    for x in unique_x:
        added = False
        for col in columns:
            if abs(x - col) < threshold:
                added = True
                break
        if not added:
            columns.append(x)
    
    return len(columns)

def detect_header(blocks):
    """ヘッダーの存在を検出"""
    if not blocks:
        return False
    
    # 最初のテキストブロックがヘッダーの可能性
    for block in blocks[:3]:  # 最初の3ブロックをチェック
        if block["type"] == 0:
            # Y座標が小さい（ページ上部）かつフォントサイズが大きい
            if block["bbox"][1] < 100:
                avg_size = get_average_font_size(block)
                if avg_size > 14:  # 通常より大きいフォント
                    return True
    return False

def detect_footer(blocks, page_height):
    """フッターの存在を検出"""
    if not blocks:
        return False
    
    # 最後のテキストブロックがフッターの可能性
    for block in blocks[-3:]:  # 最後の3ブロックをチェック
        if block["type"] == 0:
            # Y座標が大きい（ページ下部）
            if block["bbox"][1] > page_height - 100:
                text = " ".join(span["text"] for line in block["lines"] for span in line["spans"])
                # ページ番号やコピーライトの存在をチェック
                if any(keyword in text.lower() for keyword in ["page", "©", "copyright", str(page_height)]):
                    return True
    return False

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
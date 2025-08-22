from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import io
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
import hashlib
from datetime import datetime
import re
import logging
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import base64
import os
import json
import secrets
import sys
import tempfile
from logging.handlers import RotatingFileHandler
import glob

# Services imports (commented out for now - need to fix imports)
# from services.pdf_validator import validate_and_save_pdf, validate_page_range
# from services.text_processor import apply_text_formatting
# from services.file_manager import save_extracted_text, cleanup_temp_file
# from services.page_extractor import extract_page_text

# 環境変数で環境を判定
IS_LOCAL = os.getenv("ENVIRONMENT", "local") == "local"

# __think__ディレクトリを作成（プロジェクトルート）
THINK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "__think__")
if not os.path.exists(THINK_DIR):
    os.makedirs(THINK_DIR)
    print(f"Created directory: {THINK_DIR}")

# FastAPI/uvicorn用のロギング設定
logging_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "uvicorn": {
            "format": "%(asctime)s - %(levelname)s - %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "default",
            "filename": os.path.join(THINK_DIR, "app.log") if IS_LOCAL else "app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 3,
            "encoding": "utf-8",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"] if IS_LOCAL else ["console"],
    },
    "loggers": {
        "uvicorn": {
            "level": "INFO",
            "handlers": ["console", "file"] if IS_LOCAL else ["console"],
            "propagate": False,
        },
        "uvicorn.error": {
            "level": "INFO",
            "handlers": ["console", "file"] if IS_LOCAL else ["console"],
            "propagate": False,
            "formatter": "uvicorn",
        },
        "uvicorn.access": {
            "level": "INFO",
            "handlers": ["console", "file"] if IS_LOCAL else ["console"],
            "propagate": False,
        },
        "__main__": {
            "level": "INFO",
            "handlers": ["console", "file"] if IS_LOCAL else ["console"],
            "propagate": False,
        },
    },
}

import logging.config

# ログファイルをクリアする（ローカル環境のみ）
log_file = os.path.join(THINK_DIR, "app.log")
if IS_LOCAL and os.path.exists(log_file):
    with open(log_file, 'w', encoding='utf-8') as f:
        f.truncate(0)
    print(f"Cleared log file: {log_file}")

# 抽出結果ディレクトリを作成（存在しない場合）
EXTRACTED_TEXT_DIR = os.path.join(THINK_DIR, "extracted_texts")
if not os.path.exists(EXTRACTED_TEXT_DIR):
    os.makedirs(EXTRACTED_TEXT_DIR)
    print(f"Created directory: {EXTRACTED_TEXT_DIR}")

logging.config.dictConfig(logging_config)

# uvicorn用のloggerを使用
logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="PDF to Markdown API")

# FastAPIのスタートアップイベントでログ出力
@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI application is starting up")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")

# CORS設定
# 本番環境のURLも追加
allowed_origins = [
    "http://localhost:5173", 
    "http://localhost:5174", 
    "http://localhost:5175", 
    "http://localhost:5176", 
    "http://localhost:5177", 
    "http://localhost:5178", 
    "http://localhost:4173",
    "https://trpg-pdf2md-tool.vercel.app",  # Vercelのデフォルトドメイン
    "https://*.vercel.app",  # Vercelのプレビューデプロイ用
]

# 環境変数から追加のオリジンを取得（カスタムドメイン対応）
custom_origin = os.getenv("ALLOWED_ORIGIN")
if custom_origin:
    allowed_origins.append(custom_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
    has_header: bool = False
    has_footer: bool = False
    header_text: Optional[str] = None
    footer_text: Optional[str] = None

class ExtractResponse(BaseModel):
    total_pages: int
    extracted_pages: List[PageText]
    full_text: str
    formatted_text: Optional[str] = None
    header_region: Optional[Dict[str, float]] = None
    footer_region: Optional[Dict[str, float]] = None

class EncryptedExtractResponse(BaseModel):
    encrypted_data: str
    iv: str  # 初期化ベクトル
    metadata: Dict[str, Any]  # 暗号化されていないメタデータ

@app.get("/")
async def root():
    logger.info("Health check endpoint called")
    return {"message": "PDF to Markdown API", "status": "running"}

@app.get("/test-log")
async def test_log():
    logger.info("Test log endpoint called")
    return {"message": "Log test successful"}

@app.post("/api/extract-text", response_model=ExtractResponse)
async def extract_text(
    file: UploadFile = File(...),
    start_page: int = Query(1, ge=1),
    end_page: Optional[int] = Query(None, ge=1),
    preserve_layout: bool = Query(True),
    apply_formatting: bool = Query(False),
    remove_headers_footers: bool = Query(False),
    merge_paragraphs: bool = Query(False),
    normalize_spaces: bool = Query(False),
    fix_hyphenation: bool = Query(False),
    header_threshold_percent: float = Query(0.1, ge=0.0, le=0.5, description="ヘッダー領域の割合（0-0.5）"),
    footer_threshold_percent: float = Query(0.1, ge=0.0, le=0.5, description="フッター領域の割合（0-0.5）"),
    export_structure: bool = Query(False, description="構造化データをエクスポートするかどうか")
):
    """
    PDFからテキストを抽出し、オプションで成形処理を適用する
    """
    logger.info(f"[extract_text] リクエスト受信: {file.filename}")
    logger.info(f"  パラメータ: start_page={start_page}, end_page={end_page}, apply_formatting={apply_formatting}")
    
    # ファイルタイプ検証
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみ対応しています")
    
    # ファイルサイズ制限（100MB）- 大型TRPGシナリオにも対応
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    file_size = 0
    
    # Content-Type検証
    if file.content_type not in ["application/pdf", "application/x-pdf"]:
        raise HTTPException(status_code=400, detail="無効なファイルタイプです")
    
    # 一時ファイルを使用
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        contents = await file.read()
        tmp_file.write(contents)
        temp_path = tmp_file.name
    
    try:
        # PDFを開く
        pdf_document = fitz.open(temp_path)
        
        total_pages = len(pdf_document)
        
        # ページ範囲の調整
        if end_page is None or end_page > total_pages:
            end_page = total_pages
        
        extracted_pages = []
        full_text = []
        
        for page_num in range(start_page - 1, end_page):
            if page_num + 1 == 3:  # ページ3のみログ出力
                logger.info(f"[extract_text] ページ {page_num + 1} を処理中...")
            
            page = pdf_document[page_num]
            
            # テキストと構造情報を抽出
            if preserve_layout:
                # apply_formattingが有効な場合は改良版のPDFProcessorを使用
                if apply_formatting:
                    from backend.pdf_processor import PDFProcessor
                    processor = PDFProcessor()
                    structure = processor.extract_text_with_structure(page, apply_text_style=apply_formatting)
                    
                    # 構造化されたテキストを使用
                    text = structure["main_text"]
                    has_header = len(structure["headers"]) > 0
                    has_footer = len(structure["footers"]) > 0
                    header_text = "\n".join(structure["headers"])
                    footer_text = "\n".join(structure["footers"])
                    
                    # block_infosを構築
                    block_infos = []
                    for block in structure["blocks"]:
                        block_infos.append({
                            "bbox": block["bbox"],
                            "text": block["text"],
                            "font_size": block.get("avg_font_size", 12),
                            "is_bold": block.get("is_heading", False)
                        })
                    
                    # カラム数を判定
                    column_count = 2 if structure["has_columns"] else 1
                else:
                    # まず通常の抽出を行ってtext_blocksを取得
                    _, _, _, text_blocks = extract_with_layout(page)
                    
                    # ヘッダー/フッターの検出と削除
                    filtered_blocks = text_blocks
                    has_header = False
                    has_footer = False
                    header_text = None
                    footer_text = None
                    
                    if page_num + 1 in [1, 3]:  # ページ1と3でログ出力
                        logger.info(f"[extract_text] ページ {page_num + 1}: ヘッダー/フッター検出を実行")
                    
                    # ヘッダー/フッター検出
                    has_header, has_footer, header_text, footer_text = detect_header_footer(
                        page, text_blocks, header_threshold_percent, footer_threshold_percent
                    )
                    
                    # remove_headers_footersが有効な場合、ヘッダー/フッターを除外
                    if remove_headers_footers and (has_header or has_footer):
                        header_threshold = page.rect.height * header_threshold_percent
                        footer_threshold = page.rect.height * (1 - footer_threshold_percent)
                        
                        filtered_blocks = []
                        for block in text_blocks:
                            block_y = block['bbox'][1]
                            
                            # ヘッダー領域のブロックをスキップ
                            if has_header and block_y < header_threshold:
                                if page_num + 1 in [1, 3]:
                                    logger.info(f"  ヘッダーブロックを削除: Y={block_y:.1f}, テキスト='{block.get('text', '')[:30]}...'")
                                continue
                            
                            # フッター領域のブロックをスキップ
                            if has_footer and block_y > footer_threshold:
                                if page_num + 1 in [1, 3]:
                                    logger.info(f"  フッターブロックを削除: Y={block_y:.1f}, テキスト='{block.get('text', '')[:30]}...'")
                                continue
                            
                            filtered_blocks.append(block)
                    
                    # フィルタリングされたブロックで再度処理
                    result = extract_with_layout(page, filtered_blocks)
                    if len(result) != 4:
                        logger.error(f"extract_with_layout returned {len(result)} values instead of 4")
                    text, block_infos, column_count, _ = result
            else:
                text = page.get_text()
                block_infos = []
                text_blocks = []
                column_count = 1
                has_header = False
                has_footer = False
                header_text = None
                footer_text = None
            
            page_data = PageText(
                page_number=page_num + 1,
                text=text,
                blocks=block_infos,  # block_infosを使用
                column_count=column_count,
                has_header=has_header,
                has_footer=has_footer,
                header_text=header_text,
                footer_text=footer_text
            )
            
            extracted_pages.append(page_data)
            
            # ページ区切り表記を削除（デフォルト）
            full_text.append(text)
        
        pdf_document.close()
        
        if start_page <= 3 <= end_page:  # ページ3が範囲内の場合のみ
            logger.info(f"[extract_text] 抽出完了: {len(extracted_pages)}ページ")
        
        # 抽出結果をファイルに保存
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = file.filename.replace('.pdf', '').replace(' ', '_')
        output_filename = os.path.join(EXTRACTED_TEXT_DIR, f"{safe_filename}_{timestamp}_p{start_page}-{end_page}.txt")
        
        # 古いファイルを削除（同じPDFの同じページ範囲のファイルが10個を超えたら）
        pattern = f"{safe_filename}_*_p{start_page}-{end_page}.txt"
        existing_files = sorted(glob.glob(os.path.join(EXTRACTED_TEXT_DIR, pattern)))
        
        if len(existing_files) >= 10:
            # 最も古いファイルから削除（最新10個を残す）
            files_to_delete = existing_files[:-9]  # 最新9個を残して削除（新しいファイルを追加するので）
            for old_file in files_to_delete:
                try:
                    os.remove(old_file)
                    logger.info(f"[extract_text] 古いファイルを削除: {os.path.basename(old_file)}")
                except Exception as e:
                    logger.error(f"[extract_text] ファイル削除エラー: {e}")
        
        try:
            with open(output_filename, 'w', encoding='utf-8') as f:
                f.write(f"# PDF: {file.filename}\n")
                f.write(f"# 抽出日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"# ページ範囲: {start_page}-{end_page}\n")
                f.write(f"# 総ページ数: {total_pages}\n")
                f.write(f"# オプション: preserve_layout={preserve_layout}, apply_formatting={apply_formatting}\n")
                f.write("=" * 80 + "\n\n")
                f.write("\n".join(full_text))
            logger.info(f"[extract_text] 抽出結果を保存: {output_filename}")
        except Exception as e:
            logger.error(f"[extract_text] ファイル保存エラー: {str(e)}")
        
        return ExtractResponse(
            total_pages=total_pages,
            extracted_pages=extracted_pages,
            full_text="\n".join(full_text)
        )
        
    except Exception as e:
        logger.error(f"[extract_text] エラー: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 一時ファイルを削除
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass

@app.post("/api/extract-text-encrypted", response_model=EncryptedExtractResponse)
async def extract_text_encrypted(
    file: UploadFile = File(...),
    start_page: int = Query(1, ge=1),
    end_page: Optional[int] = Query(None, ge=1),
    preserve_layout: bool = Query(True),
    user_key: str = Query(...),
    apply_formatting: bool = Query(False),
    remove_headers_footers: bool = Query(False),
    merge_paragraphs: bool = Query(False),
    normalize_spaces: bool = Query(False),
    fix_hyphenation: bool = Query(False),
    header_threshold_percent: float = Query(0.1, ge=0.0, le=0.5, description="ヘッダー領域の割合（0-0.5）"),
    footer_threshold_percent: float = Query(0.1, ge=0.0, le=0.5, description="フッター領域の割合（0-0.5）")
):
    """
    PDFからテキストを抽出してクライアントの暗号化キーで暗号化して返す
    """
    try:
        # 通常のextract_textを呼び出し
        result = await extract_text(
            file, start_page, end_page, preserve_layout, apply_formatting,
            remove_headers_footers, merge_paragraphs, normalize_spaces, fix_hyphenation,
            header_threshold_percent, footer_threshold_percent
        )
        
        # 結果をJSON文字列に変換
        result_dict = result.dict()
        result_json = json.dumps(result_dict, ensure_ascii=False)
        
        # AES暗号化の準備
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
        
        # 暗号化前の抽出結果をファイルに保存
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = file.filename.replace('.pdf', '').replace(' ', '_')
        output_filename = os.path.join(EXTRACTED_TEXT_DIR, f"{safe_filename}_{timestamp}_p{start_page}-{end_page}_encrypted.txt")
        
        # 古いファイルを削除（同じPDFの同じページ範囲のファイルが10個を超えたら）
        pattern = f"{safe_filename}_*_p{start_page}-{end_page}_encrypted.txt"
        existing_files = sorted(glob.glob(os.path.join(EXTRACTED_TEXT_DIR, pattern)))
        
        if len(existing_files) >= 10:
            # 最も古いファイルから削除（最新10個を残す）
            files_to_delete = existing_files[:-9]  # 最新9個を残して削除（新しいファイルを追加するので）
            for old_file in files_to_delete:
                try:
                    os.remove(old_file)
                    logger.info(f"[extract_text_encrypted] 古いファイルを削除: {os.path.basename(old_file)}")
                except Exception as e:
                    logger.error(f"[extract_text_encrypted] ファイル削除エラー: {e}")
        
        try:
            with open(output_filename, 'w', encoding='utf-8') as f:
                f.write(f"# PDF: {file.filename}\n")
                f.write(f"# 抽出日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"# ページ範囲: {start_page}-{end_page}\n")
                f.write(f"# 総ページ数: {result_dict['total_pages']}\n")
                f.write(f"# オプション: preserve_layout={preserve_layout}, apply_formatting={apply_formatting}\n")
                f.write(f"# 暗号化: あり\n")
                f.write("=" * 80 + "\n\n")
                f.write(result_dict["full_text"])
            logger.info(f"[extract_text_encrypted] 抽出結果を保存: {output_filename}")
        except Exception as e:
            logger.error(f"[extract_text_encrypted] ファイル保存エラー: {str(e)}")
        
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

def detect_page_regions(page):
    """
    文字座標から動的にヘッダー・フッター・カラム領域を認識
    
    Returns:
        dict: {
            'header_boundary': Y座標の境界,
            'footer_boundary': Y座標の境界,
            'column_boundaries': [X座標の境界リスト],
            'main_content_bounds': (x0, y0, x1, y1)
        }
    """
    # 全てのワードを取得
    words = page.get_text("words")
    if not words:
        return {
            'header_boundary': 0,
            'footer_boundary': page.rect.height,
            'column_boundaries': [],
            'main_content_bounds': (0, 0, page.rect.width, page.rect.height)
        }
    
    # 右下と左上の文字を探す
    rightmost_bottom_y = float('inf')
    leftmost_top_y = 0
    
    # ページの10%マージンを考慮
    page_margin_x = page.rect.width * 0.1
    page_margin_y = page.rect.height * 0.1
    
    for word in words:
        x0, y0, x1, y1, text, block_no, line_no, word_no = word
        
        # 右下の文字（右端かつ上部）を探す
        if x1 > page.rect.width - page_margin_x and y0 < page_margin_y:
            rightmost_bottom_y = min(rightmost_bottom_y, y1)
        
        # 左上の文字（左端かつ下部）を探す
        if x0 < page_margin_x and y1 > page.rect.height - page_margin_y:
            leftmost_top_y = max(leftmost_top_y, y0)
    
    # ヘッダー境界：右下の文字のY座標より下
    header_boundary = rightmost_bottom_y if rightmost_bottom_y < float('inf') else page.rect.height * 0.1
    
    # フッター境界：左上の文字のY座標より上
    footer_boundary = leftmost_top_y if leftmost_top_y > 0 else page.rect.height * 0.9
    
    # メインコンテンツ領域内のワードのみを使用してカラム境界を検出
    main_words = []
    for word in words:
        x0, y0, x1, y1, text, block_no, line_no, word_no = word
        if header_boundary < y0 < footer_boundary:
            main_words.append(word)
    
    # X座標の分布からカラム領域を検出（座標範囲として）
    column_regions = detect_column_boundaries_from_words(main_words, page.rect.width)
    
    # デバッグ出力
    if page.number + 1 == 3:
        logger.info(f"[領域検出] ページ3:")
        logger.info(f"  ヘッダー境界: Y={header_boundary:.1f}")
        logger.info(f"  フッター境界: Y={footer_boundary:.1f}")
        logger.info(f"  カラム数: {len(column_regions)}")
        for i, (start, end) in enumerate(column_regions):
            logger.info(f"  カラム{i+1}領域: X={start:.1f}-{end:.1f}")
    
    return {
        'header_boundary': header_boundary,
        'footer_boundary': footer_boundary,
        'column_regions': column_regions,  # [(x_start, x_end), ...]の形式
        'main_content_bounds': (0, header_boundary, page.rect.width, footer_boundary)
    }

def detect_column_boundaries_from_words(words, page_width):
    """ワードのX座標分布からカラム境界を検出し、各カラムの実際の座標範囲を返す"""
    if not words:
        return []
    
    # X座標の分布を分析（左端のみ）
    x_starts = []
    for word in words:
        x0, y0, x1, y1, text, block_no, line_no, word_no = word
        x_starts.append(x0)
    
    x_starts.sort()
    
    # X座標のヒストグラムを作成して、クラスタを検出
    # 20ピクセル単位でビンを作成
    bin_size = 20
    bins = {}
    
    for x in x_starts:
        bin_idx = int(x / bin_size)
        if bin_idx not in bins:
            bins[bin_idx] = 0
        bins[bin_idx] += 1
    
    # クラスタの境界を検出
    clusters = []
    current_cluster_start = None
    prev_bin = -1
    
    for bin_idx in sorted(bins.keys()):
        if current_cluster_start is None:
            current_cluster_start = bin_idx * bin_size
        elif bin_idx - prev_bin > 3:  # 3ビン以上の空白があれば新しいクラスタ
            clusters.append((current_cluster_start, prev_bin * bin_size + bin_size))
            current_cluster_start = bin_idx * bin_size
        prev_bin = bin_idx
    
    if current_cluster_start is not None:
        clusters.append((current_cluster_start, prev_bin * bin_size + bin_size))
    
    # カラム領域を定義（各クラスタの実際の座標範囲）
    column_regions = []
    for cluster in clusters:
        # このクラスタに属するワードの実際の範囲を取得
        cluster_words = []
        for word in words:
            x0, y0, x1, y1, text, block_no, line_no, word_no = word
            if cluster[0] <= x0 <= cluster[1]:
                cluster_words.append(word)
        
        if cluster_words:
            min_x = min(w[0] for w in cluster_words)
            max_x = max(w[2] for w in cluster_words)
            column_regions.append((min_x, max_x))
    
    # デバッグ出力
    logger.info(f"[カラム領域検出] クラスタ数: {len(column_regions)}")
    for i, (start, end) in enumerate(column_regions):
        logger.info(f"  カラム{i+1}: X={start:.1f}-{end:.1f} (幅={end-start:.1f})")
    
    return column_regions

def extract_with_layout(page, pre_filtered_blocks=None):
    """
    レイアウト情報を保持してテキストを抽出（マルチカラム対応）
    複数の方法を組み合わせて、すべてのテキストを確実に取得
    
    Args:
        page: PyMuPDFのページオブジェクト
        pre_filtered_blocks: ヘッダー/フッターが除外されたブロックのリスト（オプション）
    """
    page_height = page.rect.height
    text_blocks = []  # 初期化
    
    # 動的に領域を検出
    regions = detect_page_regions(page)
    
    # pre_filtered_blocksが提供されている場合はそれを使用
    if pre_filtered_blocks is not None:
        text_blocks = pre_filtered_blocks
        # デバッグ
        if page.number + 1 == 3:
            logger.info(f"[extract_with_layout] ページ3: フィルタリング済みブロック数={len(text_blocks)}")
    else:
        # 通常の処理: まずget_text_words()を使用してすべてのワードを取得
        words = page.get_text_words()
        
        # ページ1と3でデバッグ
        if page.number + 1 in [1, 3]:
            logger.info(f"[get_text_words] ページ{page.number + 1}: ワード数={len(words)}")
            # 最初の30ワードを表示
            for i, word in enumerate(words[:30]):
                x0, y0, x1, y1, text, block_no, line_no, word_no = word
                logger.info(f"  ワード{i}: '{text}' X={x0:.1f}-{x1:.1f}, Y={y0:.1f}, block={block_no}, line={line_no}")
            
            # 「0」や「|」などの特殊文字を探す
            for i, word in enumerate(words):
                x0, y0, x1, y1, text, block_no, line_no, word_no = word
                if text in ["0", "|", "1", "2", "3"] and len(text) == 1:
                    logger.info(f"  特殊文字発見: '{text}' at X={x0:.1f}, Y={y0:.1f}")
        
        # Y座標でグループ化して行を作成（X座標の大きなギャップも考慮）
        lines_dict = {}
        tolerance = 3  # Y座標の許容誤差
        x_gap_threshold = 50  # 同じ行内でのX座標の最大ギャップ
        
        for word in words:
            x0, y0, x1, y1, text, block_no, line_no, word_no = word
            
            # 既存の行に属するかチェック
            assigned = False
            for line_key in list(lines_dict.keys()):
                line_y, line_x_ranges = line_key
                if abs(y0 - line_y) < tolerance:
                    # 同じY座標の行が見つかった
                    # X座標が既存のワードと近いかチェック
                    can_merge = False
                    for existing_word in lines_dict[line_key]:
                        # 既存のワードとのX座標の距離をチェック
                        x_distance = min(abs(x0 - existing_word["x1"]), abs(x1 - existing_word["x0"]))
                        if x_distance < x_gap_threshold:
                            can_merge = True
                            break
                    
                    if can_merge:
                        lines_dict[line_key].append({
                            "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                            "text": text, "block_no": block_no
                        })
                        assigned = True
                        break
            
            if not assigned:
                # 新しい行を作成
                line_key = (y0, (x0, x1))  # Y座標とX範囲のタプルをキーとする
                lines_dict[line_key] = [{
                    "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                    "text": text, "block_no": block_no
                }]
        
        # 各行内でX座標でソート
        for line_key in lines_dict:
            lines_dict[line_key].sort(key=lambda w: w["x0"])
    
        # ページ3でのみ行の分離結果をデバッグ
        if page.number + 1 == 3:
            logger.info(f"[行分離後] ページ3: 行数={len(lines_dict)}")
            for line_key, words_in_line in sorted(lines_dict.items(), key=lambda item: item[0][0])[:10]:
                line_y, line_x_range = line_key
                logger.info(f"  行 Y={line_y:.1f}: {len(words_in_line)}ワード, X範囲={min(w['x0'] for w in words_in_line):.1f}-{max(w['x1'] for w in words_in_line):.1f}")
                for w in words_in_line:
                    logger.info(f"    '{w['text']}'")
        
        # 行をブロックにグループ化（各行内の単語をX座標でグループ化）
        block_id = 0
        x_gap_threshold = 20  # 同じ行内でのX座標の最大ギャップ（より厳密に）
        y_gap_threshold = 20  # 行間の最大許容ギャップ
        
        # 全ての行を処理して、各行内でX座標が離れているワードを別ブロックに分ける
        all_line_segments = []
        
        for line_key, words_in_line in lines_dict.items():
            line_y, line_x_range = line_key
            
            # この行のワードをX座標でソート
            sorted_words = sorted(words_in_line, key=lambda w: w["x0"])
            
            # 1ワードだけの場合はそのまま追加
            if len(sorted_words) == 1:
                all_line_segments.append({
                    "y": line_y,
                    "words": sorted_words,
                    "x_start": sorted_words[0]["x0"],
                    "x_end": sorted_words[0]["x1"]
                })
                continue
            
            # X座標のギャップで分割
            current_segment = [sorted_words[0]]
            
            for i in range(1, len(sorted_words)):
                prev_word = sorted_words[i-1]
                curr_word = sorted_words[i]
                
                # 前のワードとの距離をチェック
                x_distance = curr_word["x0"] - prev_word["x1"]
                
                # ページ3でのみデバッグ
                if page.number + 1 == 3 and line_y == 111.6:
                    logger.info(f"    ギャップチェック: '{prev_word['text']}' ({prev_word['x1']:.1f}) -> '{curr_word['text']}' ({curr_word['x0']:.1f}), 距離={x_distance:.1f}")
                
                if x_distance > x_gap_threshold:
                    # 新しいセグメントを開始
                    all_line_segments.append({
                        "y": line_y,
                        "words": current_segment,
                        "x_start": min(w["x0"] for w in current_segment),
                        "x_end": max(w["x1"] for w in current_segment)
                    })
                    current_segment = [curr_word]
                else:
                    # 同じセグメントに追加
                    current_segment.append(curr_word)
            
            # 最後のセグメントを追加
            if current_segment:
                all_line_segments.append({
                    "y": line_y,
                    "words": current_segment,
                    "x_start": min(w["x0"] for w in current_segment),
                    "x_end": max(w["x1"] for w in current_segment)
                })
        
        # Y座標でソート
        all_line_segments.sort(key=lambda seg: seg["y"])
    
        # ページ3でのみセグメント分割結果をデバッグ
        if page.number + 1 == 3:
            logger.info(f"[セグメント分割後] ページ3: セグメント数={len(all_line_segments)}")
            for i, seg in enumerate(all_line_segments[:15]):
                logger.info(f"  セグメント{i}: Y={seg['y']:.1f}, X範囲={seg['x_start']:.1f}-{seg['x_end']:.1f}")
                logger.info(f"    テキスト: '{' '.join(w['text'] for w in seg['words'])}')")
        
        # セグメントをブロックにグループ化
        current_block = None
        x_tolerance = 30  # ブロック間のX座標の許容誤差
        
        for segment in all_line_segments:
            if current_block is None:
                # 最初のブロック
                current_block = {
                    "type": 0,
                    "bbox": [segment["x_start"], segment["y"], 
                            segment["x_end"], 
                            max(w["y1"] for w in segment["words"])],
                    "lines": [{
                        "y": segment["y"],
                        "words": segment["words"]
                    }],
                    "text": "",
                    "x_start": segment["x_start"]
                }
            else:
                # 前の行との距離をチェック
                prev_line_y = current_block["lines"][-1]["y"]
                y_gap = segment["y"] - prev_line_y
            
                # X座標が近く、Y座標のギャップが小さい場合は同じブロック
                if abs(segment["x_start"] - current_block["x_start"]) < x_tolerance and y_gap < y_gap_threshold:
                    # 同じブロックに追加
                    current_block["lines"].append({
                        "y": segment["y"],
                        "words": segment["words"]
                    })
                    # バウンディングボックスを更新
                    current_block["bbox"][2] = max(current_block["bbox"][2], segment["x_end"])
                    current_block["bbox"][3] = max(current_block["bbox"][3], max(w["y1"] for w in segment["words"]))
                else:
                    # 新しいブロックを開始
                    # 現在のブロックを完成させて保存
                    block_text_parts = []
                    for line in current_block["lines"]:
                        line_text = " ".join(w["text"] for w in line["words"])
                        block_text_parts.append(line_text)
                    current_block["text"] = "\n".join(block_text_parts)
                    
                    # linesを期待される形式に変換
                    formatted_lines = []
                    for line in current_block["lines"]:
                        line_text = " ".join(w["text"] for w in line["words"])
                        formatted_lines.append({
                            "spans": [{
                                "text": line_text,
                                "bbox": [
                                    min(w["x0"] for w in line["words"]),
                                    line["y"],
                                    max(w["x1"] for w in line["words"]),
                                    max(w["y1"] for w in line["words"])
                                ]
                            }],
                            "bbox": [
                                min(w["x0"] for w in line["words"]),
                                line["y"],
                                max(w["x1"] for w in line["words"]),
                                max(w["y1"] for w in line["words"])
                            ]
                        })
                    current_block["lines"] = formatted_lines
                    
                    text_blocks.append(current_block)
                    
                    # 新しいブロックを開始
                    current_block = {
                        "type": 0,
                        "bbox": [segment["x_start"], segment["y"], 
                                segment["x_end"], 
                                max(w["y1"] for w in segment["words"])],
                        "lines": [{
                            "y": segment["y"],
                            "words": segment["words"]
                        }],
                        "text": "",
                        "x_start": segment["x_start"]
                    }
        
        # 最後のブロックを追加
        if current_block:
            block_text_parts = []
            for line in current_block["lines"]:
                line_text = " ".join(w["text"] for w in line["words"])
                block_text_parts.append(line_text)
            current_block["text"] = "\n".join(block_text_parts)
            
            # linesを期待される形式に変換
            formatted_lines = []
            for line in current_block["lines"]:
                line_text = " ".join(w["text"] for w in line["words"])
                formatted_lines.append({
                    "spans": [{
                        "text": line_text,
                        "bbox": [
                            min(w["x0"] for w in line["words"]),
                            line["y"],
                            max(w["x1"] for w in line["words"]),
                            max(w["y1"] for w in line["words"])
                        ]
                    }],
                    "bbox": [
                        min(w["x0"] for w in line["words"]),
                        line["y"],
                        max(w["x1"] for w in line["words"]),
                        max(w["y1"] for w in line["words"])
                    ]
                })
            current_block["lines"] = formatted_lines
            
            text_blocks.append(current_block)
    
    
    if not text_blocks:
        # pre_filtered_blocksが提供されていて、それが空の場合は空を返す
        if pre_filtered_blocks is not None and len(pre_filtered_blocks) == 0:
            return "", [], 1, []
        
        # フォールバック: 従来のdict方式
        blocks = page.get_text("dict")["blocks"]
        text_blocks = [b for b in blocks if b["type"] == 0]
    
    if not text_blocks:
        return "", [], 1, []
    
    # デバッグ: カラム検出前の状態を確認
    if page.number + 1 == 3:  # ページ3でのみデバッグ
        logger.info(f"[カラム検出デバッグ] ページ3: ブロック数={len(text_blocks)}")
        for i, block in enumerate(text_blocks):  # 全ブロック
            text_preview = block['text'].replace('\n', ' ')[:50]
            logger.info(f"  ブロック{i}: X={block['bbox'][0]:.1f}-{block['bbox'][2]:.1f}, Y={block['bbox'][1]:.1f}, テキスト='{text_preview}...'")
    
    # カラムを検出
    columns = detect_columns_with_blocks(text_blocks, page)
    column_count = len(columns)
    
    # デバッグ: カラム検出結果
    if page.number + 1 == 3:
        logger.info(f"  検出されたカラム数: {column_count}")
        for i, col in enumerate(columns):
            logger.info(f"    カラム{i}: {len(col)}ブロック")
            if col:
                logger.info(f"      X範囲: {min(b['bbox'][0] for b in col):.1f} - {max(b['bbox'][2] for b in col):.1f}")
    
    text_parts = []
    block_infos = []
    
    # pre_filtered_blocksが提供されている場合は、シンプルなカラム処理
    if pre_filtered_blocks is not None and len(text_blocks) > 0:
        # まず目次のようなレイアウトかチェック
        toc_entries = detect_toc_layout(text_blocks, page)
        
        if toc_entries:
            # 目次レイアウトとして処理
            for entry in toc_entries:
                text = entry["full_text"]
                info = {
                    "bbox": entry["bbox"],
                    "font_size": entry.get("font_size", 12),
                    "is_toc": True
                }
                text_parts.append(text)
                block_infos.append(info)
        else:
            # 通常のカラム処理：動的に検出された領域を使用
            if len(regions['column_regions']) >= 2:  # 複数カラムが検出された場合
                # カラム領域に基づいてブロックを分類
                columns_blocks = [[] for _ in range(len(regions['column_regions']))]
                
                for block in text_blocks:
                    # ブロックの左端（x0）と右端（x2）を使用
                    block_left = block["bbox"][0]
                    block_right = block["bbox"][2]
                    block_center = (block_left + block_right) / 2
                    
                    # どのカラムに属するか判定
                    assigned = False
                    for i, (col_start, col_end) in enumerate(regions['column_regions']):
                        # ブロックの中心がカラム領域内にある場合
                        if col_start <= block_center <= col_end:
                            columns_blocks[i].append(block)
                            assigned = True
                            break
                    
                    # どのカラムにも属さない場合は、最も近いカラムに割り当て
                    if not assigned:
                        min_dist = float('inf')
                        best_col = 0
                        for i, (col_start, col_end) in enumerate(regions['column_regions']):
                            col_center = (col_start + col_end) / 2
                            dist = abs(block_center - col_center)
                            if dist < min_dist:
                                min_dist = dist
                                best_col = i
                        columns_blocks[best_col].append(block)
                
                # 各カラム内でY座標でソート
                for col_blocks in columns_blocks:
                    col_blocks.sort(key=lambda b: b["bbox"][1])
                
                # デバッグ
                if page.number + 1 == 3:
                    logger.info(f"[カラム処理] ページ3: {len(regions['column_regions'])}カラム検出")
                    for i, col_blocks in enumerate(columns_blocks):
                        if col_blocks:
                            col_start, col_end = regions['column_regions'][i]
                            logger.info(f"  カラム{i+1} (X={col_start:.1f}-{col_end:.1f}): {len(col_blocks)}ブロック")
                            for j, block in enumerate(col_blocks[:3]):
                                text = block.get('text', '').replace('\n', ' ')[:30]
                                logger.info(f"    {j}: '{text}...'")
                
                # 左から右の順序でテキストを結合
                for col_blocks in columns_blocks:
                    for block in col_blocks:
                        text, info = process_block(block)
                        if text:
                            text_parts.append(text)
                            block_infos.append(info)
            else:
                # シンプルな左右分割（動的検出で単一カラムの場合）
                page_width = max(block["bbox"][2] for block in text_blocks)
                page_center = page_width / 2
                
                # ブロックを左右に分類（より正確な判定）
                left_blocks = []
                right_blocks = []
                
                for block in text_blocks:
                    # ブロックの左端と右端を取得
                    block_left = block["bbox"][0]
                    block_right = block["bbox"][2]
                    
                    # ブロックの実際の幅を考慮した判定
                    # ブロックの中心がページ中央より左か右かで判定
                    block_center = (block_left + block_right) / 2
                    
                    # ただし、ブロックがページ中央を跨いでいる場合は
                    # より多くの部分がある側に分類
                    if block_left < page_center and block_right > page_center:
                        # ページ中央を跨いでいる場合
                        left_part = page_center - block_left
                        right_part = block_right - page_center
                        
                        if left_part > right_part:
                            left_blocks.append(block)
                        else:
                            right_blocks.append(block)
                    elif block_right <= page_center:
                        # 完全に左側
                        left_blocks.append(block)
                    else:
                        # 完全に右側
                        right_blocks.append(block)
                
                # 各カラム内でY座標でソート
                left_blocks = sorted(left_blocks, key=lambda b: b["bbox"][1])
                right_blocks = sorted(right_blocks, key=lambda b: b["bbox"][1])
            
                # デバッグ
                if page.number + 1 == 3:
                    logger.info(f"  シンプルカラム処理: 左={len(left_blocks)}ブロック, 右={len(right_blocks)}ブロック")
                    logger.info(f"  ページ中央: X={page_center:.1f}")
                    
                    # 最初の数ブロックの詳細を表示
                    logger.info("  左カラムのブロック:")
                    for i, block in enumerate(left_blocks[:5]):
                        text = block.get('text', '').replace('\n', ' ')[:30]
                        logger.info(f"    {i}: X={block['bbox'][0]:.1f}-{block['bbox'][2]:.1f}, Y={block['bbox'][1]:.1f}, '{text}...'")
                    
                    logger.info("  右カラムのブロック:")
                    for i, block in enumerate(right_blocks[:5]):
                        text = block.get('text', '').replace('\n', ' ')[:30]
                        logger.info(f"    {i}: X={block['bbox'][0]:.1f}-{block['bbox'][2]:.1f}, Y={block['bbox'][1]:.1f}, '{text}...'")
                
                # 左カラムを処理
                for block in left_blocks:
                    text, info = process_block(block)
                    if text:
                        text_parts.append(text)
                        block_infos.append(info)
                
                # 右カラムを処理
                for block in right_blocks:
                    text, info = process_block(block)
                    if text:
                        text_parts.append(text)
                        block_infos.append(info)
        
        column_count = 2 if len(text_blocks) > 0 else 1
    elif column_count > 1:
        # マルチカラムの場合：カラムごとに処理
        if page.number + 1 == 3:  # デバッグ
            logger.info(f"  マルチカラム処理: {column_count}カラム")
        
        # 中央のヘッダーやタイトルを特定
        page_width = max(block["bbox"][2] for block in text_blocks)
        page_center = page_width / 2
        
        header_blocks = []
        column_blocks = [[] for _ in range(column_count)]
        
        # 各ブロックを適切なカラムまたはヘッダーに分類
        for block in text_blocks:
            x_start = block["bbox"][0]
            x_end = block["bbox"][2]
            block_center = (x_start + x_end) / 2
            block_width = x_end - x_start
            
            # 中央揃えのブロック（ヘッダー）を判定
            is_centered = abs(block_center - page_center) < 30 and block_width < page_width * 0.5
            
            # テキスト内容から判定
            text = block.get("text", "").strip()
            is_title_like = len(text) < 20 and not any(char in text for char in ["。", "、"]) and block["bbox"][1] < 100
            
            if is_centered or is_title_like:
                header_blocks.append(block)
            else:
                # 最も近いカラムに割り当て
                best_col = 0
                min_distance = float('inf')
                
                for col_idx, col in enumerate(columns):
                    # カラムの中心X座標を計算
                    col_x_center = sum(b["bbox"][0] for b in col) / len(col) if col else 0
                    distance = abs(block_center - col_x_center)
                    
                    if distance < min_distance:
                        min_distance = distance
                        best_col = col_idx
                
                # X座標が明確に左右に分かれている場合のみカラムに追加
                if col_idx == 0 and x_end < 200:  # 左カラム
                    column_blocks[0].append(block)
                elif col_idx == 1 and x_start > 200:  # 右カラム
                    column_blocks[1].append(block)
        
        # ヘッダーを最初に出力
        for header in sorted(header_blocks, key=lambda b: b["bbox"][1]):
            text, info = process_block(header)
            if text:
                text_parts.append(text)
                block_infos.append(info)
        
        # 各カラムのテキストを処理
        for col_idx, col_blocks in enumerate(column_blocks):
            # 各カラム内でY座標でソート
            col_blocks_sorted = sorted(col_blocks, key=lambda b: b["bbox"][1])
            
            if page.number + 1 == 3:  # デバッグ
                logger.info(f"    カラム{col_idx}: {len(col_blocks_sorted)}ブロック")
                # 最初と最後のブロックを表示
                if col_blocks_sorted:
                    first_text = col_blocks_sorted[0]['text'].replace('\n', ' ')[:30] if col_blocks_sorted else ""
                    last_text = col_blocks_sorted[-1]['text'].replace('\n', ' ')[:30] if col_blocks_sorted else ""
                    logger.info(f"      最初: '{first_text}...'")
                    logger.info(f"      最後: '{last_text}...'")
            
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
    
    # text_blocksも返すように変更（フッター検出で使用するため）
    return "\n".join(text_parts), block_infos, column_count, text_blocks

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

def detect_columns_with_blocks(blocks, page=None):
    """
    テキストブロックからカラムを検出してグループ化
    PyMuPDFのベストプラクティスを参考に実装
    """
    if not blocks:
        return []
    
    # ページ3のデバッグ
    is_page_3 = page and page.number + 1 == 3
    
    # ページの幅を取得
    page_width = page.rect.width if page else max(b["bbox"][2] for b in blocks)
    
    # ブロックをY座標でソート（上から下へ）
    sorted_blocks = sorted(blocks, key=lambda b: (b["bbox"][1], b["bbox"][0]))
    
    # X座標の分布を分析してカラムの境界を検出
    x_positions = []
    for block in sorted_blocks:
        x_positions.append(block["bbox"][0])  # 左端
        x_positions.append(block["bbox"][2])  # 右端
    
    x_positions.sort()
    
    # X座標のギャップを分析
    gaps = []
    min_gap_threshold = page_width * 0.03  # ページ幅の3%以上のギャップを検討
    
    i = 0
    while i < len(x_positions) - 1:
        gap = x_positions[i + 1] - x_positions[i]
        if gap > min_gap_threshold:
            # 連続する同じようなギャップをマージ
            gap_start = x_positions[i]
            gap_end = x_positions[i + 1]
            j = i + 1
            while j < len(x_positions) - 1 and x_positions[j + 1] - x_positions[j] < min_gap_threshold:
                j += 1
            if j > i + 1:
                gap_end = x_positions[j]
            gaps.append((gap_start, gap_end, gap_end - gap_start))
            i = j
        else:
            i += 1
    
    # デバッグ
    if is_page_3:
        logger.info(f"[カラム境界検出] ページ3: 検出されたギャップ数={len(gaps)}")
        for idx, (start, end, size) in enumerate(gaps[:5]):
            logger.info(f"  ギャップ{idx}: {start:.1f}-{end:.1f} (幅={size:.1f})")
    
    # 最も大きなギャップをカラムの境界とする
    column_boundaries = [0]  # 左端
    if gaps:
        # ギャップをサイズでソート
        gaps.sort(key=lambda g: g[2], reverse=True)
        
        # 大きなギャップから境界を選択（最大3カラムまで）
        selected_gaps = []
        for gap in gaps:
            # 既に選択したギャップと重ならないかチェック
            overlap = False
            for selected in selected_gaps:
                if not (gap[1] < selected[0] or gap[0] > selected[1]):
                    overlap = True
                    break
            if not overlap:
                selected_gaps.append(gap)
                if len(selected_gaps) >= 2:  # 最大3カラム
                    break
        
        # 境界を追加
        for gap in selected_gaps:
            boundary = (gap[0] + gap[1]) / 2
            column_boundaries.append(boundary)
    
    column_boundaries.append(page_width)  # 右端
    column_boundaries.sort()
    
    # デバッグ
    if is_page_3:
        logger.info(f"[カラム境界] ページ3: 境界={[f'{b:.1f}' for b in column_boundaries]}")
    
    # ブロックをカラムに割り当て
    columns = [[] for _ in range(len(column_boundaries) - 1)]
    
    for block in sorted_blocks:
        # ブロックの中心X座標で判定
        block_center_x = (block["bbox"][0] + block["bbox"][2]) / 2
        
        # どのカラムに属するか判定
        assigned = False
        for i in range(len(column_boundaries) - 1):
            if column_boundaries[i] <= block_center_x < column_boundaries[i + 1]:
                columns[i].append(block)
                assigned = True
                break
        
        # 割り当てられなかった場合は最も近いカラムに割り当て
        if not assigned:
            min_dist = float('inf')
            best_col = 0
            for i in range(len(columns)):
                col_center = (column_boundaries[i] + column_boundaries[i + 1]) / 2
                dist = abs(block_center_x - col_center)
                if dist < min_dist:
                    min_dist = dist
                    best_col = i
            columns[best_col].append(block)
    
    # 空のカラムを削除
    columns = [col for col in columns if col]
    
    # 単一カラムの場合、または有効なカラムが見つからない場合
    if len(columns) <= 1:
        return [sorted_blocks]
    
    # 各カラム内でY座標でソート
    for column in columns:
        column.sort(key=lambda b: b["bbox"][1])
    
    # デバッグ：ページ3のカラム検出結果
    if is_page_3:
        logger.info(f"[カラム検出結果] ページ3: {len(columns)}カラム検出")
        for idx, col in enumerate(columns):
            if col:
                x_range = f"{min(b['bbox'][0] for b in col):.1f}-{max(b['bbox'][2] for b in col):.1f}"
                logger.info(f"  カラム{idx}: {len(col)}ブロック, X範囲={x_range}")
                # 最初の3ブロックのテキストを表示
                for i, block in enumerate(col[:3]):
                    text = block.get('text', '').replace('\n', ' ')[:40]
                    logger.info(f"    ブロック{i}: '{text}...'")
    
    return columns

def detect_toc_layout(blocks, page):
    """目次のようなレイアウトを検出"""
    if not blocks or not page:
        return []
    
    page_width = page.rect.width
    toc_entries = []
    y_tolerance = 3  # Y座標の許容誤差
    
    # ブロックをY座標でグループ化
    lines = {}
    for block in blocks:
        y = block["bbox"][1]
        # 既存の行に属するかチェック
        added = False
        for line_y in list(lines.keys()):
            if abs(y - line_y) < y_tolerance:
                lines[line_y].append(block)
                added = True
                break
        if not added:
            lines[y] = [block]
    
    # 各行を分析
    for y, line_blocks in lines.items():
        if len(line_blocks) < 2:
            continue
        
        # X座標でソート
        line_blocks.sort(key=lambda b: b["bbox"][0])
        
        # 最後のブロックがページ番号パターンかチェック
        last_block = line_blocks[-1]
        last_text = last_block.get("text", "").strip()
        
        # ページ番号パターン（数字、ローマ数字、A-1形式など）
        if re.match(r'^(\d+|[ivxIVX]+|[A-Z]\d+|[A-Z]-\d+)$', last_text):
            # 最初と最後のブロック間の距離を計算
            gap = last_block["bbox"][0] - line_blocks[0]["bbox"][2]
            
            # ページ幅の10%以上のギャップがある場合は目次エントリ
            if gap > page_width * 0.1:
                # 最後以外のブロックを結合してタイトルとする
                title_blocks = line_blocks[:-1]
                title = " ".join(b.get("text", "").strip() for b in title_blocks)
                
                # ドットリーダーは一旦無視（除去しない）
                # title = re.sub(r'[\.\·\…\-]+\s*$', '', title).strip()
                
                toc_entries.append({
                    "title": title,
                    "page": last_text,
                    "full_text": f"{title} {last_text}",
                    "bbox": [
                        min(b["bbox"][0] for b in line_blocks),
                        y,
                        max(b["bbox"][2] for b in line_blocks),
                        max(b["bbox"][3] for b in line_blocks)
                    ],
                    "gap": gap
                })
    
    # デバッグ出力
    if page.number + 1 == 3 and toc_entries:
        logger.info(f"[TOC検出] ページ3: {len(toc_entries)}個の目次エントリを検出")
        for i, entry in enumerate(toc_entries[:5]):
            logger.info(f"  エントリ{i}: '{entry['title']}' -> {entry['page']} (ギャップ={entry['gap']:.1f})")
    
    # 目次エントリが3つ以上ある場合のみ目次として認識
    return toc_entries if len(toc_entries) >= 3 else []

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
async def analyze_layout(
    file: UploadFile = File(...),
    start_page: int = Query(1, description="開始ページ（1から）"),
    end_page: Optional[int] = Query(None, description="終了ページ（含む）")
):
    """
    PDFのレイアウトを解析して領域情報を返す
    """
    try:
        pdf_bytes = await file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # ページ範囲の調整
        total_pages = len(pdf_document)
        start_idx = max(0, start_page - 1)
        end_idx = min(total_pages, end_page if end_page else total_pages)
        
        layout_info = {
            "total_pages": total_pages,
            "pages": []
        }
        
        # PDFProcessorのインスタンスを作成
        from backend.pdf_processor import PDFProcessor
        processor = PDFProcessor()
        
        for page_num in range(start_idx, end_idx):
            page = pdf_document[page_num]
            page_width = page.rect.width
            page_height = page.rect.height
            
            # PDFProcessorで構造を抽出（これがすべての処理を含む）
            structure = processor.extract_text_with_structure(page)
            
            # PDFProcessorが計算した全情報を取得
            header_boundary = structure["header_boundary"]
            footer_boundary = structure["footer_boundary"]
            header_blocks = structure["raw_header_blocks"]
            footer_blocks = structure["raw_footer_blocks"]
            main_blocks = structure["raw_main_blocks"]
            vertical_gaps = structure["vertical_gaps"]  # PDFProcessorが計算済み
            
            # ヘッダー・フッター領域のサイズを計算
            header_region_height = header_boundary
            if header_blocks:
                max_bottom = max(b["bbox"][3] for b in header_blocks)
                header_region_height = max_bottom + 10
            
            # フッター領域の計算
            footer_region_y = footer_boundary
            footer_region_height = page_height - footer_boundary
            if footer_blocks:
                footer_top_y = min(b["bbox"][1] for b in footer_blocks)
                footer_region_y = footer_top_y - 10
                footer_region_height = page_height - footer_region_y
            
            # 領域情報をまとめる
            page_info = {
                "page_number": page_num + 1,
                "width": page_width,
                "height": page_height,
                "regions": {
                    "header": {
                        "x": 0,
                        "y": 0,
                        "width": page_width,
                        "height": header_region_height,
                        "detected": len(structure["headers"]) > 0,  # PDFProcessorの結果を使用
                        "text": "\n".join(structure["headers"]),   # PDFProcessorの結果を使用
                        "block_count": len(header_blocks)
                    },
                    "footer": {
                        "x": 0,
                        "y": footer_region_y,
                        "width": page_width,
                        "height": footer_region_height,
                        "detected": len(structure["footers"]) > 0,  # PDFProcessorの結果を使用
                        "text": "\n".join(structure["footers"]),   # PDFProcessorの結果を使用
                        "block_count": len(footer_blocks)
                    },
                    "vertical_gaps": vertical_gaps,
                    "columns": []
                }
            }
            
            # PDFProcessorが検出した余白がある場合はカラム情報を計算
            if vertical_gaps:
                # 共通モジュールを使用してカラム領域を計算
                from common import calculate_columns_from_gaps, assign_blocks_to_column_regions
                
                # カラム領域を取得
                columns_base = calculate_columns_from_gaps(vertical_gaps, main_blocks, page_width, header_boundary, footer_boundary)
                
                # ブロックをカラムに割り当て
                column_blocks_list = assign_blocks_to_column_regions(main_blocks, columns_base, vertical_gaps)
                
                # column_numberとblock_countを追加
                columns = []
                for i, column_base in enumerate(columns_base):
                    column = column_base.copy()
                    # 対応するブロックリストを見つける（assign_blocks_to_column_regionsが空カラムを保持するように修正済み）
                    column_blocks = column_blocks_list[i] if i < len(column_blocks_list) else []
                    column["block_count"] = len(column_blocks)
                    column["column_number"] = i + 1
                    columns.append(column)
                
                page_info["regions"]["columns"] = columns
            
            layout_info["pages"].append(page_info)
        
        pdf_document.close()
        return layout_info
        
    except Exception as e:
        logger.error(f"レイアウト解析エラー: {str(e)}")
        raise HTTPException(status_code=500, detail=f"レイアウト解析エラー: {str(e)}")

def extract_text_without_headers_footers(text_blocks: List[Dict], 
                                       header_text: Optional[str], 
                                       footer_text: Optional[str],
                                       page_height: float,
                                       header_threshold_percent: float,
                                       footer_threshold_percent: float) -> Optional[str]:
    """
    ヘッダー/フッターを除外してテキストを再構築
    """
    if not text_blocks:
        return None
    
    # 閾値を計算
    header_threshold = page_height * header_threshold_percent
    footer_threshold = page_height * (1 - footer_threshold_percent)
    
    # フィルタリングされたブロック
    filtered_blocks = []
    
    for block in text_blocks:
        block_text = block.get('text', '').strip()
        block_y = block['bbox'][1]
        
        # ヘッダー領域のブロックをスキップ
        if header_text and block_y < header_threshold:
            if block_text == header_text or header_text in block_text:
                continue
        
        # フッター領域のブロックをスキップ
        if footer_text and block_y > footer_threshold:
            if block_text == footer_text or footer_text in block_text:
                continue
            # ページ番号パターンもスキップ
            if re.match(r'^-?\s*\d+\s*-?$', block_text):
                continue
        
        filtered_blocks.append(block)
    
    # Y座標でソートして再構築
    filtered_blocks.sort(key=lambda b: b['bbox'][1])
    
    # テキストを結合
    text_parts = []
    for block in filtered_blocks:
        block_text = block.get('text', '').strip()
        if block_text:
            text_parts.append(block_text)
    
    return "\n".join(text_parts) if text_parts else None

def detect_header_footer(page: fitz.Page, blocks: List[Dict], 
                        header_threshold_percent: float = 0.1, 
                        footer_threshold_percent: float = 0.1) -> Tuple[bool, bool, Optional[str], Optional[str]]:
    """
    ページのヘッダーとフッターを検出する
    Y座標とパターンマッチングを使用
    """
    if not blocks:
        return False, False, None, None
    
    page_height = page.rect.height
    has_header = False
    has_footer = False
    header_text = None
    footer_text = None
    
    # ヘッダー候補：ページ上部の指定割合
    header_threshold = page_height * header_threshold_percent
    # フッター候補：ページ下部の指定割合（Y座標で(1-footer_threshold_percent)以降）
    footer_threshold = page_height * (1 - footer_threshold_percent)
    
    # ヘッダー検出
    for block in blocks:
        if block['bbox'][1] < header_threshold:
            has_header = True
            if header_text is None:
                header_text = block['text'].strip()
            if page.number + 1 == 3:  # ページ3のみログ
                logger.info(f"  ヘッダー検出: Y座標 = {block['bbox'][1]:.1f}, テキスト = '{block['text'].strip()}'")
    
    # フッター検出（Y座標が大きい順にソートして最下部を優先）
    footer_candidates = []
    for block in blocks:
        if block['bbox'][1] > footer_threshold:
            footer_candidates.append(block)
            if page.number + 1 == 3:  # ページ3のみログ
                logger.info(f"  フッター候補: Y座標 = {block['bbox'][1]:.1f}, テキスト = '{block['text'].strip()}'")
    
    if footer_candidates:
        has_footer = True
        # Y座標が最も大きい（最下部の）ブロックを選択
        footer_candidates.sort(key=lambda b: b['bbox'][1], reverse=True)
        footer_block = footer_candidates[0]
        footer_text = footer_block['text'].strip()
        
        # ページ番号パターンを優先
        for block in footer_candidates:
            text = block['text'].strip()
            # 単純な数字のみのパターンをページ番号として優先
            if re.match(r'^-?\s*\d+\s*-?$', text):
                footer_text = text
                if page.number + 1 == 3:
                    logger.info(f"  フッターとして選択（ページ番号）: Y座標 = {block['bbox'][1]:.1f}, テキスト = '{text}'")
                break
        else:
            # ページ番号が見つからない場合は最下部のテキストを使用
            if page.number + 1 == 3:
                logger.info(f"  フッターとして選択（最下部）: Y座標 = {footer_block['bbox'][1]:.1f}, テキスト = '{footer_text}'")
    
    if page.number + 1 == 3:
        logger.info(f"  検出結果: ヘッダー = {has_header}, フッター = {has_footer}")
    
    return has_header, has_footer, header_text, footer_text

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
    """ヘッダーを検出（簡易版）"""
    if not blocks:
        return False
    
    text_blocks = [b for b in blocks if b["type"] == 0]
    if not text_blocks:
        return False
    
    # 最初のテキストブロックがヘッダーの可能性
    first_block = text_blocks[0]
    first_text = get_block_text(first_block).strip()
    
    # ヘッダーの一般的なパターン
    header_patterns = [
        r'^Chapter\s+\d+',
        r'^第.+章',
        r'^\d+\.',
        r'^Section\s+\d+',
    ]
    
    for pattern in header_patterns:
        if re.match(pattern, first_text, re.IGNORECASE):
            return True
    
    return False

def detect_footer(blocks, page_height):
    """フッターを検出（簡易版）"""
    if not blocks:
        return False
    
    text_blocks = [b for b in blocks if b["type"] == 0]
    if not text_blocks:
        return False
    
    # ページの下部20%にあるブロックをチェック
    footer_threshold = page_height * 0.8
    
    for block in text_blocks:
        if block["bbox"][1] > footer_threshold:
            text = get_block_text(block).strip()
            # ページ番号パターン
            if re.match(r'^\d+$', text) or re.match(r'^-\s*\d+\s*-$', text):
                return True
    
    return False

def detect_header_footer_regions(pages_data):
    """複数ページを解析してヘッダー/フッター領域を検出"""
    if not pages_data or len(pages_data) < 2:
        return None, None
    
    # 全ページのブロック情報を収集
    all_blocks_by_page = []
    
    for page_data in pages_data:
        blocks = page_data["blocks"]
        page_height = page_data["height"]
        
        # テキストブロックのみ
        text_blocks = [b for b in blocks if b["type"] == 0]
        if not text_blocks:
            continue
        
        page_blocks_info = {
            "page_num": page_data["page_num"],
            "page_height": page_height,
            "blocks": []
        }
        
        for block in text_blocks:
            block_info = {
                "y": block["bbox"][1],
                "y_bottom": block["bbox"][3],  # ブロックの下端
                "height": block["bbox"][3] - block["bbox"][1],
                "text": get_block_text(block),
                "bbox": block["bbox"]
            }
            page_blocks_info["blocks"].append(block_info)
        
        all_blocks_by_page.append(page_blocks_info)
    
    # Y座標ベースでヘッダー/フッター候補を検出
    header_candidates = detect_header_candidates_by_position(all_blocks_by_page)
    header_region = None
    if header_candidates:
        header_region = determine_header_region(header_candidates)
    
    footer_candidates = detect_footer_candidates_by_position(all_blocks_by_page)
    footer_region = None
    if footer_candidates:
        footer_region = determine_footer_region(footer_candidates, all_blocks_by_page)
    
    return header_region, footer_region

def detect_header_candidates_by_position(all_blocks_by_page):
    """Y座標ベースでヘッダー候補を検出"""
    if not all_blocks_by_page:
        return []
    
    candidates = []
    
    # 各ページの高さの統計を取る
    page_heights = [page["page_height"] for page in all_blocks_by_page]
    avg_page_height = sum(page_heights) / len(page_heights)
    logger.info(f"平均ページ高さ: {avg_page_height}, ページ数: {len(all_blocks_by_page)}")
    
    # ページ上部の領域を段階的にチェック（5%, 10%, 15%, 20%）
    for threshold_percent in [0.05, 0.10, 0.15, 0.20]:
        threshold_y = avg_page_height * threshold_percent
        text_patterns = {}
        
        for page_info in all_blocks_by_page:
            # threshold_y以下にあるブロックを収集
            top_blocks = [b for b in page_info["blocks"] if b["y"] <= threshold_y]
            
            if threshold_percent == 0.05 and page_info["page_num"] == 1 and top_blocks:
                logger.info(f"ページ1の上部5%のブロック: {[b['text'] for b in top_blocks]}")
            
            for block in top_blocks:
                normalized_text = normalize_text_pattern(block["text"])
                
                if normalized_text not in text_patterns:
                    text_patterns[normalized_text] = []
                text_patterns[normalized_text].append({
                    "page": page_info["page_num"],
                    "block": block,
                    "original_text": block["text"]
                })
        
        # 繰り返しパターンを検出
        for pattern, occurrences in text_patterns.items():
            logger.info(f"ヘッダーパターン '{pattern}': {len(occurrences)}ページで出現")
            if len(occurrences) >= len(all_blocks_by_page) * 0.7:
                candidates.append({
                    "pattern": pattern,
                    "occurrences": occurrences,
                    "threshold_percent": threshold_percent,
                    "priority": 1
                })
        
        # 候補が見つかったら、より大きな領域をチェックする必要はない
        if candidates:
            break
    
    return candidates

def detect_footer_candidates_by_position(all_blocks_by_page):
    """Y座標ベースでフッター候補を検出"""
    if not all_blocks_by_page:
        return []
    
    candidates = []
    
    # 各ページの高さの統計を取る
    page_heights = [page["page_height"] for page in all_blocks_by_page]
    avg_page_height = sum(page_heights) / len(page_heights)
    
    # ページ下部の領域を段階的にチェック（95%, 90%, 85%, 80%）
    for threshold_percent in [0.95, 0.90, 0.85, 0.80]:
        threshold_y = avg_page_height * threshold_percent
        text_patterns = {}
        
        for page_info in all_blocks_by_page:
            # threshold_y以上にあるブロックを収集
            bottom_blocks = [b for b in page_info["blocks"] if b["y"] >= threshold_y]
            
            for block in bottom_blocks:
                normalized_text = normalize_text_pattern(block["text"])
                
                if normalized_text not in text_patterns:
                    text_patterns[normalized_text] = []
                text_patterns[normalized_text].append({
                    "page": page_info["page_num"],
                    "block": block,
                    "original_text": block["text"]
                })
        
        # 繰り返しパターンを検出
        for pattern, occurrences in text_patterns.items():
            logger.info(f"フッターパターン '{pattern}': {len(occurrences)}ページで出現")
            # ページ番号は50%以上、その他は70%以上で検出
            threshold = 0.5 if pattern == 'PAGE_NUMBER' else 0.7
            
            if len(occurrences) >= len(all_blocks_by_page) * threshold:
                # ページ番号の連続性チェック
                is_sequential = False
                if pattern == 'PAGE_NUMBER':
                    is_sequential = check_sequential_page_numbers(occurrences)
                
                candidates.append({
                    "pattern": pattern,
                    "occurrences": occurrences,
                    "threshold_percent": threshold_percent,
                    "is_page_number": pattern == 'PAGE_NUMBER',
                    "is_sequential": is_sequential,
                    "priority": 10 if pattern == 'PAGE_NUMBER' and is_sequential else 1
                })
        
        # ページ番号が見つかったら、それを優先
        if any(c["is_page_number"] and c["is_sequential"] for c in candidates):
            break
    
    return candidates


def check_sequential_page_numbers(occurrences):
    """ページ番号が連続しているかチェック"""
    try:
        page_nums = []
        for occ in occurrences:
            # 元のテキストから数字を抽出
            text = occ["original_text"].strip()
            match = re.search(r'\d+', text)
            if match:
                page_nums.append((occ["page"], int(match.group())))
        
        if len(page_nums) < 2:
            return False
        
        # ページ番号でソート
        page_nums.sort(key=lambda x: x[0])
        
        # 連続性をチェック
        for i in range(1, len(page_nums)):
            if page_nums[i][1] - page_nums[i-1][1] != page_nums[i][0] - page_nums[i-1][0]:
                return False
        
        return True
    except:
        return False

def normalize_text_pattern(text):
    """テキストパターンを正規化"""
    if not text:
        return ""
    
    normalized = text.strip()
    
    # 単独の数字（ページ番号の可能性が高い）を特別に処理
    if re.match(r'^\d+$', normalized):
        return 'PAGE_NUMBER'
    
    # ページ番号を含むパターン
    # 例: "- 1 -", "Page 1", "1 / 10", "[1]"
    if re.match(r'^[-\[\(\{]*\s*\d+\s*[-\]\)\}]*$', normalized):
        return 'PAGE_NUMBER'
    
    if re.match(r'^(Page|ページ|頁|P\.?|p\.?)\s*\d+$', normalized, re.IGNORECASE):
        return 'PAGE_NUMBER'
    
    if re.match(r'^\d+\s*/\s*\d+$', normalized):  # "1 / 10" 形式
        return 'PAGE_NUMBER'
    
    # 日付パターンを正規化（ページ番号と区別するため、より厳密に）
    normalized = re.sub(r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?', 'DATE', normalized)
    normalized = re.sub(r'\d{1,2}[-/月]\d{1,2}[日]?', 'DATE', normalized)
    
    # 時刻パターンを正規化
    normalized = re.sub(r'\d{1,2}:\d{2}(:\d{2})?', 'TIME', normalized)
    
    # 章番号パターンを正規化
    normalized = re.sub(r'第\s*\d+\s*[章節]', '第#章', normalized)
    normalized = re.sub(r'Chapter\s*\d+', 'Chapter #', normalized, flags=re.IGNORECASE)
    
    # その他の数字を正規化（ページ番号ではないもの）
    normalized = re.sub(r'\b\d+\b', '#', normalized)
    
    # 空白の正規化
    normalized = re.sub(r'\s+', ' ', normalized)
    
    return normalized.strip()

def determine_header_region(candidates):
    """ヘッダー領域を決定"""
    if not candidates:
        return None
    
    # 最も一貫性のあるヘッダーを選択
    best_candidate = max(candidates, key=lambda c: len(c["occurrences"]))
    
    # Y座標の統計を計算
    y_coords = [occ["block"]["y"] for occ in best_candidate["occurrences"]]
    heights = [occ["block"]["height"] for occ in best_candidate["occurrences"]]
    
    avg_y = sum(y_coords) / len(y_coords)
    max_height = max(heights)
    
    # 安全マージンを追加
    margin = max_height * 0.5
    
    return {
        "y_start": 0,
        "y_end": avg_y + max_height + margin,
        "pattern": best_candidate["pattern"]
    }

def determine_footer_region(candidates, all_blocks_by_page):
    """フッター領域を決定"""
    if not candidates:
        return None
    
    # 最も一貫性のあるフッターを選択
    best_candidate = max(candidates, key=lambda c: len(c["occurrences"]))
    
    # Y座標の統計を計算
    y_coords = [occ["block"]["y"] for occ in best_candidate["occurrences"]]
    
    avg_y = sum(y_coords) / len(y_coords)
    
    # 安全マージンを追加
    margin = 20  # ピクセル単位の固定マージン
    
    return {
        "y_start": avg_y - margin,
        "y_end": float('inf'),
        "pattern": best_candidate["pattern"]
    }


def get_page_header_footer_info(page, header_region, footer_region):
    """ページ内のヘッダー/フッター情報を取得"""
    blocks = page.get_text("dict")["blocks"]
    text_blocks = [b for b in blocks if b["type"] == 0]
    
    header_info = None
    footer_info = None
    
    if header_region:
        # ヘッダー領域内のテキストを収集
        header_blocks = [b for b in text_blocks if b["bbox"][1] < header_region["y_end"]]
        if header_blocks:
            header_texts = [get_block_text(b) for b in header_blocks]
            header_info = {
                "text": " ".join(header_texts),
                "y_end": header_region["y_end"]
            }
    
    if footer_region:
        # フッター領域内のテキストを収集
        footer_blocks = [b for b in text_blocks if b["bbox"][1] >= footer_region["y_start"]]
        if footer_blocks:
            footer_texts = [get_block_text(b) for b in footer_blocks]
            footer_info = {
                "text": " ".join(footer_texts),
                "y_start": footer_region["y_start"]
            }
    
    return header_info, footer_info

def get_block_text(block):
    """ブロックからテキストを抽出"""
    text_parts = []
    for line in block.get("lines", []):
        line_text = ""
        for span in line.get("spans", []):
            line_text += span.get("text", "")
        if line_text:
            text_parts.append(line_text)
    return " ".join(text_parts)

def extract_with_layout_and_format(page, header_region=None, footer_region=None):
    """レイアウト情報を保持しつつヘッダー/フッターを除去してテキストを抽出"""
    blocks = page.get_text("dict")["blocks"]
    page_height = page.rect.height
    
    # テキストブロックのみをフィルタ
    text_blocks = [b for b in blocks if b["type"] == 0]
    
    # ヘッダー/フッター領域のブロックを除外
    if header_region or footer_region:
        filtered_blocks = []
        for block in text_blocks:
            block_y = block["bbox"][1]
            # ヘッダー領域のチェック
            if header_region and block_y < header_region["y_end"]:
                continue
            # フッター領域のチェック
            if footer_region and block_y >= footer_region["y_start"]:
                continue
            filtered_blocks.append(block)
        text_blocks = filtered_blocks
    
    if not text_blocks:
        return "", [], 1, []
    
    # カラムを検出
    columns = detect_columns_with_blocks(text_blocks, page)
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
    
    # text_blocksも返すように変更（フッター検出で使用するため）
    return "\n".join(text_parts), block_infos, column_count, text_blocks

def format_text(text, merge_paragraphs=True, normalize_spaces=True, fix_hyphenation=True):
    """テキストを成形する"""
    if not text:
        return text
    
    formatted = text
    
    # ハイフネーション処理（行末で分割された単語の結合）
    if fix_hyphenation:
        formatted = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', formatted)
    
    # 段落内の改行を除去
    if merge_paragraphs:
        # 日本語テキスト用の改良版段落結合処理
        # 2つ以上の改行は段落境界として保持
        paragraphs = re.split(r'\n\s*\n', formatted)
        merged_paragraphs = []
        
        for para in paragraphs:
            if not para.strip():
                continue
                
            # 段落内の行を取得
            lines = para.split('\n')
            
            # 改行を保持すべきケースを判定
            processed_lines = []
            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                
                # 改行を保持すべきケース
                preserve_break = False
                
                # 1. リスト項目、見出し
                if re.match(r'^[\s]*[-•*▪︎◆●○■□]|\d+[\.、]|\s*第\d+|^\s*[A-Z][A-Z\s]+$|^[一二三四五六七八九十]+[\.、]', line):
                    preserve_break = True
                
                # 2. 会話文の開始・終了
                elif re.match(r'^[「『（【]', line) or re.search(r'[」』）】]$', line):
                    preserve_break = True
                
                # 3. 句点で終わる行（段落の終わり）
                elif i < len(lines) - 1 and re.search(r'[。！？」』）】]$', line):
                    # 次の行が小文字や助詞で始まる場合は結合
                    next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
                    if next_line and not re.match(r'^[あ-んア-ン]', next_line[0]):
                        preserve_break = True
                
                # 4. 特定のパターン（章題、節題など）
                elif re.match(r'^(序|第.{1,3}[章節部編話]|あとがき|まえがき|はじめに|おわりに|目次)', line):
                    preserve_break = True
                
                if processed_lines and not preserve_break:
                    # 前の行と結合（日本語の場合はスペース不要）
                    if re.search(r'[ぁ-んァ-ヶー一-龥]$', processed_lines[-1]) or re.match(r'^[ぁ-んァ-ヶー一-龥]', line):
                        processed_lines[-1] += line
                    else:
                        processed_lines[-1] += ' ' + line
                else:
                    processed_lines.append(line)
            
            merged_para = '\n'.join(processed_lines)
            if merged_para:
                merged_paragraphs.append(merged_para)
        
        formatted = '\n\n'.join(merged_paragraphs)
    
    # スペースの正規化
    if normalize_spaces:
        # 全角スペースを半角に
        formatted = formatted.replace('　', ' ')
        # 連続するスペースを1つに
        formatted = re.sub(r'[ ]+', ' ', formatted)
        # 行頭行末のスペースを削除
        formatted = '\n'.join(line.strip() for line in formatted.split('\n'))
    
    # 不要な空行を削除（3つ以上の連続する改行を2つに）
    formatted = re.sub(r'\n{3,}', '\n\n', formatted)
    
    # 完全に空の行（スペースのみの行）を削除
    lines = formatted.split('\n')
    cleaned_lines = []
    empty_count = 0
    
    for line in lines:
        if line.strip():  # 内容がある行
            cleaned_lines.append(line)
            empty_count = 0
        else:  # 空行
            empty_count += 1
            # 2つまでの連続する空行は保持（段落区切り）
            if empty_count <= 1:
                cleaned_lines.append(line)
    
    formatted = '\n'.join(cleaned_lines)
    
    # 文書の先頭と末尾の空白を削除
    formatted = formatted.strip()
    
    return formatted

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
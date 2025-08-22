"""PDFファイルの検証に関する処理"""
import fitz
import os
import tempfile
from typing import Tuple
from fastapi import HTTPException, UploadFile
import hashlib
import logging

logger = logging.getLogger(__name__)


async def validate_and_save_pdf(file: UploadFile) -> Tuple[str, int, str]:
    """
    PDFファイルを検証して一時ファイルとして保存する
    
    Returns:
        Tuple[str, int, str]: (一時ファイルパス, 総ページ数, ファイルハッシュ)
    """
    # PDFファイルかどうかチェック
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみ対応しています")
    
    # 一時ファイルとして保存
    contents = await file.read()
    await file.seek(0)
    
    # ファイルハッシュを計算
    file_hash = hashlib.md5(contents).hexdigest()[:8]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(contents)
        temp_path = tmp.name
    
    # PyMuPDFでPDFを開く
    try:
        pdf_document = fitz.open(temp_path)
        total_pages = len(pdf_document)
        pdf_document.close()
    except Exception as e:
        os.unlink(temp_path)
        raise HTTPException(status_code=400, detail=f"PDFファイルの読み込みに失敗しました: {str(e)}")
    
    logger.info(f"[validate_pdf] ファイル: {file.filename}, ページ数: {total_pages}, ハッシュ: {file_hash}")
    
    return temp_path, total_pages, file_hash


def validate_page_range(start_page: int, end_page: int, total_pages: int) -> Tuple[int, int]:
    """
    ページ範囲を検証して正規化する
    
    Returns:
        Tuple[int, int]: (正規化された開始ページ, 正規化された終了ページ)
    """
    # ページ範囲の検証
    if start_page > total_pages:
        raise HTTPException(status_code=400, detail=f"開始ページが総ページ数を超えています: {start_page} > {total_pages}")
    
    # end_pageが指定されていない場合は最終ページまで
    if end_page is None:
        end_page = total_pages
    
    # end_pageの検証
    if end_page > total_pages:
        end_page = total_pages
    
    if start_page > end_page:
        raise HTTPException(status_code=400, detail=f"開始ページが終了ページより大きいです: {start_page} > {end_page}")
    
    logger.info(f"[validate_page_range] ページ範囲: {start_page}-{end_page}/{total_pages}")
    
    return start_page, end_page
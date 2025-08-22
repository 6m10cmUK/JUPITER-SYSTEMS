"""ページ単位のテキスト抽出処理"""
import fitz
from typing import List, Tuple, Optional, Dict, Any
import logging
from pdf_processor import PDFProcessor
from common import extract_with_layout, extract_block_text

logger = logging.getLogger(__name__)


def extract_page_text(
    page: fitz.Page,
    page_num: int,
    preserve_layout: bool,
    apply_formatting: bool,
    remove_headers_footers: bool,
    header_threshold_percent: float,
    footer_threshold_percent: float,
    processor: PDFProcessor
) -> Tuple[str, List[Dict], int, bool, bool, Optional[str], Optional[str]]:
    """
    単一ページからテキストを抽出する
    
    Returns:
        Tuple[str, List[Dict], int, bool, bool, Optional[str], Optional[str]]:
            (テキスト, ブロック情報, カラム数, ヘッダー有無, フッター有無, ヘッダーテキスト, フッターテキスト)
    """
    if preserve_layout:
        # 構造を保持したテキスト抽出
        result = processor.extract_text_with_structure(page, apply_text_style=apply_formatting)
        
        text = result["main_text"]
        header_text = "\n".join(result["headers"]) if result["headers"] else None
        footer_text = "\n".join(result["footers"]) if result["footers"] else None
        has_header = bool(result["headers"])
        has_footer = bool(result["footers"])
        
        # ブロック情報を準備
        block_infos = result["blocks"]
        column_count = len(result.get("vertical_gaps", [])) + 1
        text_blocks = result.get("raw_main_blocks", [])
        
        # ヘッダー・フッターを削除する場合
        if remove_headers_footers and (has_header or has_footer):
            filtered_blocks = _filter_header_footer_blocks(
                text_blocks,
                result.get("header_boundary", 0),
                result.get("footer_boundary", float('inf')),
                page_num,
                has_header,
                has_footer
            )
            
            # フィルタリングされたブロックで再度処理
            result = extract_with_layout(page, filtered_blocks)
            if len(result) != 4:
                logger.error(f"extract_with_layout returned {len(result)} values instead of 4")
            text, block_infos, column_count, _ = result
    else:
        # シンプルなテキスト抽出
        text = page.get_text()
        block_infos = []
        column_count = 1
        has_header = False
        has_footer = False
        header_text = None
        footer_text = None
    
    return text, block_infos, column_count, has_header, has_footer, header_text, footer_text


def _filter_header_footer_blocks(
    blocks: List[Dict],
    header_threshold: float,
    footer_threshold: float,
    page_num: int,
    has_header: bool,
    has_footer: bool
) -> List[Dict]:
    """
    ヘッダー・フッターブロックをフィルタリングする
    """
    filtered_blocks = []
    
    for block in blocks:
        block_y = block['bbox'][1]
        
        # ヘッダー領域のブロックをスキップ
        if has_header and block_y < header_threshold:
            if page_num + 1 in [1, 3]:  # デバッグ用：最初の3ページのみログ出力
                logger.info(f"  ヘッダーブロックを削除: Y={block_y:.1f}, テキスト='{block.get('text', '')[:30]}...'")
            continue
        
        # フッター領域のブロックをスキップ
        if has_footer and block_y > footer_threshold:
            if page_num + 1 in [1, 3]:
                logger.info(f"  フッターブロックを削除: Y={block_y:.1f}, テキスト='{block.get('text', '')[:30]}...'")
            continue
        
        filtered_blocks.append(block)
    
    return filtered_blocks
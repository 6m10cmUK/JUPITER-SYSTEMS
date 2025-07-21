import fitz
from typing import List, Dict, Tuple, Optional
import re
from common import (
    detect_header_footer_boundaries,
    detect_vertical_gaps,
    calculate_columns_from_gaps,
    assign_blocks_to_column_regions,
    process_blocks_to_text,
    merge_paragraph_blocks,
    extract_block_text,
    contains_japanese
)

class PDFProcessor:
    """高精度PDF処理クラス"""
    
    def __init__(self):
        pass
    
    def extract_text_with_structure(self, page) -> Dict:
        """構造を保持したテキスト抽出"""
        blocks = page.get_text("dict")
        page_height = page.rect.height
        
        # テキストブロックのみを抽出
        text_blocks = [b for b in blocks["blocks"] if b["type"] == 0]
        
        # ヘッダー・フッター境界を検出
        header_threshold, footer_threshold = detect_header_footer_boundaries(text_blocks, page_height)
        
        # デバッグ用ログ
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[PDFProcessor] ページ高さ: {page_height}, ヘッダー境界: {header_threshold}, フッター境界: {footer_threshold}")
        
        # 全ブロックの位置を確認
        logger.info(f"[PDFProcessor] 全ブロック数: {len(text_blocks)}")
        if text_blocks:
            # 最初と最後の5ブロックを表示
            for i, block in enumerate(text_blocks[:5]):
                logger.info(f"  ブロック{i}: y={block['bbox'][1]:.2f}, text='{extract_block_text(block)[:50]}'")
            if len(text_blocks) > 10:
                logger.info("  ...")
            for i, block in enumerate(text_blocks[-5:], len(text_blocks)-5):
                logger.info(f"  ブロック{i}: y={block['bbox'][1]:.2f}, text='{extract_block_text(block)[:50]}'")
        
        main_blocks = []
        headers = []
        footers = []
        
        for block in text_blocks:
            y_pos = block["bbox"][1]
            
            # 位置のみによる分類（パターンマッチングなし）
            if y_pos <= header_threshold:
                headers.append(block)
                logger.info(f"[PDFProcessor] ヘッダーブロック検出: y_pos={y_pos}, bbox={block['bbox']}, text='{extract_block_text(block)}'")
            elif y_pos >= footer_threshold:
                footers.append(block)
                logger.info(f"[PDFProcessor] フッターブロック検出: y_pos={y_pos}, bbox={block['bbox']}, text='{extract_block_text(block)}'")
            else:
                main_blocks.append(block)
        
        # ページ幅を取得
        page_width = page.rect.width
        
        # 縦の余白領域を検出（メインブロックのみで）
        vertical_gaps = detect_vertical_gaps(main_blocks, page_width, header_threshold, footer_threshold)
        logger.info(f"[PDFProcessor] extract_text_with_structure: main_blocks数={len(main_blocks)}, 検出された余白数={len(vertical_gaps)}")
        logger.info(f"[PDFProcessor] ページ幅: {page_width}")
        
        # ブロックのX座標を確認
        if main_blocks:
            x_coords = [(b["bbox"][0], b["bbox"][2]) for b in main_blocks]
            x_coords.sort()
            logger.info(f"[PDFProcessor] 最初の5ブロックのX座標: {x_coords[:5]}")
            logger.info(f"[PDFProcessor] 最後の5ブロックのX座標: {x_coords[-5:]}")
        
        # メインコンテンツの処理
        structured_text = self._process_main_blocks(main_blocks, page_height, header_threshold, footer_threshold, vertical_gaps)
        
        # ヘッダー・フッターをフォーマット
        header_text = ""
        footer_text = ""
        
        if headers:
            header_lines = [extract_block_text(h) for h in headers]
            header_text = "【ヘッダー】\n" + "\n".join(header_lines)
        
        if footers:
            footer_lines = [extract_block_text(f) for f in footers]
            footer_text = "【フッター】\n" + "\n".join(footer_lines)
        
        # 全体のテキストを結合
        full_text_parts = []
        if header_text:
            full_text_parts.append(header_text)
        if structured_text:
            full_text_parts.append(structured_text)
        if footer_text:
            full_text_parts.append(footer_text)
        
        return {
            "main_text": "\n\n".join(full_text_parts),
            "headers": [extract_block_text(h) for h in headers],
            "footers": [extract_block_text(f) for f in footers],
            "has_columns": len(vertical_gaps) > 0,  # 余白があればマルチカラム
            "blocks": self._convert_blocks_to_dict(main_blocks),
            "header_boundary": header_threshold,
            "footer_boundary": footer_threshold,
            "page_height": page_height,
            "page_width": page_width,
            "raw_header_blocks": headers,
            "raw_footer_blocks": footers,
            "raw_main_blocks": main_blocks,
            "vertical_gaps": vertical_gaps
        }
    
    def _is_header(self, text: str) -> bool:
        """ヘッダーかどうかを判定（位置ベースで判定するため、ここでは常にFalse）"""
        return False
    
    def _is_footer(self, text: str) -> bool:
        """フッターかどうかを判定（位置ベースで判定するため、ここでは常にFalse）"""
        return False
    
    def _detect_columns(self, vertical_gaps) -> int:
        """カラム数を検出"""
        # 余白数 + 1 = カラム数
        return len(vertical_gaps) + 1 if vertical_gaps else 1
    
    def _process_main_blocks(self, blocks, page_height, header_boundary, footer_boundary, vertical_gaps) -> str:
        """メインブロックを処理してテキストを生成"""
        if not blocks:
            return ""
        
        import logging
        logger = logging.getLogger(__name__)
        
        # ページ情報を取得
        page_width = max(block["bbox"][2] for block in blocks) if blocks else 0
        if page_height is None:
            page_height = max(block["bbox"][3] for block in blocks) if blocks else 0
        
        # blocksは既にヘッダー・フッターが除外されたメインブロック
        # vertical_gapsもextract_text_with_structureで計算済み
        logger.info(f"[PDFProcessor] _process_main_blocks: main_blocks数={len(blocks)}, 受け取った余白数={len(vertical_gaps)}")
        
        # 余白が検出されたらマルチカラムとして処理
        if vertical_gaps:
            return self._process_multicolumn_blocks(blocks, page_height, header_boundary, footer_boundary, vertical_gaps)
        else:
            # シングルカラムの場合：従来通りの処理
            return process_blocks_to_text(blocks)
    
    def _process_multicolumn_blocks(self, blocks, page_height, header_boundary, footer_boundary, vertical_gaps) -> str:
        """マルチカラムのブロックを処理"""
        if not blocks:
            return ""
        
        # ページ幅を推定
        page_width = max(block["bbox"][2] for block in blocks) if blocks else 0
        
        # blocksは既にメインブロックのみ
        # vertical_gapsも受け取ったものを使用
        main_blocks = blocks
        
        # 余白がない場合はシングルカラムとして処理
        if not vertical_gaps:
            return process_blocks_to_text(blocks)
        
        # カラム領域を計算
        columns = calculate_columns_from_gaps(vertical_gaps, main_blocks, page_width, header_boundary, footer_boundary)
        
        # ブロックをカラムに割り当て
        column_blocks_list = assign_blocks_to_column_regions(main_blocks, columns)
        
        # カラムごとにテキストを処理
        column_texts = []
        for column_blocks in column_blocks_list:
            if column_blocks:
                column_text = process_blocks_to_text(column_blocks)
                if column_text:
                    column_texts.append(column_text)
        
        # カラムテキストを結合（単純に左→右の順番）
        if len(column_texts) == 0:
            return ""
        elif len(column_texts) == 1:
            return column_texts[0]
        else:
            # 複数カラムの場合は単純に結合
            return "\n\n".join(column_texts)
    
    def _classify_blocks_by_column(self, blocks) -> List[List]:
        """ブロックをカラムごとに分類"""
        if not blocks:
            return []
        
        # ページ幅を推定（全ブロックの最大右端）
        page_width = max(block["bbox"][2] for block in blocks)
        
        # X座標の範囲でカラムを検出
        column_boundaries = self._detect_column_boundaries(blocks, page_width)
        
        # ブロックをカラムに割り当て
        from common.column_assigner import assign_blocks_to_columns
        return assign_blocks_to_columns(blocks, column_boundaries)
    
    def _detect_column_boundaries(self, blocks, page_width) -> List[Tuple[float, float]]:
        """カラムの境界を検出"""
        if not blocks:
            return [(0, page_width)] if page_width else [(0, 1000)]
        
        # 共通モジュールを使用
        from common.column_detector import calculate_column_regions
        return calculate_column_regions(blocks, page_width or max(block["bbox"][2] for block in blocks))
    
    def _convert_blocks_to_dict(self, blocks) -> List[Dict]:
        """ブロック情報を辞書形式に変換"""
        result = []
        for block in blocks:
            block_info = {
                "bbox": block["bbox"],
                "text": extract_block_text(block),
                "lines": len(block.get("lines", [])),
                "avg_font_size": self._get_avg_font_size(block),
                "is_heading": self._is_heading(block)
            }
            result.append(block_info)
        return result
    
    def _get_avg_font_size(self, block) -> float:
        """平均フォントサイズを取得"""
        sizes = []
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                sizes.append(span.get("size", 12))
        return sum(sizes) / len(sizes) if sizes else 12
    
    def _is_heading(self, block) -> bool:
        """見出しかどうかを判定"""
        avg_size = self._get_avg_font_size(block)
        text = extract_block_text(block)
        
        # フォントサイズが大きい
        if avg_size > 14:
            return True
        
        # 太字
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if "bold" in span.get("font", "").lower():
                    return True
        
        # 見出しパターン
        heading_patterns = [
            r'^\\d+\\.',  # 1. 形式
            r'^第\\s*\\d+\\s*[章節]',  # 第1章 形式
            r'^[一二三四五六七八九十]+、',  # 一、形式
        ]
        
        for pattern in heading_patterns:
            if re.match(pattern, text.strip()):
                return True
        
        return False
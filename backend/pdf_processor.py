import logging
import fitz
from typing import List, Dict, Optional
import re
from common import (
    detect_header_footer_boundaries,
    detect_vertical_gaps,
    calculate_columns_from_gaps,
    assign_blocks_to_column_regions,
    process_blocks_to_text,
    merge_paragraph_blocks,
    extract_block_text,
    contains_japanese,
    analyze_text_styles,
    classify_text_style,
    format_text_with_style,
    process_blocks_to_text_with_style
)

logger = logging.getLogger(__name__)


class PDFProcessor:
    """高精度PDF処理クラス"""

    def __init__(self):
        pass

    def extract_text_with_structure(self, page, apply_text_style: bool = False) -> Dict:
        """構造を保持したテキスト抽出

        Args:
            page: PDFページオブジェクト
            apply_text_style: テキストスタイル（太字、サイズ）を適用するか
        """
        blocks = page.get_text("dict")
        page_height = page.rect.height

        # テキストブロックのみを抽出
        text_blocks = [b for b in blocks["blocks"] if b["type"] == 0]

        # テキストスタイルを解析
        style_stats = None
        if apply_text_style:
            style_stats = analyze_text_styles(text_blocks)

        # ヘッダー・フッター境界を検出
        header_threshold, footer_threshold = detect_header_footer_boundaries(text_blocks, page_height)

        logger.debug(f"[PDFProcessor] ページ高さ: {page_height}, ヘッダー境界: {header_threshold}, フッター境界: {footer_threshold}")

        logger.debug(f"[PDFProcessor] 全ブロック数: {len(text_blocks)}")
        if text_blocks:
            for i, block in enumerate(text_blocks[:5]):
                logger.debug(f"  ブロック{i}: y={block['bbox'][1]:.2f}, text='{extract_block_text(block)[:50]}'")
            if len(text_blocks) > 10:
                logger.debug("  ...")
            for i, block in enumerate(text_blocks[-5:], len(text_blocks)-5):
                logger.debug(f"  ブロック{i}: y={block['bbox'][1]:.2f}, text='{extract_block_text(block)[:50]}'")

        main_blocks = []
        headers = []
        footers = []

        for idx, block in enumerate(text_blocks):
            y_pos = block["bbox"][1]

            # 位置のみによる分類（パターンマッチングなし）
            if y_pos <= header_threshold:
                headers.append(block)
                logger.debug(f"[PDFProcessor] ヘッダーブロック検出: y_pos={y_pos}, bbox={block['bbox']}, text='{extract_block_text(block)}'")
            elif y_pos >= footer_threshold:
                footers.append(block)
                logger.debug(f"[PDFProcessor] フッターブロック検出: y_pos={y_pos}, bbox={block['bbox']}, text='{extract_block_text(block)}'")
            else:
                main_blocks.append(block)
                if len(main_blocks) <= 20:
                    text = extract_block_text(block)
                    logger.debug(f"[PDFProcessor] メインブロック{len(main_blocks)-1} (元index={idx}): Y={y_pos:.1f}, X={block['bbox'][0]:.1f}-{block['bbox'][2]:.1f}, text='{text[:30]}'...")

        # ページ幅を取得
        page_width = page.rect.width

        # 縦の余白領域を検出（メインブロックのみで）
        vertical_gaps = detect_vertical_gaps(main_blocks, page_width, header_threshold, footer_threshold)
        logger.debug(f"[PDFProcessor] extract_text_with_structure: main_blocks数={len(main_blocks)}, 検出された余白数={len(vertical_gaps)}")
        logger.debug(f"[PDFProcessor] ページ幅: {page_width}")

        if main_blocks:
            x_coords = [(b["bbox"][0], b["bbox"][2]) for b in main_blocks]
            x_coords.sort()
            logger.debug(f"[PDFProcessor] 最初の5ブロックのX座標: {x_coords[:5]}")
            logger.debug(f"[PDFProcessor] 最後の5ブロックのX座標: {x_coords[-5:]}")

        # メインコンテンツの処理（ヘッダー・フッターも渡す）
        structured_text = self._process_main_blocks(main_blocks, page_height, header_threshold, footer_threshold, vertical_gaps, headers, footers, style_stats)

        full_text_parts = []
        if structured_text:
            full_text_parts.append(structured_text)

        result = {
            "main_text": "\n\n".join(full_text_parts),
            "headers": [extract_block_text(h) for h in headers],
            "footers": [extract_block_text(f) for f in footers],
            "has_columns": len(vertical_gaps) > 0,
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

        if style_stats:
            result["style_stats"] = style_stats

        return result

    def _detect_columns(self, vertical_gaps) -> int:
        """カラム数を検出"""
        return len(vertical_gaps) + 1 if vertical_gaps else 1

    def _process_main_blocks(self, blocks, page_height, header_boundary, footer_boundary, vertical_gaps, header_blocks=None, footer_blocks=None, style_stats=None) -> str:
        """メインブロックを処理してテキストを生成"""
        if not blocks:
            return ""

        page_width = max(block["bbox"][2] for block in blocks) if blocks else 0
        if page_height is None:
            page_height = max(block["bbox"][3] for block in blocks) if blocks else 0

        logger.debug(f"[PDFProcessor] _process_main_blocks: main_blocks数={len(blocks)}, 受け取った余白数={len(vertical_gaps)}")

        if vertical_gaps:
            return self._process_multicolumn_blocks(blocks, page_height, header_boundary, footer_boundary, vertical_gaps, style_stats)
        else:
            column_right_edge = page_width
            if style_stats:
                text = process_blocks_to_text_with_style(blocks, style_stats, column_right_edge=column_right_edge)
            else:
                text = process_blocks_to_text(blocks, column_right_edge=column_right_edge)
            return f"---\n\n{text}" if text else ""

    def _process_multicolumn_blocks(self, blocks, page_height, header_boundary, footer_boundary, vertical_gaps, style_stats=None) -> str:
        """マルチカラムのブロックを処理"""
        if not blocks:
            return ""

        page_width = max(block["bbox"][2] for block in blocks) if blocks else 0
        main_blocks = blocks

        if not vertical_gaps:
            text = process_blocks_to_text(blocks)
            return f"【カラム1】\n{text}" if text else ""

        columns = calculate_columns_from_gaps(vertical_gaps, main_blocks, page_width, header_boundary, footer_boundary)
        column_blocks_list = assign_blocks_to_column_regions(main_blocks, columns, vertical_gaps)

        column_texts = []
        for i, column_blocks in enumerate(column_blocks_list):
            if column_blocks:
                logger.debug(f"[PDFProcessor] カラム{i+1}のブロック数: {len(column_blocks)}")
                if len(column_blocks) > 0:
                    for j, block in enumerate(column_blocks[:3]):
                        text = extract_block_text(block)
                        logger.debug(f"  最初のブロック{j}: Y={block['bbox'][1]:.1f}, text='{text[:20]}'")

                    if len(column_blocks) > 6:
                        logger.debug("  ...")
                        for j, block in enumerate(column_blocks[-3:], len(column_blocks)-3):
                            text = extract_block_text(block)
                            logger.debug(f"  最後のブロック{j}: Y={block['bbox'][1]:.1f}, text='{text[:20]}'")

                column_right_edge = columns[i]['x'] + columns[i]['width'] if i < len(columns) else None

                if style_stats:
                    column_text = process_blocks_to_text_with_style(column_blocks, style_stats, already_sorted=True, column_right_edge=column_right_edge)
                else:
                    column_text = process_blocks_to_text(column_blocks, already_sorted=True, column_right_edge=column_right_edge)
                if column_text:
                    column_texts.append((i + 1, column_text))

        if len(column_texts) == 0:
            return ""
        else:
            texts = [text for _, text in column_texts]
            if len(texts) == 1:
                return f"---\n\n{texts[0]}"
            else:
                return "---\n\n" + "\n\n---\n\n".join(texts)

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

        if avg_size > 14:
            return True

        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if "bold" in span.get("font", "").lower():
                    return True

        heading_patterns = [
            r'^\d+\.',
            r'^第\s*\d+\s*[章節]',
            r'^[一二三四五六七八九十]+、',
        ]

        for pattern in heading_patterns:
            if re.match(pattern, text.strip()):
                return True

        return False

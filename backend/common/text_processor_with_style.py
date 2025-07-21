"""スタイル付きテキスト処理モジュール"""

from typing import List, Dict, Optional
from .text_extractor import extract_block_text
from .text_style_analyzer import classify_text_style, format_text_with_style
import logging

logger = logging.getLogger(__name__)


def process_blocks_to_text_with_style(
    blocks: List[Dict], 
    style_stats: Optional[Dict[str, float]] = None,
    paragraph_threshold: float = 20, 
    already_sorted: bool = False,
    column_right_edge: float = None
) -> str:
    """
    ブロックをY座標でソートし、段落を検出して結合（スタイル付き）
    
    Args:
        blocks: テキストブロックのリスト
        style_stats: analyze_text_stylesで計算した基準値
        paragraph_threshold: 段落間の閾値（デフォルト: 20）
        already_sorted: すでにソート済みの場合True（カラム処理後など）
        column_right_edge: カラムの右端X座標
    
    Returns:
        処理済みテキスト（スタイル適用済み）
    """
    if not blocks:
        return ""
    
    # スタイル統計がない場合は通常の処理
    if not style_stats:
        from .text_processor import process_blocks_to_text
        return process_blocks_to_text(blocks, paragraph_threshold, already_sorted, column_right_edge)
    
    # Y座標でソート（すでにソート済みの場合はスキップ）
    if already_sorted:
        sorted_blocks = blocks
    else:
        sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])
    
    # 段落の検出と結合
    paragraphs = []
    current_paragraph = []
    last_y = None
    
    for block in sorted_blocks:
        y_pos = block["bbox"][1]
        
        if last_y is not None and y_pos - last_y > paragraph_threshold:
            # 新しい段落
            if current_paragraph:
                paragraphs.append(merge_paragraph_blocks_with_style(current_paragraph, style_stats, column_right_edge))
            current_paragraph = [block]
        else:
            current_paragraph.append(block)
        
        last_y = block["bbox"][3]  # 下端のY座標
    
    # 最後の段落を追加
    if current_paragraph:
        paragraphs.append(merge_paragraph_blocks_with_style(current_paragraph, style_stats, column_right_edge))
    
    return "\n\n".join(paragraphs)


def merge_paragraph_blocks_with_style(blocks: List[Dict], style_stats: Dict[str, float], column_right_edge: float = None) -> str:
    """
    同じ段落のブロックを結合（スタイル付き）
    
    Args:
        blocks: 同じ段落に属するブロックのリスト
        style_stats: スタイル統計情報
        column_right_edge: カラムの右端X座標
    
    Returns:
        結合されたテキスト
    """
    if column_right_edge is not None:
        # スマート改行処理を使用
        from .line_break_handler import merge_blocks_with_smart_breaks
        # 各ブロックにスタイルを適用してから結合
        styled_blocks = []
        for block in blocks:
            style = classify_text_style(block, style_stats)
            text = extract_block_text(block)
            if text:
                formatted_text = format_text_with_style(text, style)
                # フォーマット済みテキストをブロックに設定
                styled_block = block.copy()
                styled_block['styled_text'] = formatted_text
                styled_blocks.append(styled_block)
        
        # スマート改行処理（styled_textを使用）
        result_parts = []
        for i, block in enumerate(styled_blocks):
            text = block.get('styled_text', '')
            if not text:
                continue
            
            # 最後のブロック以外で右端判定
            if i < len(styled_blocks) - 1:
                from .line_break_handler import should_break_line
                if should_break_line(block, column_right_edge):
                    result_parts.append(text)
                    result_parts.append("\n")
                else:
                    result_parts.append(text)
                    # 日本語の場合はスペースを入れない
                    if not text.endswith("。") and not text.endswith("、"):
                        result_parts.append("")  # スペースなしで接続
            else:
                # 最後のブロック
                result_parts.append(text)
        
        return "".join(result_parts)
    else:
        # 従来の処理
        lines = []
        
        for block in blocks:
            # スタイルを分類
            style = classify_text_style(block, style_stats)
            
            # テキストを抽出
            text = extract_block_text(block)
            if text:
                # スタイルを適用
                formatted_text = format_text_with_style(text, style)
                lines.append(formatted_text)
        
        # ブロックごとに改行で結合
        return "\n".join(lines)
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
    already_sorted: bool = False
) -> str:
    """
    ブロックをY座標でソートし、段落を検出して結合（スタイル付き）
    
    Args:
        blocks: テキストブロックのリスト
        style_stats: analyze_text_stylesで計算した基準値
        paragraph_threshold: 段落間の閾値（デフォルト: 20）
        already_sorted: すでにソート済みの場合True（カラム処理後など）
    
    Returns:
        処理済みテキスト（スタイル適用済み）
    """
    if not blocks:
        return ""
    
    # スタイル統計がない場合は通常の処理
    if not style_stats:
        from .text_processor import process_blocks_to_text
        return process_blocks_to_text(blocks, paragraph_threshold, already_sorted)
    
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
                paragraphs.append(merge_paragraph_blocks_with_style(current_paragraph, style_stats))
            current_paragraph = [block]
        else:
            current_paragraph.append(block)
        
        last_y = block["bbox"][3]  # 下端のY座標
    
    # 最後の段落を追加
    if current_paragraph:
        paragraphs.append(merge_paragraph_blocks_with_style(current_paragraph, style_stats))
    
    return "\n\n".join(paragraphs)


def merge_paragraph_blocks_with_style(blocks: List[Dict], style_stats: Dict[str, float]) -> str:
    """
    同じ段落のブロックを結合（スタイル付き）
    
    Args:
        blocks: 同じ段落に属するブロックのリスト
        style_stats: スタイル統計情報
    
    Returns:
        結合されたテキスト
    """
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
"""テキスト処理モジュール"""

from typing import List, Dict
from .text_extractor import extract_block_text, contains_japanese


def process_blocks_to_text(blocks: List[Dict], paragraph_threshold: float = 20) -> str:
    """
    ブロックをY座標でソートし、段落を検出して結合
    
    Args:
        blocks: テキストブロックのリスト
        paragraph_threshold: 段落間の閾値（デフォルト: 20）
    
    Returns:
        処理済みテキスト
    """
    if not blocks:
        return ""
    
    # Y座標でソート
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
                paragraphs.append(merge_paragraph_blocks(current_paragraph))
            current_paragraph = [block]
        else:
            current_paragraph.append(block)
        
        last_y = block["bbox"][3]  # 下端のY座標
    
    # 最後の段落を追加
    if current_paragraph:
        paragraphs.append(merge_paragraph_blocks(current_paragraph))
    
    return "\n\n".join(paragraphs)


def merge_paragraph_blocks(blocks: List[Dict]) -> str:
    """
    同じ段落のブロックを結合
    
    Args:
        blocks: 同じ段落に属するブロックのリスト
    
    Returns:
        結合されたテキスト
    """
    # X座標でソート（左から右へ）
    sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][0])
    
    lines = []
    for block in sorted_blocks:
        text = extract_block_text(block)
        if text:
            lines.append(text)
    
    # 日本語の場合は改行を除去して結合
    text = " ".join(lines)
    if contains_japanese(text):
        text = text.replace("\n", "")
    
    return text
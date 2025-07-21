"""テキスト処理モジュール"""

from typing import List, Dict
from .text_extractor import extract_block_text, contains_japanese


def process_blocks_to_text(blocks: List[Dict], paragraph_threshold: float = 20, already_sorted: bool = False) -> str:
    """
    ブロックをY座標でソートし、段落を検出して結合
    
    Args:
        blocks: テキストブロックのリスト
        paragraph_threshold: 段落間の閾値（デフォルト: 20）
        already_sorted: すでにソート済みの場合True（カラム処理後など）
    
    Returns:
        処理済みテキスト
    """
    if not blocks:
        return ""
    
    # デバッグログ追加
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[text_processor] process_blocks_to_text: 受け取ったブロック数={len(blocks)}")
    if blocks:
        # 最初の3ブロックのテキストを表示
        for i, block in enumerate(blocks[:3]):
            text = extract_block_text(block)
            logger.info(f"  ブロック{i}: Y={block['bbox'][1]:.1f}, text='{text[:20]}'")
    
    # Y座標でソート（すでにソート済みの場合はスキップ）
    if already_sorted:
        sorted_blocks = blocks
        logger.info(f"[text_processor] already_sorted=True, ソートをスキップ")
    else:
        sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])
    
    # 段落の検出と結合
    paragraphs = []
    current_paragraph = []
    last_y = None
    
    logger.info(f"[text_processor] 段落検出開始: ブロック数={len(sorted_blocks)}, paragraph_threshold={paragraph_threshold}")
    
    for idx, block in enumerate(sorted_blocks):
        y_pos = block["bbox"][1]
        text = extract_block_text(block)
        
        if last_y is not None and y_pos - last_y > paragraph_threshold:
            # 新しい段落
            logger.info(f"[text_processor] 新段落検出: idx={idx}, Y差={y_pos - last_y:.1f} > {paragraph_threshold}")
            if current_paragraph:
                logger.info(f"[text_processor] 段落{len(paragraphs)}を結合: ブロック数={len(current_paragraph)}")
                paragraphs.append(merge_paragraph_blocks(current_paragraph))
            current_paragraph = [block]
        else:
            current_paragraph.append(block)
        
        last_y = block["bbox"][3]  # 下端のY座標
    
    # 最後の段落を追加
    if current_paragraph:
        logger.info(f"[text_processor] 最終段落を結合: ブロック数={len(current_paragraph)}")
        paragraphs.append(merge_paragraph_blocks(current_paragraph))
    
    logger.info(f"[text_processor] 段落結合完了: 段落数={len(paragraphs)}")
    for i, para in enumerate(paragraphs):
        logger.info(f"  段落{i}: 最初の30文字='{para[:30]}...'")
    
    return "\n\n".join(paragraphs)


def merge_paragraph_blocks(blocks: List[Dict]) -> str:
    """
    同じ段落のブロックを結合
    
    Args:
        blocks: 同じ段落に属するブロックのリスト
    
    Returns:
        結合されたテキスト
    """
    # すでにY座標でソートされているため、順序を保持
    # （カラム処理後のブロックは既に適切な順序になっている）
    lines = []
    for block in blocks:
        text = extract_block_text(block)
        if text:
            lines.append(text)
    
    # ブロックごとに改行で結合
    text = "\n".join(lines)
    
    return text
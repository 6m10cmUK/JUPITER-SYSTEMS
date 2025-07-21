"""改行処理モジュール"""

from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def should_break_line(block: Dict, column_right_edge: Optional[float] = None, threshold: float = 20.0) -> bool:
    """
    ブロックの後に改行を入れるべきか判定
    
    Args:
        block: テキストブロック
        column_right_edge: カラムの右端X座標（Noneの場合は常に改行）
        threshold: 右端との距離の閾値（この距離以内なら右端到達とみなす）
    
    Returns:
        True: 改行する、False: 改行しない（スペースで接続）
    """
    if column_right_edge is None:
        return True
    
    # ブロックの右端
    block_right = block["bbox"][2]
    
    # 右端との距離
    distance_to_edge = column_right_edge - block_right
    
    # 閾値以内なら右端到達とみなし、改行しない
    if distance_to_edge <= threshold:
        logger.debug(f"[line_break_handler] 右端到達: distance={distance_to_edge:.1f} <= {threshold}")
        return False
    else:
        logger.debug(f"[line_break_handler] 右端未到達: distance={distance_to_edge:.1f} > {threshold}")
        return True


def merge_blocks_with_smart_breaks(blocks: List[Dict], column_right_edge: Optional[float] = None) -> str:
    """
    ブロックを右端判定付きで結合
    
    Args:
        blocks: テキストブロックのリスト
        column_right_edge: カラムの右端X座標
    
    Returns:
        結合されたテキスト
    """
    if not blocks:
        return ""
    
    from .text_extractor import extract_block_text
    
    result_parts = []
    
    for i, block in enumerate(blocks):
        text = extract_block_text(block)
        if not text:
            continue
        
        # 最後のブロック以外で右端判定
        if i < len(blocks) - 1:
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
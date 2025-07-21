"""ブロックのカラム割り当てモジュール"""

from typing import List, Dict, Tuple

try:
    from .text_extractor import extract_block_text
except ImportError:
    # フォールバック
    def extract_block_text(block):
        if "lines" in block:
            text = ""
            for line in block["lines"]:
                for span in line.get("spans", []):
                    text += span.get("text", "")
            return text
        return ""


def assign_blocks_to_columns(
    blocks: List[Dict],
    column_regions: List[Tuple[float, float]],
    overlap_threshold: float = 0.5
) -> List[List[Dict]]:
    """
    ブロックを適切なカラムに割り当て
    
    Args:
        blocks: テキストブロックのリスト
        column_regions: カラム領域のリスト。各領域は (left, right) のタプル
        overlap_threshold: カラムに割り当てるための最小オーバーラップ率（デフォルト: 0.5）
    
    Returns:
        カラムごとのブロックリスト
    """
    columns = [[] for _ in range(len(column_regions))]
    
    for block in blocks:
        block_left = block["bbox"][0]
        block_right = block["bbox"][2]
        
        # どのカラムに属するか判定（ブロックの大部分が含まれるカラムに割り当て）
        best_column = -1
        best_overlap = 0
        
        for i, (col_left, col_right) in enumerate(column_regions):
            # オーバーラップ部分を計算
            overlap_left = max(block_left, col_left)
            overlap_right = min(block_right, col_right)
            overlap_width = max(0, overlap_right - overlap_left)
            
            # ブロックの幅
            block_width = block_right - block_left
            
            # オーバーラップ率を計算
            if block_width > 0:
                overlap_ratio = overlap_width / block_width
                if overlap_ratio > best_overlap:
                    best_overlap = overlap_ratio
                    best_column = i
        
        # 最もオーバーラップが大きいカラムに割り当て
        if best_column >= 0 and best_overlap >= overlap_threshold:
            columns[best_column].append(block)
    
    # 各カラムをY座標でソート
    for column_blocks in columns:
        column_blocks.sort(key=lambda b: b["bbox"][1])
    
    # 空のカラムを除去せず、すべてのカラムを返す（analyze_layoutでの対応関係を保持するため）
    return columns


def assign_blocks_to_column_regions(
    blocks: List[Dict],
    column_regions: List[Dict],
    vertical_gaps: List[Dict] = None,
    overlap_threshold: float = 0.5
) -> List[List[Dict]]:
    """
    ブロックをカラム領域（辞書形式）に割り当て
    
    Args:
        blocks: テキストブロックのリスト
        column_regions: カラム領域のリスト。各領域は {x, width, y, height} を持つ辞書
        vertical_gaps: 縦の余白領域のリスト。各領域は {x, width, y, height} を持つ辞書
        overlap_threshold: カラムに割り当てるための最小オーバーラップ率（デフォルト: 0.5）
    
    Returns:
        カラムごとのブロックリスト
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[column_assigner] assign_blocks_to_column_regions: blocks={len(blocks)}, columns={len(column_regions)}, vertical_gaps={len(vertical_gaps) if vertical_gaps else 0}")
    for i, col in enumerate(column_regions):
        logger.info(f"[column_assigner] カラム{i}: x={col['x']:.2f}, width={col['width']:.2f}")
    if vertical_gaps:
        for i, gap in enumerate(vertical_gaps):
            logger.info(f"[column_assigner] 余白{i}: x={gap['x']:.2f}, width={gap['width']:.2f}")
    
    columns = [[] for _ in range(len(column_regions))]
    
    for block_idx, block in enumerate(blocks):
        block_left = block["bbox"][0]
        block_right = block["bbox"][2]
        
        # どのカラムに属するか判定
        best_column = -1
        best_overlap = 0
        
        for i, column in enumerate(column_regions):
            col_left = column["x"]
            col_right = column["x"] + column["width"]
            
            # オーバーラップ部分を計算
            overlap_left = max(block_left, col_left)
            overlap_right = min(block_right, col_right)
            overlap_width = max(0, overlap_right - overlap_left)
            
            # ブロックの幅
            block_width = block_right - block_left
            
            # オーバーラップ率を計算
            if block_width > 0:
                overlap_ratio = overlap_width / block_width
                
                if overlap_ratio > best_overlap:
                    best_overlap = overlap_ratio
                    best_column = i
        
        # 最もオーバーラップが大きいカラムに割り当て
        if best_column >= 0 and best_overlap >= overlap_threshold:
            columns[best_column].append(block)
    
    # 各カラムをY座標でソート
    for column_blocks in columns:
        column_blocks.sort(key=lambda b: b["bbox"][1])
    
    # 空のカラムを除去せず、すべてのカラムを返す（analyze_layoutでの対応関係を保持するため）
    return columns
"""カラム検出と領域計算モジュール"""

from typing import List, Dict, Tuple


def calculate_column_regions(blocks: List[Dict], page_width: float, gap_threshold: float = 50) -> List[Tuple[float, float]]:
    """
    ブロックのX座標分布からカラム領域を計算
    
    Args:
        blocks: テキストブロックのリスト
        page_width: ページ幅
        gap_threshold: カラム間の最小ギャップ（デフォルト: 50）
    
    Returns:
        カラム領域のリスト。各領域は (left, right) のタプル
    """
    if not blocks:
        return [(0, page_width)]
    
    # 全ブロックのX座標範囲を収集
    x_ranges = []
    for block in blocks:
        left = block["bbox"][0]
        right = block["bbox"][2]
        x_ranges.append((left, right))
    
    # 左端でソート
    x_ranges.sort(key=lambda r: r[0])
    
    # カラム間のギャップを検出して領域を統合
    merged_ranges = []
    
    for left, right in x_ranges:
        if not merged_ranges:
            merged_ranges.append([left, right])
        else:
            last_range = merged_ranges[-1]
            # 現在の範囲が最後の範囲とギャップ以内で接続している場合
            if left - last_range[1] < gap_threshold:
                # 範囲を統合
                last_range[1] = max(last_range[1], right)
            else:
                # 新しいカラムとして追加
                merged_ranges.append([left, right])
    
    # タプルに変換して返す
    return [(left, right) for left, right in merged_ranges]


def calculate_columns_from_gaps(
    vertical_gaps: List[Dict],
    blocks: List[Dict],
    page_width: float,
    header_boundary: float,
    footer_boundary: float
) -> List[Dict]:
    """
    余白領域からカラム領域を計算
    
    Args:
        vertical_gaps: 検出された縦の余白領域
        blocks: テキストブロックのリスト（主にX座標範囲の取得用）
        page_width: ページ幅
        header_boundary: ヘッダー境界
        footer_boundary: フッター境界
    
    Returns:
        カラム領域のリスト。各領域は {x, y, width, height} を持つ辞書
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if not vertical_gaps:
        return [{
            "x": 0,
            "y": header_boundary,
            "width": page_width,
            "height": footer_boundary - header_boundary
        }]
    
    # 余白をX座標でソート
    sorted_gaps = sorted(vertical_gaps, key=lambda g: g["x"])
    
    # カラム領域を生成
    columns = []
    last_end = 0
    
    # ブロックの最小・最大X座標を取得（余白領域外も考慮）
    if blocks:
        min_x = min(b["bbox"][0] for b in blocks)
        max_x = max(b["bbox"][2] for b in blocks)
    else:
        min_x = 0
        max_x = page_width
    
    logger.info(f"[column_detector] calculate_columns_from_gaps: 余白数={len(sorted_gaps)}, min_x={min_x:.2f}, max_x={max_x:.2f}")
    for gap in sorted_gaps:
        logger.info(f"[column_detector] 余白: x={gap['x']:.2f}, width={gap['width']:.2f}")
    
    # 最初の余白より前にコンテンツがある場合（左カラム）
    if sorted_gaps and sorted_gaps[0]["x"] > min_x:
        left_width = sorted_gaps[0]["x"] - min_x
        columns.append({
            "x": min_x,
            "y": header_boundary,
            "width": left_width,
            "height": footer_boundary - header_boundary
        })
        logger.info(f"[column_detector] 左カラム: x={min_x:.2f}, width={left_width:.2f} (余白開始={sorted_gaps[0]['x']:.2f})")
    
    # 余白間のカラムを生成
    for i, gap in enumerate(sorted_gaps):
        gap_start = gap["x"]
        gap_end = gap["x"] + gap["width"]
        
        # 次の余白または最大X座標まで
        if i < len(sorted_gaps) - 1:
            next_gap_start = sorted_gaps[i + 1]["x"]
            if gap_end < next_gap_start:
                columns.append({
                    "x": gap_end,
                    "y": header_boundary,
                    "width": next_gap_start - gap_end,
                    "height": footer_boundary - header_boundary
                })
                logger.info(f"[column_detector] 中間カラム: x={gap_end:.2f}, width={next_gap_start - gap_end:.2f}")
        else:
            # 最後の余白の後（右カラム）
            if gap_end < max_x:
                columns.append({
                    "x": gap_end,
                    "y": header_boundary,
                    "width": max_x - gap_end,
                    "height": footer_boundary - header_boundary
                })
                logger.info(f"[column_detector] 右カラム: x={gap_end:.2f}, width={max_x - gap_end:.2f}")
    
    logger.info(f"[column_detector] 計算されたカラム数: {len(columns)}")
    return columns
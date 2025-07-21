"""縦の余白（ギャップ）検出モジュール"""

from typing import List, Dict
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


def detect_vertical_gaps(
    blocks: List[Dict],
    page_width: float,
    header_boundary: float,
    footer_boundary: float,
    min_gap_width: int = 5,
    slice_height: int = 10
) -> List[Dict]:
    """
    縦の余白領域を検出
    
    Args:
        blocks: メインコンテンツ領域のブロックリスト
        page_width: ページ幅
        header_boundary: ヘッダー境界のY座標
        footer_boundary: フッター境界のY座標
        min_gap_width: 余白として認識する最小幅（デフォルト: 5ピクセル）
    
    Returns:
        余白領域のリスト。各余白は {x, width, y, height} を持つ辞書
    """
    vertical_gaps = []
    
    if not blocks:
        return vertical_gaps
    
    # ログ追加
    import logging
    logger = logging.getLogger(__name__)
    
    # X座標の範囲を取得
    min_x = min(b["bbox"][0] for b in blocks)
    max_x = max(b["bbox"][2] for b in blocks)
    
    logger.info(f"[gap_detector] ブロック数: {len(blocks)}, X範囲: {min_x:.2f} - {max_x:.2f}")
    logger.info(f"[gap_detector] ヘッダー境界: {header_boundary:.2f}, フッター境界: {footer_boundary:.2f}")
    
    # 中間領域のブロックを特定
    middle_blocks = []
    for b in blocks:
        left = b["bbox"][0]
        right = b["bbox"][2]
        # 65から212の間にかかるブロック
        if (65 <= left <= 212) or (65 <= right <= 212) or (left <= 65 and right >= 212):
            width = right - left
            text = extract_block_text(b)[:20] if extract_block_text(b) else "(空)"
            logger.info(f"[gap_detector] 中間領域ブロック: X={left:.2f}-{right:.2f}, 幅={width:.2f}, テキスト='{text}'")
            middle_blocks.append(b)
    
    logger.info(f"[gap_detector] 65-212間のブロック数: {len(middle_blocks)}")
    
    # Y座標ごとにスライスして余白を検出
    gap_candidates = {}  # X座標 -> 余白があるYスライスの数
    
    # Y座標をスライスごとに処理
    for y in range(int(header_boundary), int(footer_boundary), slice_height):
        y_end = min(y + slice_height, footer_boundary)
        
        # このYスライスにかかるブロックを取得
        slice_blocks = []
        for b in blocks:
            block_top = b["bbox"][1]
            block_bottom = b["bbox"][3]
            # ブロックがこのスライスにかかるか
            if block_bottom >= y and block_top <= y_end:
                slice_blocks.append(b)
        
        # このスライスでの余白を検出
        gap_start = None
        for x in range(int(min_x), int(max_x) + 1):
            has_block = False
            for b in slice_blocks:
                if b["bbox"][0] <= x <= b["bbox"][2]:
                    has_block = True
                    break
            
            if not has_block:
                if gap_start is None:
                    gap_start = x
            else:
                if gap_start is not None and x - gap_start >= min_gap_width:
                    # このX範囲に余白があることを記録
                    for gx in range(gap_start, x):
                        gap_candidates[gx] = gap_candidates.get(gx, 0) + 1
                gap_start = None
        
        # スライスの最後まで余白の場合
        if gap_start is not None:
            for gx in range(gap_start, int(max_x) + 1):
                gap_candidates[gx] = gap_candidates.get(gx, 0) + 1
    
    # 連続する余白領域を統合
    total_slices = (footer_boundary - header_boundary) / slice_height
    threshold = total_slices * 0.8  # 80%以上のスライスで余白があれば縦の余白とする
    
    gap_start = None
    for x in sorted(gap_candidates.keys()):
        if gap_candidates[x] >= threshold:
            if gap_start is None:
                gap_start = x
        else:
            if gap_start is not None and x - gap_start >= min_gap_width:
                logger.info(f"[gap_detector] 余白検出: x={gap_start}, width={x - gap_start} ({gap_candidates.get(gap_start, 0)}/{int(total_slices)}スライスで余白)")
                vertical_gaps.append({
                    "x": gap_start,
                    "width": x - gap_start,
                    "y": header_boundary,
                    "height": footer_boundary - header_boundary
                })
            gap_start = None
    
    # 最後の余白チェック
    if gap_start is not None:
        width = max_x - gap_start
        if width >= min_gap_width:
            logger.info(f"[gap_detector] 余白検出: x={gap_start}, width={width}")
            vertical_gaps.append({
                "x": gap_start,
                "width": width,
                "y": header_boundary,
                "height": footer_boundary - header_boundary
            })
    
    return vertical_gaps
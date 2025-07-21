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
    min_gap_width: int = 1,
    slice_height: int = 10
) -> List[Dict]:
    """
    縦の余白領域を検出（1ピクセル単位で完全空白チェック）
    
    Args:
        blocks: メインコンテンツ領域のブロックリスト
        page_width: ページ幅
        header_boundary: ヘッダー境界のY座標
        footer_boundary: フッター境界のY座標
        min_gap_width: 余白として認識する最小幅（デフォルト: 30ピクセル）
    
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
    
    # 全ブロックのX座標範囲を詳細に記録
    logger.info("[gap_detector] === 全ブロックのX座標範囲 ===")
    sorted_blocks = sorted(blocks, key=lambda b: (b["bbox"][1], b["bbox"][0]))  # Y座標、X座標でソート
    for i, b in enumerate(sorted_blocks[:10]):  # 最初の10ブロック
        text = extract_block_text(b)[:30] if extract_block_text(b) else "(空)"
        logger.info(f"  ブロック{i}: X={b['bbox'][0]:.1f}-{b['bbox'][2]:.1f} (幅={b['bbox'][2]-b['bbox'][0]:.1f}), Y={b['bbox'][1]:.1f}, テキスト='{text}'")
    
    # X座標でソートして左右端のブロックを確認
    blocks_by_left = sorted(blocks, key=lambda b: b["bbox"][0])
    blocks_by_right = sorted(blocks, key=lambda b: b["bbox"][2])
    
    logger.info("[gap_detector] === 最も左のブロック ===")
    for b in blocks_by_left[:3]:
        text = extract_block_text(b)[:30] if extract_block_text(b) else "(空)"
        logger.info(f"  X={b['bbox'][0]:.1f}-{b['bbox'][2]:.1f}, テキスト='{text}'")
    
    logger.info("[gap_detector] === 最も右のブロック ===")  
    for b in blocks_by_right[-3:]:
        text = extract_block_text(b)[:30] if extract_block_text(b) else "(空)"
        logger.info(f"  X={b['bbox'][0]:.1f}-{b['bbox'][2]:.1f}, テキスト='{text}'")
    
    # 1ピクセル単位で完全に空白の縦列を検出
    logger.info("[gap_detector] === 1ピクセル単位の完全空白検出 ===")
    
    # 各X座標について、縦方向に完全に空白かチェック
    gap_columns = []  # 完全に空白のX座標のリスト
    
    # ページ上部の追加マージン（中央配置ヘッダー対策）
    additional_header_margin = 30  # ページ上部30ptまでは余白検出から除外
    
    for x in range(int(min_x), int(max_x) + 1):
        is_empty_column = True
        
        # このX座標を通るブロックがあるかチェック
        for b in blocks:
            block_left = b["bbox"][0]
            block_right = b["bbox"][2]
            block_top = b["bbox"][1]
            
            # ページ上部の追加マージン内のブロックは無視
            if block_top < additional_header_margin:
                continue
            
            # このX座標がブロック内にあるか（小数点の誤差を考慮）
            if block_left - 0.5 <= x <= block_right + 0.5:
                is_empty_column = False
                break
        
        if is_empty_column:
            gap_columns.append(x)
    
    # 連続する空白列を余白領域としてまとめる
    if gap_columns:
        logger.info(f"[gap_detector] 完全空白列の数: {len(gap_columns)}")
        
        # デバッグ：空白列の詳細を表示
        logger.info(f"[gap_detector] 空白列のX座標: {gap_columns[:20]}...")  # 最初の20個
        
        # デバッグ：最初の空白列の範囲を表示
        gap_start = None
        gap_ranges = []
        
        for x in gap_columns:
            if gap_start is None:
                gap_start = x
            elif x - gap_columns[gap_columns.index(x) - 1] > 1:
                # 連続が途切れた
                gap_width = gap_columns[gap_columns.index(x) - 1] - gap_start + 1
                if gap_width >= min_gap_width:
                    gap_ranges.append((gap_start, gap_width))
                gap_start = x
        
        # 最後の範囲
        if gap_start is not None:
            gap_width = gap_columns[-1] - gap_start + 1
            if gap_width >= min_gap_width:
                gap_ranges.append((gap_start, gap_width))
        
        # 最初の5つの余白範囲をログに出力
        logger.info(f"[gap_detector] 検出された余白範囲の数: {len(gap_ranges)}")
        for i, (start, width) in enumerate(gap_ranges[:5]):
            logger.info(f"  余白範囲{i+1}: X={start}-{start+width-1} (幅={width}px)")
    else:
        logger.info(f"[gap_detector] 完全空白列が見つかりませんでした")
    
    # 連続する空白列を余白として記録
    gap_start = None
    prev_x = None
    
    for x in gap_columns:
        if gap_start is None:
            gap_start = x
            prev_x = x
        elif x - prev_x > 1:
            # 連続が途切れた
            gap_width = prev_x - gap_start + 1
            if gap_width >= min_gap_width:
                logger.info(f"[gap_detector] 余白検出: x={gap_start}, width={gap_width}")
                vertical_gaps.append({
                    "x": gap_start,
                    "width": gap_width,
                    "y": header_boundary,
                    "height": footer_boundary - header_boundary
                })
            gap_start = x
        prev_x = x
    
    # 最後の余白チェック
    if gap_start is not None:
        gap_width = prev_x - gap_start + 1
        if gap_width >= min_gap_width:
            logger.info(f"[gap_detector] 余白検出: x={gap_start}, width={gap_width}")
            vertical_gaps.append({
                "x": gap_start,
                "width": gap_width,
                "y": header_boundary,
                "height": footer_boundary - header_boundary
            })
    
    return vertical_gaps
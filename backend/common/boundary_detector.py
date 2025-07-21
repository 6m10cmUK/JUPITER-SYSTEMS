"""ヘッダー・フッター境界検出モジュール"""

from typing import List, Dict, Tuple


def detect_header_footer_boundaries(blocks: List[Dict], page_height: float) -> Tuple[float, float]:
    """
    位置のみに基づいてヘッダー・フッター境界を検出
    
    Args:
        blocks: テキストブロックのリスト。各ブロックは"bbox"キーを持つ辞書
        page_height: ページの高さ
    
    Returns:
        (header_boundary, footer_boundary): ヘッダー境界とフッター境界のY座標
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # デフォルト：ヘッダー・フッターなし
    header_threshold = 0
    footer_threshold = page_height
    
    if not blocks:
        return header_threshold, footer_threshold
    
    # Y座標でソート
    sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])
    
    # ページの実際の内容領域を確認
    content_top = sorted_blocks[0]["bbox"][1] if sorted_blocks else 0
    content_bottom = sorted_blocks[-1]["bbox"][3] if sorted_blocks else page_height
    
    # ヘッダー候補：ページ上部8%以内かつ50ポイント以内のブロック
    header_limit = min(page_height * 0.08, 50)
    # 上から順に見て、大きな間隔が開くまでをヘッダーとする
    header_candidates = []
    prev_bottom = 0
    for b in sorted_blocks:
        if b["bbox"][1] > header_limit:
            break
        # 前のブロックとの間隔が15ポイント以上開いたら終了
        if header_candidates and b["bbox"][1] - prev_bottom > 15:
            break
        # 2つ以上のブロックは含めない（通常ヘッダーは1行）
        if len(header_candidates) >= 1:
            break
        header_candidates.append(b)
        prev_bottom = b["bbox"][3]
    
    # フッター候補：ページ下部10%以内かつ下から60ポイント以内のブロック
    footer_limit = max(page_height * 0.9, page_height - 60)
    footer_candidates = [b for b in sorted_blocks if b["bbox"][3] > footer_limit]
    
    # ヘッダー境界の決定
    if header_candidates:
        # ヘッダー候補の最下端 + マージン
        header_bottom = max(b["bbox"][3] for b in header_candidates)
        # 次のブロックとの間隔を考慮
        non_header_blocks = [b for b in sorted_blocks if b not in header_candidates]
        if non_header_blocks:
            next_block_top = non_header_blocks[0]["bbox"][1]
            # ヘッダーと本文の中間点を境界とする
            header_threshold = (header_bottom + next_block_top) / 2
        else:
            header_threshold = header_bottom + 10
    
    # フッター境界の決定
    if footer_candidates:
        # フッター候補の最上端 - マージン
        footer_top = min(b["bbox"][1] for b in footer_candidates)
        # 前のブロックとの間隔を考慮
        non_footer_blocks = [b for b in sorted_blocks if b not in footer_candidates]
        if non_footer_blocks:
            prev_block_bottom = non_footer_blocks[-1]["bbox"][3]
            # 本文とフッターの中間点を境界とする
            footer_threshold = (prev_block_bottom + footer_top) / 2
        else:
            footer_threshold = footer_top - 10
    
    logger.info(f"[boundary_detector] ページ高さ: {page_height:.2f}, ヘッダー境界: {header_threshold:.2f}, フッター境界: {footer_threshold:.2f}")
    
    return header_threshold, footer_threshold
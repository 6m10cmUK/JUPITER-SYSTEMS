"""テキスト処理モジュール"""

import logging
from typing import List, Dict, Optional
from .text_extractor import extract_block_text, contains_japanese

logger = logging.getLogger(__name__)


def process_blocks_to_text(
    blocks: List[Dict],
    paragraph_threshold: float = 20,
    already_sorted: bool = False,
    column_right_edge: Optional[float] = None,
) -> str:
    if not blocks:
        return ""

    logger.debug(f"[text_processor] process_blocks_to_text: 受け取ったブロック数={len(blocks)}")
    for i, block in enumerate(blocks[:3]):
        text = extract_block_text(block)
        logger.debug(f"  ブロック{i}: Y={block['bbox'][1]:.1f}, text='{text[:20]}'")

    sorted_blocks = blocks if already_sorted else sorted(blocks, key=lambda b: b["bbox"][1])
    if already_sorted:
        logger.debug("[text_processor] already_sorted=True, ソートをスキップ")

    logger.debug(f"[text_processor] 段落検出開始: ブロック数={len(sorted_blocks)}, paragraph_threshold={paragraph_threshold}")

    paragraphs: List[str] = []
    current_paragraph: List[Dict] = []
    last_y: Optional[float] = None

    for idx, block in enumerate(sorted_blocks):
        y_pos = block["bbox"][1]

        if last_y is not None and y_pos - last_y > paragraph_threshold:
            logger.debug(f"[text_processor] 新段落検出: idx={idx}, Y差={y_pos - last_y:.1f} > {paragraph_threshold}")
            if current_paragraph:
                logger.debug(f"[text_processor] 段落{len(paragraphs)}を結合: ブロック数={len(current_paragraph)}")
                paragraphs.append(merge_paragraph_blocks(current_paragraph, column_right_edge))
            current_paragraph = [block]
        else:
            current_paragraph.append(block)

        last_y = block["bbox"][3]

    if current_paragraph:
        logger.debug(f"[text_processor] 最終段落を結合: ブロック数={len(current_paragraph)}")
        paragraphs.append(merge_paragraph_blocks(current_paragraph, column_right_edge))

    logger.debug(f"[text_processor] 段落結合完了: 段落数={len(paragraphs)}")
    for i, para in enumerate(paragraphs):
        logger.debug(f"  段落{i}: 最初の30文字='{para[:30]}...'")

    return "\n\n".join(paragraphs)


def merge_paragraph_blocks(blocks: List[Dict], column_right_edge: Optional[float] = None) -> str:
    if column_right_edge is not None:
        from .line_break_handler import merge_blocks_with_smart_breaks
        return merge_blocks_with_smart_breaks(blocks, column_right_edge)

    lines = [text for block in blocks if (text := extract_block_text(block))]
    return "\n".join(lines)

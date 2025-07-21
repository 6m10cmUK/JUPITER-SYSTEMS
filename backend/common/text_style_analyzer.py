"""テキストスタイル解析モジュール"""

from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def analyze_text_styles(blocks: List[Dict]) -> Dict[str, float]:
    """
    全ブロックのテキストスタイルを解析し、基準値を計算
    
    Returns:
        {
            "avg_font_size": 平均フォントサイズ,
            "median_font_size": 中央値フォントサイズ,
            "common_font_size": 最頻値フォントサイズ
        }
    """
    all_sizes = []
    
    for block in blocks:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                size = span.get("size", 0)
                if size > 0:
                    # テキストの長さで重み付け
                    text_length = len(span.get("text", ""))
                    all_sizes.extend([size] * text_length)
    
    if not all_sizes:
        return {
            "avg_font_size": 12.0,
            "median_font_size": 12.0,
            "common_font_size": 12.0
        }
    
    # 統計値を計算
    avg_size = sum(all_sizes) / len(all_sizes)
    sorted_sizes = sorted(all_sizes)
    median_size = sorted_sizes[len(sorted_sizes) // 2]
    
    # 最頻値（モード）を計算
    size_counts = {}
    for size in all_sizes:
        size_counts[size] = size_counts.get(size, 0) + 1
    common_size = max(size_counts.items(), key=lambda x: x[1])[0]
    
    logger.info(f"[text_style_analyzer] フォントサイズ統計: 平均={avg_size:.1f}, 中央値={median_size:.1f}, 最頻値={common_size:.1f}")
    
    return {
        "avg_font_size": avg_size,
        "median_font_size": median_size,
        "common_font_size": common_size
    }


def classify_text_style(block: Dict, base_stats: Dict[str, float]) -> Dict[str, str]:
    """
    ブロックのテキストスタイルを分類
    
    Args:
        block: テキストブロック
        base_stats: analyze_text_stylesで計算した基準値
    
    Returns:
        {
            "size": "large" | "normal" | "small",
            "weight": "bold" | "normal",
            "style": "italic" | "normal"
        }
    """
    # 基準サイズ（最頻値を使用）
    base_size = base_stats.get("common_font_size", 12.0)
    
    # ブロックの平均サイズを計算
    sizes = []
    is_bold = False
    is_italic = False
    
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            size = span.get("size", base_size)
            sizes.append(size)
            
            # フォント名から太字・斜体を判定
            font_name = span.get("font", "").lower()
            if "bold" in font_name or "heavy" in font_name or "black" in font_name:
                is_bold = True
            if "italic" in font_name or "oblique" in font_name:
                is_italic = True
            
            # フラグからも判定
            flags = span.get("flags", 0)
            if flags & 2**4:  # 太字フラグ
                is_bold = True
            if flags & 2**1:  # 斜体フラグ
                is_italic = True
    
    avg_block_size = sum(sizes) / len(sizes) if sizes else base_size
    
    # サイズ分類（基準の20%以上大きい/小さい）
    size_class = "normal"
    if avg_block_size >= base_size * 1.2:
        size_class = "large"
    elif avg_block_size <= base_size * 0.8:
        size_class = "small"
    
    return {
        "size": size_class,
        "weight": "bold" if is_bold else "normal",
        "style": "italic" if is_italic else "normal"
    }


def format_text_with_style(text: str, style: Dict[str, str]) -> str:
    """
    テキストスタイルに基づいてMarkdown形式でフォーマット
    
    Args:
        text: テキスト
        style: classify_text_styleの戻り値
    
    Returns:
        フォーマット済みテキスト
    """
    formatted = text
    
    # 太字
    if style.get("weight") == "bold":
        formatted = f"**{formatted}**"
    
    # 斜体
    if style.get("style") == "italic":
        formatted = f"*{formatted}*"
    
    # サイズ（HTMLタグを使用）
    if style.get("size") == "large":
        formatted = f"<large>{formatted}</large>"
    elif style.get("size") == "small":
        formatted = f"<small>{formatted}</small>"
    
    return formatted
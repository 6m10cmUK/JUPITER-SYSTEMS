"""テキスト抽出ユーティリティモジュール"""

import re
from typing import Dict


def extract_block_text(block: Dict) -> str:
    """
    ブロックからテキストを抽出
    
    Args:
        block: テキストブロック
    
    Returns:
        抽出されたテキスト
    """
    lines = []
    for line in block.get("lines", []):
        line_text = ""
        for span in line.get("spans", []):
            line_text += span.get("text", "")
        if line_text:
            lines.append(line_text)
    
    return "\n".join(lines)


def contains_japanese(text: str) -> bool:
    """
    テキストが日本語を含むかチェック
    
    Args:
        text: チェック対象のテキスト
    
    Returns:
        日本語を含む場合True
    """
    return bool(re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]', text))
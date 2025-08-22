"""テキスト処理に関する機能"""
import re
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


def apply_text_formatting(
    text: str,
    merge_paragraphs: bool = False,
    normalize_spaces: bool = False,
    fix_hyphenation: bool = False
) -> str:
    """
    テキストに後処理を適用する
    
    Args:
        text: 処理対象のテキスト
        merge_paragraphs: 段落を結合するか
        normalize_spaces: スペースを正規化するか
        fix_hyphenation: ハイフネーションを修正するか
    
    Returns:
        str: 処理後のテキスト
    """
    if not text:
        return text
    
    # ハイフネーションの修正
    if fix_hyphenation:
        # 行末のハイフンと改行を削除（次の行が小文字で始まる場合）
        text = re.sub(r'-\n(?=[a-z])', '', text)
    
    # スペースの正規化
    if normalize_spaces:
        # 複数の空白を1つに
        text = re.sub(r'[ \t]+', ' ', text)
        # 行頭・行末の空白を削除
        lines = text.split('\n')
        lines = [line.strip() for line in lines]
        text = '\n'.join(lines)
    
    # 段落の結合
    if merge_paragraphs:
        # 空行で区切られた段落を保持しつつ、段落内の改行を削除
        paragraphs = re.split(r'\n\s*\n', text)
        merged_paragraphs = []
        
        for para in paragraphs:
            if para.strip():
                # 段落内の改行をスペースに置換
                merged_para = re.sub(r'\n', ' ', para.strip())
                # 複数のスペースを1つに
                merged_para = re.sub(r'[ \t]+', ' ', merged_para)
                merged_paragraphs.append(merged_para)
        
        text = '\n\n'.join(merged_paragraphs)
    
    return text


def is_header_text(text: str, page_num: int) -> bool:
    """
    テキストがヘッダーかどうかを判定
    
    Args:
        text: 判定対象のテキスト
        page_num: ページ番号（1から始まる）
    
    Returns:
        bool: ヘッダーの場合True
    """
    if not text:
        return False
    
    text = text.strip()
    
    # ページ番号パターン
    page_patterns = [
        rf'^{page_num}$',  # 単純なページ番号
        rf'^-\s*{page_num}\s*-$',  # - 1 -
        rf'^Page\s+{page_num}$',  # Page 1
        rf'^ページ\s*{page_num}$',  # ページ 1
        rf'^\d+\s*/\s*\d+$',  # 1/10 形式
    ]
    
    for pattern in page_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return True
    
    # その他のヘッダーパターン
    header_patterns = [
        r'^Chapter\s+\d+',  # Chapter 1
        r'^第\s*\d+\s*章',  # 第1章
        r'^\d+\.\s+\w+',  # 1. Introduction
    ]
    
    for pattern in header_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return True
    
    return False


def is_footer_text(text: str, page_num: int) -> bool:
    """
    テキストがフッターかどうかを判定
    
    Args:
        text: 判定対象のテキスト
        page_num: ページ番号（1から始まる）
    
    Returns:
        bool: フッターの場合True
    """
    if not text:
        return False
    
    text = text.strip()
    
    # フッターもページ番号を含むことが多い
    if is_header_text(text, page_num):
        return True
    
    # フッター特有のパターン
    footer_patterns = [
        r'^Copyright\s*©',  # Copyright
        r'All\s+rights\s+reserved',  # All rights reserved
        r'^\d{4}\s*[-/]\s*\d{1,2}\s*[-/]\s*\d{1,2}',  # 日付
    ]
    
    for pattern in footer_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    
    return False
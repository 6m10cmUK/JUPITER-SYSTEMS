import fitz
from typing import List, Dict, Tuple, Optional
import re

class PDFProcessor:
    """高精度PDF処理クラス"""
    
    def __init__(self):
        self.header_patterns = [
            r'^\d+$',  # ページ番号のみ
            r'^第\s*\d+\s*[章節]',  # 日本語の章番号
            r'^Chapter\s+\d+',  # 英語の章番号
            r'^\d+\.\d+',  # セクション番号
        ]
        
        self.footer_patterns = [
            r'^\d+$',  # ページ番号
            r'^-\s*\d+\s*-$',  # - 1 - 形式
            r'Page\s+\d+',  # Page番号
            r'©.*\d{4}',  # コピーライト
        ]
    
    def extract_text_with_structure(self, page) -> Dict:
        """構造を保持したテキスト抽出"""
        blocks = page.get_text("dict")
        page_height = page.rect.height
        
        # ヘッダー・フッター領域の判定
        header_threshold = page_height * 0.1  # 上部10%
        footer_threshold = page_height * 0.9  # 下部10%
        
        main_blocks = []
        headers = []
        footers = []
        
        for block in blocks["blocks"]:
            if block["type"] != 0:  # テキストブロックのみ
                continue
                
            y_pos = block["bbox"][1]
            block_text = self._extract_block_text(block)
            
            # 位置による分類
            if y_pos < header_threshold:
                if self._is_header(block_text):
                    headers.append(block)
                else:
                    main_blocks.append(block)
            elif y_pos > footer_threshold:
                if self._is_footer(block_text):
                    footers.append(block)
                else:
                    main_blocks.append(block)
            else:
                main_blocks.append(block)
        
        # メインコンテンツの処理
        structured_text = self._process_main_blocks(main_blocks)
        
        return {
            "main_text": structured_text,
            "headers": [self._extract_block_text(h) for h in headers],
            "footers": [self._extract_block_text(f) for f in footers],
            "has_columns": self._detect_columns(main_blocks) > 1,
            "blocks": self._convert_blocks_to_dict(main_blocks)
        }
    
    def _extract_block_text(self, block) -> str:
        """ブロックからテキストを抽出"""
        lines = []
        for line in block.get("lines", []):
            line_text = ""
            for span in line.get("spans", []):
                line_text += span["text"]
            lines.append(line_text)
        return "\n".join(lines)
    
    def _is_header(self, text: str) -> bool:
        """ヘッダーかどうかを判定"""
        text = text.strip()
        if len(text) > 100:  # 長いテキストはヘッダーではない
            return False
        
        for pattern in self.header_patterns:
            if re.match(pattern, text):
                return True
        return False
    
    def _is_footer(self, text: str) -> bool:
        """フッターかどうかを判定"""
        text = text.strip()
        if len(text) > 100:  # 長いテキストはフッターではない
            return False
        
        for pattern in self.footer_patterns:
            if re.search(pattern, text):
                return True
        return False
    
    def _detect_columns(self, blocks) -> int:
        """カラム数を検出"""
        if not blocks:
            return 1
            
        x_positions = [block["bbox"][0] for block in blocks]
        
        # X座標をクラスタリング
        clusters = []
        threshold = 30  # 30ポイント以内は同じカラム
        
        for x in sorted(set(x_positions)):
            added = False
            for cluster in clusters:
                if abs(x - cluster["center"]) < threshold:
                    cluster["positions"].append(x)
                    cluster["center"] = sum(cluster["positions"]) / len(cluster["positions"])
                    added = True
                    break
            
            if not added:
                clusters.append({"center": x, "positions": [x]})
        
        return len(clusters)
    
    def _process_main_blocks(self, blocks) -> str:
        """メインブロックを処理してテキストを生成"""
        if not blocks:
            return ""
        
        # Y座標でソート
        sorted_blocks = sorted(blocks, key=lambda b: (b["bbox"][1], b["bbox"][0]))
        
        # 段落の検出と結合
        paragraphs = []
        current_paragraph = []
        last_y = None
        paragraph_threshold = 20  # 段落間の閾値
        
        for block in sorted_blocks:
            y_pos = block["bbox"][1]
            
            if last_y is not None and y_pos - last_y > paragraph_threshold:
                # 新しい段落
                if current_paragraph:
                    paragraphs.append(self._merge_paragraph(current_paragraph))
                current_paragraph = [block]
            else:
                current_paragraph.append(block)
            
            last_y = y_pos + block["bbox"][3] - block["bbox"][1]  # 下端のY座標
        
        # 最後の段落を追加
        if current_paragraph:
            paragraphs.append(self._merge_paragraph(current_paragraph))
        
        return "\n\n".join(paragraphs)
    
    def _merge_paragraph(self, blocks) -> str:
        """同じ段落のブロックを結合"""
        # X座標でソート（左から右へ）
        sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][0])
        
        lines = []
        for block in sorted_blocks:
            lines.append(self._extract_block_text(block))
        
        # 日本語の場合は改行を除去して結合
        text = " ".join(lines)
        if self._contains_japanese(text):
            text = text.replace("\n", "")
        
        return text
    
    def _contains_japanese(self, text: str) -> bool:
        """日本語を含むかチェック"""
        return bool(re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]', text))
    
    def _convert_blocks_to_dict(self, blocks) -> List[Dict]:
        """ブロック情報を辞書形式に変換"""
        result = []
        for block in blocks:
            block_info = {
                "bbox": block["bbox"],
                "text": self._extract_block_text(block),
                "lines": len(block.get("lines", [])),
                "avg_font_size": self._get_avg_font_size(block),
                "is_heading": self._is_heading(block)
            }
            result.append(block_info)
        return result
    
    def _get_avg_font_size(self, block) -> float:
        """平均フォントサイズを取得"""
        sizes = []
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                sizes.append(span.get("size", 12))
        return sum(sizes) / len(sizes) if sizes else 12
    
    def _is_heading(self, block) -> bool:
        """見出しかどうかを判定"""
        avg_size = self._get_avg_font_size(block)
        text = self._extract_block_text(block)
        
        # フォントサイズが大きい
        if avg_size > 14:
            return True
        
        # 太字
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if "bold" in span.get("font", "").lower():
                    return True
        
        # 見出しパターン
        heading_patterns = [
            r'^\d+\.',  # 1. 形式
            r'^第\s*\d+\s*[章節]',  # 第1章 形式
            r'^[一二三四五六七八九十]+、',  # 一、形式
        ]
        
        for pattern in heading_patterns:
            if re.match(pattern, text.strip()):
                return True
        
        return False
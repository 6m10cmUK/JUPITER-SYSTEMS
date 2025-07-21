import fitz
from typing import List, Dict, Tuple, Optional
import re

class PDFProcessor:
    """高精度PDF処理クラス"""
    
    def __init__(self):
        pass
    
    def extract_text_with_structure(self, page) -> Dict:
        """構造を保持したテキスト抽出"""
        blocks = page.get_text("dict")
        page_height = page.rect.height
        
        # テキストブロックのみを抽出
        text_blocks = [b for b in blocks["blocks"] if b["type"] == 0]
        
        # 位置のみによるヘッダー・フッター境界の検出
        header_threshold = 0  # デフォルト：ヘッダーなし
        footer_threshold = page_height  # デフォルト：フッターなし
        
        if text_blocks:
            # 全てのテキストブロックの境界Y値を収集
            all_bottom_y = [block["bbox"][3] for block in text_blocks]  # 下端Y座標
            all_top_y = [block["bbox"][1] for block in text_blocks]     # 上端Y座標
            
            # ヘッダー境界 = 最も低い下端Y値
            if all_bottom_y:
                header_threshold = min(all_bottom_y)
            
            # フッター境界 = 最も高い上端Y値
            if all_top_y:
                footer_threshold = max(all_top_y)
        
        main_blocks = []
        headers = []
        footers = []
        
        for block in text_blocks:
            y_pos = block["bbox"][1]
            
            # 位置のみによる分類（パターンマッチングなし）
            if y_pos < header_threshold:
                headers.append(block)
            elif y_pos > footer_threshold:
                footers.append(block)
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
        """ヘッダーかどうかを判定（位置ベースで判定するため、ここでは常にFalse）"""
        return False
    
    def _is_footer(self, text: str) -> bool:
        """フッターかどうかを判定（位置ベースで判定するため、ここでは常にFalse）"""
        return False
    
    def _detect_columns(self, blocks) -> int:
        """カラム数を検出"""
        if not blocks:
            return 1
        
        # カラムの境界を検出
        boundaries = self._detect_column_boundaries(blocks, None)
        return len(boundaries)
    
    def _process_main_blocks(self, blocks) -> str:
        """メインブロックを処理してテキストを生成"""
        if not blocks:
            return ""
        
        # 新しいカラム検出ロジックを試す
        page_width = max(block["bbox"][2] for block in blocks) if blocks else 0
        page_height = max(block["bbox"][3] for block in blocks) if blocks else 0
        
        # 全てのテキストブロックの境界Y値を収集
        all_bottom_y = [block["bbox"][3] for block in blocks]  # 下端Y座標
        all_top_y = [block["bbox"][1] for block in blocks]     # 上端Y座標
        
        # ヘッダー境界 = 最も低い下端Y値
        header_boundary = min(all_bottom_y) if all_bottom_y else 0
        
        # フッター境界 = 最も高い上端Y値
        footer_boundary = max(all_top_y) if all_top_y else page_height
        
        # メインコンテンツ領域のブロックを取得（ヘッダー・フッター境界内のブロック）
        main_blocks = []
        for b in blocks:
            block_top = b["bbox"][1]
            block_bottom = b["bbox"][3]
            if block_bottom > header_boundary and block_top < footer_boundary:
                main_blocks.append(b)
        
        # 縦の余白領域を検出
        vertical_gaps = self._detect_vertical_gaps(main_blocks, page_width, header_boundary, footer_boundary)
        
        # 余白が検出されたらマルチカラムとして処理
        if vertical_gaps:
            return self._process_multicolumn_blocks(blocks)
        else:
            # シングルカラムの場合：従来通りの処理
            return self._process_single_column_blocks(blocks)
    
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
    
    def _process_single_column_blocks(self, blocks) -> str:
        """シングルカラムのブロックを処理"""
        # Y座標でソート
        sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])
        
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
            
            last_y = block["bbox"][3]  # 下端のY座標
        
        # 最後の段落を追加
        if current_paragraph:
            paragraphs.append(self._merge_paragraph(current_paragraph))
        
        return "\n\n".join(paragraphs)
    
    def _process_multicolumn_blocks(self, blocks) -> str:
        """マルチカラムのブロックを処理"""
        if not blocks:
            return ""
        
        # ページ幅を推定
        page_width = max(block["bbox"][2] for block in blocks)
        page_height = max(block["bbox"][3] for block in blocks)
        
        # 全てのテキストブロックの境界Y値を収集
        all_bottom_y = [block["bbox"][3] for block in blocks]  # 下端Y座標
        all_top_y = [block["bbox"][1] for block in blocks]     # 上端Y座標
        
        # ヘッダー境界 = 最も低い下端Y値
        header_boundary = min(all_bottom_y) if all_bottom_y else 0
        
        # フッター境界 = 最も高い上端Y値
        footer_boundary = max(all_top_y) if all_top_y else page_height
        
        # メインコンテンツ領域のブロックを取得（ヘッダー・フッター境界内のブロック）
        main_blocks = []
        for b in blocks:
            block_top = b["bbox"][1]
            block_bottom = b["bbox"][3]
            if block_bottom > header_boundary and block_top < footer_boundary:
                main_blocks.append(b)
        
        if not main_blocks:
            return self._process_single_column_blocks(blocks)
        
        # 縦の余白領域を検出
        vertical_gaps = self._detect_vertical_gaps(main_blocks, page_width, header_boundary, footer_boundary)
        
        # 余白がない場合はシングルカラムとして処理
        if not vertical_gaps:
            return self._process_single_column_blocks(blocks)
        
        # カラム領域を計算
        columns = self._calculate_columns_from_gaps(vertical_gaps, main_blocks, page_width, header_boundary, footer_boundary)
        
        # カラムごとにブロックを分類
        column_texts = []
        for column in columns:
            column_blocks = []
            for b in main_blocks:
                block_left = b["bbox"][0]
                block_right = b["bbox"][2]
                # ブロックの大部分がこのカラム内にある場合
                if (block_left >= column["x"] and block_right <= column["x"] + column["width"]) or \
                   (block_left < column["x"] + column["width"] and block_right > column["x"] and \
                    min(block_right, column["x"] + column["width"]) - max(block_left, column["x"]) > (block_right - block_left) * 0.5):
                    column_blocks.append(b)
            
            # このカラムのテキストを処理
            if column_blocks:
                column_text = self._process_single_column_blocks(column_blocks)
                if column_text:
                    column_texts.append(column_text)
        
        # カラムテキストを結合（カラムラベル付き）
        if len(column_texts) == 0:
            return ""
        elif len(column_texts) == 1:
            return column_texts[0]
        else:
            labeled_texts = []
            for i, text in enumerate(column_texts):
                labeled_texts.append(f"【カラム{i+1}】\n{text}")
            return "\n\n".join(labeled_texts)
    
    def _classify_blocks_by_column(self, blocks) -> List[List]:
        """ブロックをカラムごとに分類"""
        if not blocks:
            return []
        
        # ページ幅を推定（全ブロックの最大右端）
        page_width = max(block["bbox"][2] for block in blocks)
        
        # X座標の範囲でカラムを検出
        column_boundaries = self._detect_column_boundaries(blocks, page_width)
        
        # 各カラムにブロックを割り当て
        columns = [[] for _ in range(len(column_boundaries))]
        
        for block in blocks:
            block_left = block["bbox"][0]
            block_right = block["bbox"][2]
            
            # どのカラムに属するか判定（ブロックの大部分が含まれるカラムに割り当て）
            best_column = -1
            best_overlap = 0
            
            for i, (col_left, col_right) in enumerate(column_boundaries):
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
            if best_column >= 0 and best_overlap > 0.5:  # 50%以上のオーバーラップが必要
                columns[best_column].append(block)
        
        # 空のカラムを除去
        return [col for col in columns if col]
    
    def _detect_column_boundaries(self, blocks, page_width) -> List[Tuple[float, float]]:
        """カラムの境界を検出"""
        if not blocks:
            return [(0, page_width)] if page_width else [(0, 1000)]
        
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
        gap_threshold = 50  # カラム間の最小ギャップ
        
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
    
    def _detect_vertical_gaps(self, blocks, page_width, header_boundary, footer_boundary) -> List[Dict]:
        """縦の余白領域を検出"""
        vertical_gaps = []
        
        if not blocks:
            return vertical_gaps
        
        # X座標の範囲を1ピクセル単位でスキャン
        min_x = min(b["bbox"][0] for b in blocks)
        max_x = max(b["bbox"][2] for b in blocks)
        
        # 各X座標について、そこに存在するブロックがあるかチェック
        gap_start = None
        for x in range(int(min_x), int(max_x) + 1):
            has_block = False
            for b in blocks:
                # このX座標を通るブロックがあるかチェック
                if b["bbox"][0] <= x <= b["bbox"][2]:
                    has_block = True
                    break
            
            if not has_block:
                # 空白領域の開始
                if gap_start is None:
                    gap_start = x
            else:
                # 空白領域の終了
                if gap_start is not None and x - gap_start > 5:  # 5ピクセル以上の幅
                    vertical_gaps.append({
                        "x": gap_start,
                        "width": x - gap_start,
                        "y": header_boundary,
                        "height": footer_boundary - header_boundary
                    })
                gap_start = None
        
        # 最後の余白領域をチェック
        if gap_start is not None and max_x - gap_start > 5:
            vertical_gaps.append({
                "x": gap_start,
                "width": max_x - gap_start,
                "y": header_boundary,
                "height": footer_boundary - header_boundary
            })
        
        return vertical_gaps
    
    def _calculate_columns_from_gaps(self, vertical_gaps, blocks, page_width, header_boundary, footer_boundary) -> List[Dict]:
        """余白領域からカラム領域を計算"""
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
        
        for gap in sorted_gaps:
            gap_start = gap["x"]
            
            # 前の余白の終わりから現在の余白の始まりまでがカラム
            if gap_start > last_end:
                columns.append({
                    "x": last_end,
                    "y": header_boundary,
                    "width": gap_start - last_end,
                    "height": footer_boundary - header_boundary
                })
            
            last_end = gap["x"] + gap["width"]
        
        # 最後の余白の後にもカラムがある可能性
        if last_end < page_width:
            columns.append({
                "x": last_end,
                "y": header_boundary,
                "width": page_width - last_end,
                "height": footer_boundary - header_boundary
            })
        
        return columns
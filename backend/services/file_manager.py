"""ファイル管理に関する処理"""
import os
import glob
from datetime import datetime
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def save_extracted_text(
    text: str,
    filename: str,
    start_page: int,
    end_page: int,
    total_pages: int,
    preserve_layout: bool,
    apply_formatting: bool,
    output_dir: str,
    is_encrypted: bool = False
) -> Optional[str]:
    """
    抽出したテキストをファイルに保存する
    
    Args:
        text: 保存するテキスト
        filename: 元のPDFファイル名
        start_page: 開始ページ
        end_page: 終了ページ
        total_pages: 総ページ数
        preserve_layout: レイアウト保持オプション
        apply_formatting: フォーマット適用オプション
        output_dir: 出力ディレクトリ
        is_encrypted: 暗号化されているか
    
    Returns:
        Optional[str]: 保存したファイルのパス（エラーの場合はNone）
    """
    try:
        # 出力ディレクトリが存在しない場合は作成
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = filename.replace('.pdf', '').replace(' ', '_')
        suffix = "_encrypted" if is_encrypted else ""
        output_filename = os.path.join(
            output_dir, 
            f"{safe_filename}_{timestamp}_p{start_page}-{end_page}{suffix}.txt"
        )
        
        # 古いファイルを削除
        cleanup_old_files(output_dir, safe_filename, start_page, end_page, suffix)
        
        # ファイルに保存
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(f"# PDF: {filename}\n")
            f.write(f"# 抽出日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"# ページ範囲: {start_page}-{end_page}\n")
            f.write(f"# 総ページ数: {total_pages}\n")
            f.write(f"# オプション: preserve_layout={preserve_layout}, apply_formatting={apply_formatting}\n")
            if is_encrypted:
                f.write(f"# 暗号化: あり\n")
            f.write("=" * 80 + "\n\n")
            f.write(text)
        
        logger.info(f"[save_extracted_text] 抽出結果を保存: {output_filename}")
        return output_filename
        
    except Exception as e:
        logger.error(f"[save_extracted_text] ファイル保存エラー: {str(e)}")
        return None


def cleanup_old_files(
    output_dir: str,
    safe_filename: str,
    start_page: int,
    end_page: int,
    suffix: str = "",
    max_files: int = 10
):
    """
    古いファイルを削除する
    
    Args:
        output_dir: 出力ディレクトリ
        safe_filename: ファイル名（安全な形式）
        start_page: 開始ページ
        end_page: 終了ページ
        suffix: ファイル名のサフィックス
        max_files: 保持する最大ファイル数
    """
    # 同じPDFの同じページ範囲のファイルを検索
    pattern = f"{safe_filename}_*_p{start_page}-{end_page}{suffix}.txt"
    existing_files = sorted(glob.glob(os.path.join(output_dir, pattern)))
    
    if len(existing_files) >= max_files:
        # 最も古いファイルから削除（最新のファイルを残す）
        files_to_delete = existing_files[:-(max_files - 1)]
        for old_file in files_to_delete:
            try:
                os.remove(old_file)
                logger.info(f"[cleanup_old_files] 古いファイルを削除: {os.path.basename(old_file)}")
            except Exception as e:
                logger.error(f"[cleanup_old_files] ファイル削除エラー: {e}")


def cleanup_temp_file(temp_path: str):
    """
    一時ファイルを削除する
    
    Args:
        temp_path: 削除する一時ファイルのパス
    """
    if temp_path and os.path.exists(temp_path):
        try:
            os.unlink(temp_path)
            logger.debug(f"[cleanup_temp_file] 一時ファイルを削除: {temp_path}")
        except Exception as e:
            logger.error(f"[cleanup_temp_file] 一時ファイル削除エラー: {e}")
"""リファクタリングされたextract_text関数"""

@app.post("/api/extract-text", response_model=ExtractResponse)
async def extract_text(
    file: UploadFile = File(...),
    start_page: int = Query(1, ge=1),
    end_page: Optional[int] = Query(None, ge=1),
    preserve_layout: bool = Query(True),
    apply_formatting: bool = Query(False),
    remove_headers_footers: bool = Query(False),
    merge_paragraphs: bool = Query(False),
    normalize_spaces: bool = Query(False),
    fix_hyphenation: bool = Query(False),
    header_threshold_percent: float = Query(0.1, ge=0.0, le=0.5, description="ヘッダー領域の割合（0-0.5）"),
    footer_threshold_percent: float = Query(0.1, ge=0.0, le=0.5, description="フッター領域の割合（0-0.5）")
):
    """
    PDFからテキストを抽出し、オプションで成形処理を適用する（リファクタリング版）
    """
    logger.info(f"[extract_text] リクエスト受信: {file.filename}")
    logger.info(f"  パラメータ: start_page={start_page}, end_page={end_page}, apply_formatting={apply_formatting}")
    
    temp_path = None
    
    try:
        # PDFファイルの検証と保存
        temp_path, total_pages, file_hash = await validate_and_save_pdf(file)
        
        # ページ範囲の検証
        start_page, end_page = validate_page_range(start_page, end_page, total_pages)
        
        # PDFを開く
        pdf_document = fitz.open(temp_path)
        extracted_pages = []
        full_text = []
        
        # PDFProcessorのインスタンスを作成
        from pdf_processor import PDFProcessor
        processor = PDFProcessor()
        
        try:
            # 各ページを処理
            for page_num in range(start_page - 1, end_page):
                if page_num + 1 in [1, 3]:  # デバッグ用ログ
                    logger.info(f"[extract_text] ページ {page_num + 1} を処理中...")
                
                page = pdf_document[page_num]
                
                # ページからテキストを抽出
                text, block_infos, column_count, has_header, has_footer, header_text, footer_text = \
                    extract_page_text(
                        page=page,
                        page_num=page_num,
                        preserve_layout=preserve_layout,
                        apply_formatting=apply_formatting,
                        remove_headers_footers=remove_headers_footers,
                        header_threshold_percent=header_threshold_percent,
                        footer_threshold_percent=footer_threshold_percent,
                        processor=processor
                    )
                
                # テキスト後処理を適用
                if any([merge_paragraphs, normalize_spaces, fix_hyphenation]):
                    text = apply_text_formatting(
                        text=text,
                        merge_paragraphs=merge_paragraphs,
                        normalize_spaces=normalize_spaces,
                        fix_hyphenation=fix_hyphenation
                    )
                
                # ページデータを作成
                page_data = PageText(
                    page_number=page_num + 1,
                    text=text,
                    blocks=block_infos,
                    column_count=column_count,
                    has_header=has_header,
                    has_footer=has_footer,
                    header_text=header_text,
                    footer_text=footer_text
                )
                
                extracted_pages.append(page_data)
                full_text.append(text)
            
        finally:
            pdf_document.close()
        
        # 抽出結果をファイルに保存
        full_text_str = "\n".join(full_text)
        save_extracted_text(
            text=full_text_str,
            filename=file.filename,
            start_page=start_page,
            end_page=end_page,
            total_pages=total_pages,
            preserve_layout=preserve_layout,
            apply_formatting=apply_formatting,
            output_dir=EXTRACTED_TEXT_DIR,
            is_encrypted=False
        )
        
        return ExtractResponse(
            total_pages=total_pages,
            extracted_pages=extracted_pages,
            full_text=full_text_str
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[extract_text] エラー: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 一時ファイルを削除
        if temp_path:
            cleanup_temp_file(temp_path)
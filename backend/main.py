from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import io
from typing import Optional, List, Dict
from pydantic import BaseModel

app = FastAPI(title="PDF to Markdown API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    start_page: Optional[int] = 1
    end_page: Optional[int] = None
    extract_images: Optional[bool] = False
    preserve_layout: Optional[bool] = True

class PageText(BaseModel):
    page_number: int
    text: str
    blocks: List[Dict]

class ExtractResponse(BaseModel):
    total_pages: int
    extracted_pages: List[PageText]
    full_text: str

@app.get("/")
async def root():
    return {"message": "PDF to Markdown API", "version": "1.0.0"}

@app.post("/api/extract-text", response_model=ExtractResponse)
async def extract_text(
    file: UploadFile = File(...),
    start_page: int = 1,
    end_page: Optional[int] = None,
    preserve_layout: bool = True
):
    """
    PDFからテキストを高精度で抽出
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみ対応しています")
    
    try:
        # PDFファイルを読み込み
        pdf_bytes = await file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        total_pages = len(pdf_document)
        
        # ページ範囲の検証
        if start_page < 1:
            start_page = 1
        if end_page is None or end_page > total_pages:
            end_page = total_pages
            
        extracted_pages = []
        full_text_parts = []
        
        for page_num in range(start_page - 1, end_page):
            page = pdf_document[page_num]
            
            if preserve_layout:
                # レイアウトを保持した抽出
                text, blocks = extract_with_layout(page)
            else:
                # シンプルなテキスト抽出
                text = page.get_text()
                blocks = []
            
            page_data = PageText(
                page_number=page_num + 1,
                text=text,
                blocks=blocks
            )
            
            extracted_pages.append(page_data)
            full_text_parts.append(f"--- ページ {page_num + 1} ---\n{text}")
        
        pdf_document.close()
        
        return ExtractResponse(
            total_pages=total_pages,
            extracted_pages=extracted_pages,
            full_text="\n\n".join(full_text_parts)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"処理エラー: {str(e)}")

def extract_with_layout(page):
    """
    レイアウト情報を保持してテキストを抽出
    """
    blocks = page.get_text("dict")["blocks"]
    
    # ブロックをY座標でソート（上から下へ）
    sorted_blocks = sorted(blocks, key=lambda b: b["bbox"][1])
    
    text_parts = []
    block_infos = []
    
    for block in sorted_blocks:
        if block["type"] == 0:  # テキストブロック
            block_text = []
            
            for line in block["lines"]:
                line_text = ""
                for span in line["spans"]:
                    line_text += span["text"]
                block_text.append(line_text)
            
            block_full_text = "\n".join(block_text)
            text_parts.append(block_full_text)
            
            # ブロック情報を保存
            block_infos.append({
                "bbox": block["bbox"],
                "text": block_full_text,
                "font_size": get_average_font_size(block),
                "is_bold": is_bold_block(block)
            })
    
    return "\n\n".join(text_parts), block_infos

def get_average_font_size(block):
    """ブロックの平均フォントサイズを取得"""
    sizes = []
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            sizes.append(span.get("size", 12))
    return sum(sizes) / len(sizes) if sizes else 12

def is_bold_block(block):
    """ブロックが太字かどうかを判定"""
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            if "bold" in span.get("font", "").lower():
                return True
    return False

@app.post("/api/analyze-layout")
async def analyze_layout(file: UploadFile = File(...)):
    """
    PDFのレイアウトを解析して構造情報を返す
    """
    try:
        pdf_bytes = await file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        layout_info = {
            "total_pages": len(pdf_document),
            "pages": []
        }
        
        for page_num in range(min(5, len(pdf_document))):  # 最初の5ページを解析
            page = pdf_document[page_num]
            blocks = page.get_text("dict")["blocks"]
            
            page_info = {
                "page_number": page_num + 1,
                "text_blocks": len([b for b in blocks if b["type"] == 0]),
                "image_blocks": len([b for b in blocks if b["type"] == 1]),
                "columns": detect_columns(blocks),
                "has_header": detect_header(blocks),
                "has_footer": detect_footer(blocks, page.rect.height)
            }
            
            layout_info["pages"].append(page_info)
        
        pdf_document.close()
        return layout_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"レイアウト解析エラー: {str(e)}")

def detect_columns(blocks):
    """カラム数を検出"""
    if not blocks:
        return 1
    
    text_blocks = [b for b in blocks if b["type"] == 0]
    if not text_blocks:
        return 1
    
    # X座標でクラスタリング
    x_positions = [b["bbox"][0] for b in text_blocks]
    unique_x = list(set(x_positions))
    
    # 近いX座標をグループ化
    threshold = 50
    columns = []
    for x in unique_x:
        added = False
        for col in columns:
            if abs(x - col) < threshold:
                added = True
                break
        if not added:
            columns.append(x)
    
    return len(columns)

def detect_header(blocks):
    """ヘッダーの存在を検出"""
    if not blocks:
        return False
    
    # 最初のテキストブロックがヘッダーの可能性
    for block in blocks[:3]:  # 最初の3ブロックをチェック
        if block["type"] == 0:
            # Y座標が小さい（ページ上部）かつフォントサイズが大きい
            if block["bbox"][1] < 100:
                avg_size = get_average_font_size(block)
                if avg_size > 14:  # 通常より大きいフォント
                    return True
    return False

def detect_footer(blocks, page_height):
    """フッターの存在を検出"""
    if not blocks:
        return False
    
    # 最後のテキストブロックがフッターの可能性
    for block in blocks[-3:]:  # 最後の3ブロックをチェック
        if block["type"] == 0:
            # Y座標が大きい（ページ下部）
            if block["bbox"][1] > page_height - 100:
                text = " ".join(span["text"] for line in block["lines"] for span in line["spans"])
                # ページ番号やコピーライトの存在をチェック
                if any(keyword in text.lower() for keyword in ["page", "©", "copyright", str(page_height)]):
                    return True
    return False

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
import type { RawImage } from './types'

const MAX_IMAGE_SIDE = 1600

// pdf.js ImageKind: 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP
function toImageData(img: RawImage): ImageData | null {
  const { width, height, data, kind } = img
  if (!data || width <= 0 || height <= 0) return null
  const out = new Uint8ClampedArray(width * height * 4)
  if (kind === 3) {
    if (data.length < out.length) return null
    out.set(data.subarray(0, out.length))
  } else if (kind === 2) {
    if (data.length < width * height * 3) return null
    for (let i = 0, j = 0; i < width * height; i++, j += 3) {
      out[i * 4] = data[j]
      out[i * 4 + 1] = data[j + 1]
      out[i * 4 + 2] = data[j + 2]
      out[i * 4 + 3] = 255
    }
  } else if (kind === 1) {
    const stride = Math.ceil(width / 8)
    if (data.length < stride * height) return null
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = (data[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0
        const o = (y * width + x) * 4
        out[o] = v
        out[o + 1] = v
        out[o + 2] = v
        out[o + 3] = 255
      }
    }
  } else {
    return null
  }
  return new ImageData(out, width, height)
}

export async function encodeImage(img: RawImage): Promise<Blob | null> {
  try {
    const { width, height } = img
    if (!(width > 0 && height > 0)) return null
    let source: CanvasImageSource
    if (img.bitmap) {
      source = img.bitmap as CanvasImageSource
    } else {
      const imageData = toImageData(img)
      if (!imageData) return null
      const src = new OffscreenCanvas(width, height)
      const sctx = src.getContext('2d')
      if (!sctx) return null
      sctx.putImageData(imageData, 0, 0)
      source = src
    }
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, w, h)
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })
  } catch {
    return null
  }
}

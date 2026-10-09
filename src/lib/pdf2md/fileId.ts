// 非暗号ハッシュ（cyrb53）。crypto.subtle は http の非 localhost で使えないので自前で持つ
function cyrb53(bytes: Uint8Array, seed: number): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i], 2654435761)
    h2 = Math.imul(h2 ^ bytes[i], 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

export function fileIdOf(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  return cyrb53(bytes, 0) + cyrb53(bytes, 1)
}

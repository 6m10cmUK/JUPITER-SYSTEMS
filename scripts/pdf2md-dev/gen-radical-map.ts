// Unicode の EquivalentUnifiedIdeograph から部首表を生成する。
// 使い方: npx tsx scripts/pdf2md-dev/gen-radical-map.ts <EquivalentUnifiedIdeograph-x.y.z.txt>
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RANGE_MIN = 0x2e80;
const RANGE_MAX = 0x2fdf;

function main() {
  const inPath = process.argv[2];
  if (!inPath) {
    console.error('usage: npx tsx scripts/pdf2md-dev/gen-radical-map.ts <EquivalentUnifiedIdeograph.txt>');
    process.exit(1);
  }
  const lines = readFileSync(inPath, 'utf8').split(/\r?\n/);
  const version = (lines[0] ?? '').replace(/^#\s*/, '').trim() || basename(inPath);
  const map = new Map<number, number>();
  for (const raw of lines) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const m = line.match(/^([0-9A-Fa-f]+)(?:\.\.([0-9A-Fa-f]+))?\s*;\s*([0-9A-Fa-f]+)$/);
    if (!m) throw new Error(`parse error: ${raw}`);
    const from = parseInt(m[1], 16);
    const to = parseInt(m[2] ?? m[1], 16);
    const target = parseInt(m[3], 16);
    for (let cp = from; cp <= to; cp++) {
      if (cp >= RANGE_MIN && cp <= RANGE_MAX) map.set(cp, target);
    }
  }
  const entries = [...map].sort((a, b) => a[0] - b[0]);
  const body = entries
    .map(([k, v]) => `  '${String.fromCodePoint(k)}': '${String.fromCodePoint(v)}', // U+${k.toString(16).toUpperCase()} -> U+${v.toString(16).toUpperCase()}`)
    .join('\n');
  const out = `// 生成物。手で編集しないこと。
// 再生成: npx tsx scripts/pdf2md-dev/gen-radical-map.ts <EquivalentUnifiedIdeograph.txt のパス>
// 元ファイル: ${version}
// © Unicode, Inc. Unicode License v3: https://www.unicode.org/license.txt
export const UNICODE_RADICAL_MAP: Readonly<Record<string, string>> = {
${body}
};
`;
  const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/features/pdf2md/core/radicalMap.generated.ts');
  writeFileSync(outPath, out);
  console.error(`wrote ${entries.length} entries -> ${outPath}`);
}

main();

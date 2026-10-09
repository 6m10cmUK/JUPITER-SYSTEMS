// 動作確認用 CLI: npx tsx scripts/pdf2md-dev/convert.ts <in.pdf> <out.md>
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { convertDocument } from '../../src/lib/pdf2md/index';
import { renderMarkdown } from '../../src/lib/pdf2md/render';
import { loadPdf, closePdf } from '../pdf2md-eval/loadPdf';

async function main() {
  const [inPath, outPath] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error('usage: npx tsx scripts/pdf2md-dev/convert.ts <in.pdf> <out.md>');
    process.exit(1);
  }
  const doc = await loadPdf(inPath);
  const t0 = Date.now();
  const { blocks, debug } = await convertDocument(doc, { debug: true });
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, renderMarkdown(blocks));
  writeFileSync(outPath.replace(/\.md$/, '') + '.debug.json', JSON.stringify(debug, null, 1));
  console.error(`done ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${pathToFileURL(resolve(outPath)).pathname}`);
  await closePdf(doc);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

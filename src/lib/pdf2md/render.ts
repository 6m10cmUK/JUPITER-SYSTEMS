import type { Block } from './types';

function escapeLead(text: string): string {
  return text
    .replace(/^(#|>)/, '\\$1')
    .replace(/^([-+*])(\s)/, '\\$1$2')
    .replace(/^(\d+)\.(\s)/, '$1\\.$2');
}

export function renderMarkdown(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'image' || !b.text) continue;
    if (b.kind === 'heading') parts.push(`${'#'.repeat(b.level ?? 1)} ${b.text}`);
    else parts.push(escapeLead(b.text));
  }
  return parts.join('\n\n') + '\n';
}

/**
 * 複製時の名前生成ルール
 *
 * 末尾が (n) 形式でない場合: 元の名前(2) にする
 * 末尾が (n) 形式の場合: 元の名前(n+1) にする（例: マップA(2) → マップA(3)）
 */
export function generateDuplicateName(name: string): string {
  const match = name.match(/^(.+)\((\d+)\)$/);

  if (!match) {
    // 末尾に (数字) がない場合
    return `${name}(2)`;
  }

  const [, baseName, numStr] = match;
  const num = parseInt(numStr, 10);
  return `${baseName}(${num + 1})`;
}

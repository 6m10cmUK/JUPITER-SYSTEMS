import type { DiceResult } from '../types/adrastea.types';

/**
 * シンプルなダイスロール処理
 * bcdice は Opal(Ruby→JS) ベースで Vite のブラウザバンドルと互換性がないため、
 * 基本的なダイスコマンドを自前でパースする。
 *
 * 対応コマンド:
 *   NdM      — N個のM面ダイスを振る (例: 2d6, 1d20)
 *   NdM+K    — 修正値付き (例: 2d6+3, 1d20-2)
 *   NdM>=T   — 目標値判定 (例: 2d6>=7)
 *   choice[A,B,C] — ランダム選択
 */

const DICE_PATTERN = /^(\d+)d(\d+)([+-]\d+)?(?:(>=|<=|>|<|=)(\d+))?$/i;
const CHOICE_PATTERN = /^choice\[(.+)\]$/i;

function rollSingle(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function parseDiceCommand(input: string): DiceResult | null {
  const trimmed = input.trim();

  // choice コマンド
  const choiceMatch = trimmed.match(CHOICE_PATTERN);
  if (choiceMatch) {
    const options = choiceMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    if (options.length === 0) return null;
    const chosen = options[Math.floor(Math.random() * options.length)];
    return {
      text: `(${trimmed}) → ${chosen}`,
      success: true,
      result: trimmed,
      isSecret: false,
    };
  }

  // ダイスコマンド
  const match = trimmed.match(DICE_PATTERN);
  if (!match) return null;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  const compareOp = match[4] as string | undefined;
  const target = match[5] ? parseInt(match[5], 10) : undefined;

  if (count <= 0 || count > 100 || sides <= 0 || sides > 10000) return null;

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollSingle(sides));
  }

  const sum = rolls.reduce((a, b) => a + b, 0) + modifier;
  const rollsStr = rolls.join(', ');
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';

  let success = true;
  let successText = '';
  if (compareOp && target !== undefined) {
    switch (compareOp) {
      case '>=': success = sum >= target; break;
      case '<=': success = sum <= target; break;
      case '>': success = sum > target; break;
      case '<': success = sum < target; break;
      case '=': success = sum === target; break;
    }
    successText = success ? ' → 成功' : ' → 失敗';
  }

  const text = count === 1
    ? `(${trimmed}) → ${sum}${successText}`
    : `(${trimmed}) → ${sum}[${rollsStr}]${modStr ? ` (${rolls.reduce((a, b) => a + b, 0)}${modStr})` : ''}${successText}`;

  return {
    text,
    success,
    result: trimmed,
    isSecret: false,
  };
}

export async function rollDice(
  input: string,
  _gameSystem: string = 'DiceBot',
): Promise<DiceResult | null> {
  try {
    return parseDiceCommand(input);
  } catch (err) {
    console.error('rollDice failed:', err);
    return null;
  }
}

export async function getAvailableSystems(): Promise<
  { id: string; name: string }[]
> {
  // 自前実装ではゲームシステム固有の処理はないが、
  // UIの互換性のためにリストを返す
  return [
    { id: 'DiceBot', name: '汎用ダイスボット' },
  ];
}

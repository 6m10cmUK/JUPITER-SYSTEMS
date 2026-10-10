export type DartNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25

export type Multiplier = 'single' | 'double' | 'triple'

export interface Segment {
  number: DartNumber
  multiplier: Multiplier
}

export type DartThrow = Segment | 'miss'

export function getThrowScore(t: DartThrow): number {
  if (t === 'miss') return 0
  const mult = t.multiplier === 'single' ? 1 : t.multiplier === 'double' ? 2 : 3
  return t.number * mult
}

export function formatThrow(t: DartThrow): string {
  if (t === 'miss') return 'MISS'
  if (t.number === 25) {
    return t.multiplier === 'double' ? 'BULL' : 'OUT BULL'
  }
  const prefix = t.multiplier === 'single' ? '' : t.multiplier === 'double' ? 'D' : 'T'
  return `${prefix}${t.number}`
}

export interface PlayerState {
  name: string
  rounds: DartThrow[][]
}

export type GamePhase = 'setup' | 'playing' | 'result'
export type GameMode = 'count-up' | 'zero-one' | 'cricket' | 'cricket-secret'

export function isCricketMode(mode: GameMode): boolean {
  return mode === 'cricket' || mode === 'cricket-secret'
}

export interface GameState {
  mode: GameMode
  players: PlayerState[]
  currentPlayerIndex: number
  currentRound: number
  maxRounds: number
  phase: GamePhase
  currentThrows: DartThrow[]
  waitingConfirm: boolean
  startScore?: number
  cricketMarks?: { [playerIndex: number]: { [number: number]: number } }
  cricketScores?: number[]
  secretNumbers?: number[]
  revealedNumbers?: number[]
}

export type GameAction =
  | { type: 'START_GAME'; players: string[]; mode: GameMode; startScore?: number }
  | { type: 'RECORD_THROW'; dart: DartThrow }
  | { type: 'CONFIRM_TURN' }
  | { type: 'UNDO_THROW' }
  | { type: 'RESET_GAME' }

export interface GameModeStrategy {
  maxRounds: number
  calculateRoundScore(throws: DartThrow[]): number
  getTotalScore(player: PlayerState): number
  isGameOver(state: GameState): boolean
  getRankings(players: PlayerState[]): { playerIndex: number; rank: number; score: number }[]
  validateThrow?(state: GameState, dart: DartThrow, currentThrows: DartThrow[]): 'valid' | 'bust'
}

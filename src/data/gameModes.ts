import { getThrowScore, type DartThrow, type GameModeStrategy, type GameState, type PlayerState } from '../types/juno.types'

export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25]

const countUpStrategy: GameModeStrategy = {
  maxRounds: 8,

  calculateRoundScore(throws: DartThrow[]): number {
    return throws.reduce((sum, t) => sum + getThrowScore(t), 0)
  },

  getTotalScore(player: PlayerState): number {
    return player.rounds.reduce(
      (sum, round) => sum + round.reduce((s, t) => s + getThrowScore(t), 0),
      0
    )
  },

  isGameOver(state: GameState): boolean {
    return state.currentRound >= this.maxRounds && state.currentPlayerIndex === 0 && state.currentThrows.length === 0
  },

  getRankings(players: PlayerState[]): { playerIndex: number; rank: number; score: number }[] {
    const scores = players.map((p, i) => ({
      playerIndex: i,
      score: this.getTotalScore(p),
      rank: 0,
    }))
    scores.sort((a, b) => b.score - a.score)
    scores.forEach((s, i) => {
      s.rank = i === 0 || scores[i - 1].score !== s.score ? i + 1 : scores[i - 1].rank
    })
    return scores
  },
}

const zeroOneStrategy: GameModeStrategy = {
  maxRounds: 20,

  calculateRoundScore(throws: DartThrow[]): number {
    return throws.reduce((sum, t) => sum + getThrowScore(t), 0)
  },

  getTotalScore(player: PlayerState): number {
    return player.rounds.reduce(
      (sum, round) => sum + round.reduce((s, t) => s + getThrowScore(t), 0),
      0
    )
  },

  isGameOver(state: GameState): boolean {
    const startScore = state.startScore ?? 501
    for (const player of state.players) {
      const used = this.getTotalScore(player)
      if (startScore - used === 0) return true
    }
    return state.currentRound >= this.maxRounds && state.currentPlayerIndex === 0 && state.currentThrows.length === 0
  },

  getRankings(players: PlayerState[]): { playerIndex: number; rank: number; score: number }[] {
    const scores = players.map((p, i) => ({
      playerIndex: i,
      score: this.getTotalScore(p),
      rank: 0,
    }))
    scores.sort((a, b) => b.score - a.score)
    scores.forEach((s, i) => {
      s.rank = i === 0 || scores[i - 1].score !== s.score ? i + 1 : scores[i - 1].rank
    })
    return scores
  },

  validateThrow(state: GameState, dart: DartThrow, currentThrows: DartThrow[]): 'valid' | 'bust' {
    const startScore = state.startScore ?? 501
    const player = state.players[state.currentPlayerIndex]
    const usedSoFar = player.rounds.reduce(
      (sum, round) => sum + round.reduce((s, t) => s + getThrowScore(t), 0),
      0
    )
    const thisRoundSoFar = currentThrows.reduce((sum, t) => sum + getThrowScore(t), 0)
    const remaining = startScore - usedSoFar - thisRoundSoFar - getThrowScore(dart)
    if (remaining < 0) return 'bust'
    return 'valid'
  },
}

const cricketStrategy: GameModeStrategy = {
  maxRounds: 15,

  calculateRoundScore(throws: DartThrow[]): number {
    return throws.reduce((sum, t) => {
      if (t === 'miss') return sum
      if (!CRICKET_NUMBERS.includes(t.number)) return sum
      const marks = t.multiplier === 'single' ? 1 : t.multiplier === 'double' ? 2 : 3
      return sum + marks
    }, 0)
  },

  getTotalScore(_player: PlayerState): number {
    // GameView側でstate.cricketScoresを直接参照する
    return 0
  },

  isGameOver(state: GameState): boolean {
    if (!state.cricketMarks || !state.cricketScores) return false
    const marks = state.cricketMarks
    const scores = state.cricketScores
    const playerCount = state.players.length

    // 誰かが全ナンバークローズかチェック
    for (let pi = 0; pi < playerCount; pi++) {
      const playerMarks = marks[pi] ?? {}
      const allClosed = CRICKET_NUMBERS.every(n => (playerMarks[n] ?? 0) >= 3)
      if (allClosed) {
        const myScore = scores[pi] ?? 0
        if (playerCount === 2) {
          // タイマン: 全クローズ + 最高スコア（相手以上）で勝ち
          const allOthersLowerOrEqual = state.players.every((_, oi) =>
            oi === pi || (scores[oi] ?? 0) <= myScore
          )
          if (allOthersLowerOrEqual) return true
        } else {
          // カットスロート: 全クローズ + 最低スコア（相手以下）で勝ち
          const allOthersHigherOrEqual = state.players.every((_, oi) =>
            oi === pi || (scores[oi] ?? 0) >= myScore
          )
          if (allOthersHigherOrEqual) return true
        }
      }
    }

    return state.currentRound >= this.maxRounds &&
      state.currentPlayerIndex === 0 &&
      state.currentThrows.length === 0
  },

  getRankings(players: PlayerState[]): { playerIndex: number; rank: number; score: number }[] {
    // GameView/ResultViewでstate.cricketScoresを直接使う
    return players.map((_, i) => ({ playerIndex: i, rank: i + 1, score: 0 }))
  },
}

const cricketSecretStrategy: GameModeStrategy = {
  maxRounds: 15,

  calculateRoundScore(throws: DartThrow[]): number {
    return throws.reduce((sum, t) => {
      if (t === 'miss') return sum
      if (!CRICKET_NUMBERS.includes(t.number)) return sum
      const marks = t.multiplier === 'single' ? 1 : t.multiplier === 'double' ? 2 : 3
      return sum + marks
    }, 0)
  },

  getTotalScore(_player: PlayerState): number {
    // GameView側でstate.cricketScoresを直接参照する
    return 0
  },

  isGameOver(state: GameState): boolean {
    if (!state.cricketMarks || !state.cricketScores) return false
    const marks = state.cricketMarks
    const scores = state.cricketScores
    const secretNumbers = state.secretNumbers ?? []
    const playerCount = state.players.length

    // 誰かが全ナンバークローズかチェック
    for (let pi = 0; pi < playerCount; pi++) {
      const playerMarks = marks[pi] ?? {}
      const allClosed = secretNumbers.every(n => (playerMarks[n] ?? 0) >= 3)
      if (allClosed) {
        const myScore = scores[pi] ?? 0
        if (playerCount === 2) {
          // タイマン: 全クローズ + 最高スコア（相手以上）で勝ち
          const allOthersLowerOrEqual = state.players.every((_, oi) =>
            oi === pi || (scores[oi] ?? 0) <= myScore
          )
          if (allOthersLowerOrEqual) return true
        } else {
          // カットスロート: 全クローズ + 最低スコア（相手以下）で勝ち
          const allOthersHigherOrEqual = state.players.every((_, oi) =>
            oi === pi || (scores[oi] ?? 0) >= myScore
          )
          if (allOthersHigherOrEqual) return true
        }
      }
    }

    return state.currentRound >= this.maxRounds &&
      state.currentPlayerIndex === 0 &&
      state.currentThrows.length === 0
  },

  getRankings(players: PlayerState[]): { playerIndex: number; rank: number; score: number }[] {
    // GameView/ResultViewでstate.cricketScoresを直接使う
    return players.map((_, i) => ({ playerIndex: i, rank: i + 1, score: 0 }))
  },
}

export const gameModeStrategies: Record<string, GameModeStrategy> = {
  'count-up': countUpStrategy,
  'zero-one': zeroOneStrategy,
  'cricket': cricketStrategy,
  'cricket-secret': cricketSecretStrategy,
}

import { useReducer, useEffect } from 'react'
import type { GameState, GameAction, Segment } from '../types/juno.types'
import { getThrowScore, isCricketMode } from '../types/juno.types'
import { gameModeStrategies, CRICKET_NUMBERS } from '../data/gameModes'

const STORAGE_KEY = 'juno-game'

function applySecretDiscoveryBonus(
  cricketMarks: NonNullable<GameState['cricketMarks']>,
  cricketScores: number[],
  playerIndex: number,
  dart: Segment,
  playerCount: number,
): { marks: NonNullable<GameState['cricketMarks']>; scores: number[] } {
  const marks = JSON.parse(JSON.stringify(cricketMarks))
  const scores = [...cricketScores]
  if (!marks[playerIndex]) marks[playerIndex] = {}

  let bonusMarks = 0
  if (dart.multiplier === 'single') {
    bonusMarks = 2
  } else if (dart.multiplier === 'double') {
    bonusMarks = 3
  } else {
    bonusMarks = 3
    // トリプル: 1オーバーマーク → プレイヤー人数で分岐
    if (playerCount === 2) {
      // タイマン: 自分に加点
      scores[playerIndex] = (scores[playerIndex] ?? 0) + dart.number * 1
    } else {
      // カットスロート: 他プレイヤーに加点
      for (let oi = 0; oi < playerCount; oi++) {
        if (oi === playerIndex) continue
        const otherMarks = marks[oi]?.[dart.number] ?? 0
        if (otherMarks < 3) {
          scores[oi] = (scores[oi] ?? 0) + dart.number * 1
        }
      }
    }
  }

  marks[playerIndex][dart.number] = (marks[playerIndex][dart.number] ?? 0) + bonusMarks
  return { marks, scores }
}

const initialState: GameState = {
  mode: 'count-up',
  players: [],
  currentPlayerIndex: 0,
  currentRound: 0,
  maxRounds: 8,
  phase: 'setup',
  currentThrows: [],
  waitingConfirm: false,
  startScore: undefined,
  cricketMarks: undefined,
  cricketScores: undefined,
}

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 最低限のバリデーション
      if (parsed && typeof parsed === 'object' && parsed.phase === 'playing' && Array.isArray(parsed.players) && typeof parsed.currentPlayerIndex === 'number') {
        return parsed as GameState
      }
    }
  } catch {}
  return initialState
}

function applyCricketThrows(
  state: GameState,
  playerIndex: number,
  throws: GameState['currentThrows'],
  targetNumbers?: number[]
): { marks: GameState['cricketMarks']; scores: GameState['cricketScores'] } {
  const marks = JSON.parse(JSON.stringify(state.cricketMarks ?? {})) as NonNullable<GameState['cricketMarks']>
  const scores = [...(state.cricketScores ?? state.players.map(() => 0))]
  const playerCount = state.players.length
  const numbersToCheck = targetNumbers ?? CRICKET_NUMBERS

  if (!marks[playerIndex]) marks[playerIndex] = {}

  for (const t of throws) {
    if (t === 'miss') continue
    if (!numbersToCheck.includes(t.number)) continue

    const dartMarks = t.multiplier === 'single' ? 1 : t.multiplier === 'double' ? 2 : 3
    const prevMarks = marks[playerIndex][t.number] ?? 0
    const newTotal = prevMarks + dartMarks

    marks[playerIndex][t.number] = newTotal

    // クローズ後のオーバーマーク → プレイヤー人数で分岐
    if (newTotal > 3) {
      const overMarks = newTotal - Math.max(prevMarks, 3)
      if (overMarks > 0) {
        if (playerCount === 2) {
          // タイマン: 自分に加点
          scores[playerIndex] = (scores[playerIndex] ?? 0) + t.number * overMarks
        } else {
          // カットスロート: 他プレイヤーに加点
          for (let oi = 0; oi < playerCount; oi++) {
            if (oi === playerIndex) continue
            const otherMarks = marks[oi]?.[t.number] ?? 0
            if (otherMarks < 3) {
              scores[oi] = (scores[oi] ?? 0) + t.number * overMarks
            }
          }
        }
      }
    } else if (prevMarks < 3 && newTotal >= 3) {
      // 今回クローズした → クローズした時点でのオーバー分を計算 → プレイヤー人数で分岐
      const overAfterClose = newTotal - 3
      if (overAfterClose > 0) {
        if (playerCount === 2) {
          // タイマン: 自分に加点
          scores[playerIndex] = (scores[playerIndex] ?? 0) + t.number * overAfterClose
        } else {
          // カットスロート: 他プレイヤーに加点
          for (let oi = 0; oi < playerCount; oi++) {
            if (oi === playerIndex) continue
            const otherMarks = marks[oi]?.[t.number] ?? 0
            if (otherMarks < 3) {
              scores[oi] = (scores[oi] ?? 0) + t.number * overAfterClose
            }
          }
        }
      }
    }
  }

  return { marks, scores }
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const strategy = gameModeStrategies[action.mode]
      const isInitializingCricketMode = isCricketMode(action.mode)

      let secretNumbers: number[] | undefined = undefined
      if (action.mode === 'cricket-secret') {
        // 1-20とBULL(25)の21個からランダムに7つ選出
        const allNumbers = Array.from({ length: 21 }, (_, i) => i < 20 ? i + 1 : 25)
        for (let i = allNumbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]]
        }
        secretNumbers = allNumbers.slice(0, 7)
      }

      return {
        ...initialState,
        mode: action.mode,
        maxRounds: action.mode === 'zero-one'
          ? (action.startScore === 301 ? 10 : 15)
          : strategy.maxRounds,
        players: action.players.map((name) => ({ name, rounds: [] })),
        phase: 'playing',
        currentPlayerIndex: 0,
        currentRound: 0,
        currentThrows: [],
        waitingConfirm: false,
        startScore: action.startScore,
        cricketMarks: isInitializingCricketMode
          ? Object.fromEntries(action.players.map((_, i) => [i, {}]))
          : undefined,
        cricketScores: isInitializingCricketMode
          ? new Array(action.players.length).fill(0)
          : undefined,
        secretNumbers,
        revealedNumbers: action.mode === 'cricket-secret' ? [] : undefined,
      }
    }

    case 'RECORD_THROW': {
      // バスト判定
      const strategyForThrow = gameModeStrategies[state.mode]
      if (strategyForThrow.validateThrow) {
        const result = strategyForThrow.validateThrow(state, action.dart, state.currentThrows)
        if (result === 'bust') {
          const newPlayers = state.players.map((p, i) => {
            if (i !== state.currentPlayerIndex) return p
            return { ...p, rounds: [...p.rounds, []] }
          })
          const isLastPlayer = state.currentPlayerIndex === state.players.length - 1
          return {
            ...state,
            players: newPlayers,
            currentPlayerIndex: isLastPlayer ? 0 : state.currentPlayerIndex + 1,
            currentRound: isLastPlayer ? state.currentRound + 1 : state.currentRound,
            currentThrows: [],
          }
        }
      }

      const newThrows = [...state.currentThrows, action.dart]

      // 01: ちょうど0になったら即座にラウンド確定
      if (strategyForThrow.validateThrow && state.startScore !== undefined) {
        const player = state.players[state.currentPlayerIndex]
        const usedSoFar = player.rounds.reduce(
          (sum, round) => sum + round.reduce((s, t) => s + getThrowScore(t), 0),
          0
        )
        const thisRoundTotal = newThrows.reduce((sum, t) => sum + getThrowScore(t), 0)
        if (state.startScore - usedSoFar - thisRoundTotal === 0) {
          const newPlayers = state.players.map((p, i) => {
            if (i !== state.currentPlayerIndex) return p
            return { ...p, rounds: [...p.rounds, newThrows] }
          })
          const nextState: GameState = { ...state, players: newPlayers, currentThrows: [] }
          if (strategyForThrow.isGameOver(nextState)) {
            return { ...nextState, phase: 'result' }
          }
          return nextState
        }
      }

      if (newThrows.length < 3) {
        if (state.mode === 'cricket') {
          const { marks, scores } = applyCricketThrows(state, state.currentPlayerIndex, [action.dart])
          return { ...state, currentThrows: newThrows, cricketMarks: marks, cricketScores: scores }
        }

        if (state.mode === 'cricket-secret') {
          const secretNumbers = state.secretNumbers ?? []
          let newRevealedNumbers = [...(state.revealedNumbers ?? [])]
          let nextState: GameState = { ...state, currentThrows: newThrows }

          // 投げたナンバーがsecretNumbersに含まれるかチェック
          if (action.dart !== 'miss' && secretNumbers.includes(action.dart.number)) {
            if (!newRevealedNumbers.includes(action.dart.number)) {
              // 最初の発見者ボーナス
              const result = applySecretDiscoveryBonus(
                state.cricketMarks ?? Object.fromEntries(state.players.map((_, i) => [i, {}])),
                state.cricketScores ?? state.players.map(() => 0),
                state.currentPlayerIndex,
                action.dart,
                state.players.length,
              )
              newRevealedNumbers.push(action.dart.number)
              nextState = {
                ...nextState,
                cricketMarks: result.marks,
                cricketScores: result.scores,
                revealedNumbers: newRevealedNumbers,
              }
            } else {
              // 既にrevealedの場合 → 通常cricket処理
              const { marks, scores } = applyCricketThrows(state, state.currentPlayerIndex, [action.dart], secretNumbers)
              nextState = { ...nextState, cricketMarks: marks, cricketScores: scores }
            }
          }

          return nextState
        }

        return { ...state, currentThrows: newThrows }
      }

      const newPlayers = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p
        return { ...p, rounds: [...p.rounds, newThrows] }
      })

      let nextState: GameState = {
        ...state,
        players: newPlayers,
        currentThrows: newThrows,
        waitingConfirm: true,
      }

      // Cricket: マーク・スコア更新
      if (state.mode === 'cricket') {
        const { marks, scores } = applyCricketThrows(state, state.currentPlayerIndex, [action.dart])
        nextState = {
          ...nextState,
          cricketMarks: marks,
          cricketScores: scores,
        }
      }

      // Cricket Secret: マーク・スコア更新（3投目の確定時）
      if (state.mode === 'cricket-secret') {
        const secretNumbers = state.secretNumbers ?? []
        let revealedNumbers = [...(state.revealedNumbers ?? [])]

        // 3投目のチェック
        if (action.dart !== 'miss' && secretNumbers.includes(action.dart.number)) {
          if (!revealedNumbers.includes(action.dart.number)) {
            // 最初の発見者ボーナス
            const result = applySecretDiscoveryBonus(
              state.cricketMarks ?? Object.fromEntries(state.players.map((_, i) => [i, {}])),
              state.cricketScores ?? state.players.map(() => 0),
              state.currentPlayerIndex,
              action.dart,
              state.players.length,
            )
            revealedNumbers.push(action.dart.number)
            nextState = {
              ...nextState,
              cricketMarks: result.marks,
              cricketScores: result.scores,
              revealedNumbers,
            }
          } else {
            // 既にrevealedの場合 → 通常cricket処理
            const { marks, scores } = applyCricketThrows(state, state.currentPlayerIndex, [action.dart], secretNumbers)
            nextState = {
              ...nextState,
              cricketMarks: marks,
              cricketScores: scores,
            }
          }
        }
      }

      // ゲーム終了判定（01のフィニッシュ、Cricketの全クローズ）
      const strategy = gameModeStrategies[state.mode]
      if (strategy.isGameOver(nextState)) {
        return { ...nextState, phase: 'result', waitingConfirm: false }
      }

      return nextState
    }

    case 'CONFIRM_TURN': {
      if (!state.waitingConfirm) return state

      const isLastPlayer = state.currentPlayerIndex === state.players.length - 1
      const nextPlayerIndex = isLastPlayer ? 0 : state.currentPlayerIndex + 1
      const nextRound = isLastPlayer ? state.currentRound + 1 : state.currentRound

      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        currentRound: nextRound,
        currentThrows: [],
        waitingConfirm: false,
      }
    }

    case 'UNDO_THROW': {
      // Cricket/Cricket-Secret の再計算用ローカル関数
      function rebuildCricketState(
        baseState: GameState,
        players: typeof state.players,
        currentThrowsToInclude: typeof state.currentThrows,
        currentPlayerIndexForThrows: number
      ): Partial<GameState> {
        const isRebuildingCricketMode = isCricketMode(baseState.mode)
        if (!isRebuildingCricketMode) return {}

        const playerCount = players.length
        const secretNumbers = baseState.mode === 'cricket-secret' ? (baseState.secretNumbers ?? []) : undefined
        const maxRoundCount = players.length > 0 ? Math.max(0, ...players.map(p => p.rounds.length)) : 0

        let rebuildState: GameState = {
          ...baseState,
          players,
          cricketMarks: Object.fromEntries(Array.from({ length: playerCount }, (_, i) => [i, {}])),
          cricketScores: new Array(playerCount).fill(0),
        }

        // cricket-secret の場合、revealed ナンバーを追跡
        let revealed = new Set<number>()

        // 確定済みラウンドを再計算（秒序順）
        for (let r = 0; r < maxRoundCount; r++) {
          for (let pi = 0; pi < playerCount; pi++) {
            const round = players[pi].rounds[r]
            if (!round) continue

            if (baseState.mode === 'cricket-secret') {
              // cricket-secret: 各投球ごとに初発見ボーナスを処理
              const secretNums = secretNumbers ?? []
              for (const dart of round) {
                if (dart === 'miss') continue
                if (!secretNums.includes(dart.number)) continue

                if (!revealed.has(dart.number)) {
                  // 初発見ボーナス
                  revealed.add(dart.number)
                  const result = applySecretDiscoveryBonus(
                    rebuildState.cricketMarks ?? Object.fromEntries(Array.from({ length: playerCount }, (_, i) => [i, {}])),
                    rebuildState.cricketScores ?? new Array(playerCount).fill(0),
                    pi,
                    dart,
                    playerCount,
                  )
                  rebuildState = { ...rebuildState, cricketMarks: result.marks, cricketScores: result.scores }
                } else {
                  // 既に revealed → 通常処理
                  const { marks, scores } = applyCricketThrows(rebuildState, pi, [dart], secretNums)
                  rebuildState = { ...rebuildState, cricketMarks: marks, cricketScores: scores }
                }
              }
            } else {
              // 通常cricket: 1ラウンド分を一括処理
              const { marks, scores } = applyCricketThrows(rebuildState, pi, round)
              rebuildState = { ...rebuildState, cricketMarks: marks, cricketScores: scores }
            }
          }
        }

        // currentThrows も反映（まだ rounds に入ってない投球分）
        if (currentThrowsToInclude.length > 0) {
          if (baseState.mode === 'cricket-secret') {
            const secretNums = secretNumbers ?? []
            for (const dart of currentThrowsToInclude) {
              if (dart === 'miss') continue
              if (!secretNums.includes(dart.number)) continue

              if (!revealed.has(dart.number)) {
                revealed.add(dart.number)
                const result = applySecretDiscoveryBonus(
                  rebuildState.cricketMarks ?? Object.fromEntries(Array.from({ length: playerCount }, (_, i) => [i, {}])),
                  rebuildState.cricketScores ?? new Array(playerCount).fill(0),
                  currentPlayerIndexForThrows,
                  dart,
                  playerCount,
                )
                rebuildState = { ...rebuildState, cricketMarks: result.marks, cricketScores: result.scores }
              } else {
                const { marks, scores } = applyCricketThrows(rebuildState, currentPlayerIndexForThrows, [dart], secretNums)
                rebuildState = { ...rebuildState, cricketMarks: marks, cricketScores: scores }
              }
            }
          } else {
            // 通常cricket
            const { marks, scores } = applyCricketThrows(rebuildState, currentPlayerIndexForThrows, currentThrowsToInclude)
            rebuildState = { ...rebuildState, cricketMarks: marks, cricketScores: scores }
          }
        }

        const result: Partial<GameState> = {
          cricketMarks: rebuildState.cricketMarks,
          cricketScores: rebuildState.cricketScores,
        }

        if (baseState.mode === 'cricket-secret') {
          result.revealedNumbers = Array.from(revealed)
        }

        return result
      }

      // パターン1: waitingConfirm 中のUNDO
      if (state.waitingConfirm) {
        const restoredThrows = state.currentThrows.slice(0, -1)
        const newPlayers = state.players.map((p, i) => {
          if (i !== state.currentPlayerIndex) return p
          return { ...p, rounds: p.rounds.slice(0, -1) }
        })
        const cricketRebuild = rebuildCricketState(state, newPlayers, restoredThrows, state.currentPlayerIndex)
        return { ...state, players: newPlayers, currentThrows: restoredThrows, waitingConfirm: false, ...cricketRebuild }
      }

      // パターン2: currentThrows.length > 0 のUNDO
      if (state.currentThrows.length > 0) {
        const restoredThrows = state.currentThrows.slice(0, -1)
        const cricketRebuild = rebuildCricketState(state, state.players, restoredThrows, state.currentPlayerIndex)
        return { ...state, currentThrows: restoredThrows, ...cricketRebuild }
      }

      // パターン3: 前プレイヤーに戻るUNDO
      const prevPlayerIndex = state.currentPlayerIndex === 0
        ? state.players.length - 1
        : state.currentPlayerIndex - 1
      const prevRound = state.currentPlayerIndex === 0
        ? state.currentRound - 1
        : state.currentRound

      if (prevRound < 0) return state

      const prevPlayer = state.players[prevPlayerIndex]
      if (prevPlayer.rounds.length === 0) return state

      const lastRound = prevPlayer.rounds[prevPlayer.rounds.length - 1]
      const restoredThrows = lastRound.slice(0, -1)

      const newPlayers = state.players.map((p, i) => {
        if (i !== prevPlayerIndex) return p
        return { ...p, rounds: p.rounds.slice(0, -1) }
      })

      const cricketRebuild = rebuildCricketState(state, newPlayers, restoredThrows, prevPlayerIndex)
      return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: prevPlayerIndex,
        currentRound: prevRound,
        currentThrows: restoredThrows,
        ...cricketRebuild,
      }
    }

    case 'RESET_GAME': {
      return { ...initialState, waitingConfirm: false }
    }

    default:
      return state
  }
}

export function useJunoGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState)

  useEffect(() => {
    if (state.phase === 'playing') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [state])

  const strategy = gameModeStrategies[state.mode]

  return { state, dispatch, strategy }
}

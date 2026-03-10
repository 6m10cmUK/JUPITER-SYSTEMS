import type { GameState, GameAction, Segment, DartThrow, GameModeStrategy, DartNumber } from '../../types/juno.types'
import { getThrowScore, formatThrow, isCricketMode } from '../../types/juno.types'
import { useMemo } from 'react'
import { DartBoard } from './DartBoard'
import { ScoreBoard } from './ScoreBoard'
import { ThrowHistory } from './ThrowHistory'
import CricketScoreBoard from './CricketScoreBoard'
import { CRICKET_NUMBERS } from '../../data/gameModes'

interface Props {
  state: GameState
  strategy: GameModeStrategy
  dispatch: React.Dispatch<GameAction>
}

// チェックアウト計算用の型
interface CheckoutOption {
  darts: DartThrow[]
  score: number
}

// 使用可能な得点を生成
function getAvailableScores(): Array<{ score: number; label: string }> {
  const scores: Array<{ score: number; label: string }> = []

  // シングル 1-20
  for (let n = 1; n <= 20; n++) {
    scores.push({ score: n, label: `S${n}` })
  }

  // ダブル 2-40, 50 (ブル)
  for (let n = 1; n <= 20; n++) {
    scores.push({ score: n * 2, label: `D${n}` })
  }
  scores.push({ score: 50, label: 'BULL' })

  // トリプル 3-60
  for (let n = 1; n <= 20; n++) {
    scores.push({ score: n * 3, label: `T${n}` })
  }

  // 外ブル 25
  scores.push({ score: 25, label: 'OUT BULL' })

  return scores
}

// チェックアウト計算（再帰的に全パターンを探索）
function findCheckout(remaining: number, dartsLeft: number): DartThrow[] | null {
  const availableScores = getAvailableScores()

  function backtrack(target: number, darts: number, current: DartThrow[]): DartThrow[] | null {
    if (darts === 0) {
      return target === 0 ? current : null
    }
    if (target <= 0) {
      return null
    }

    for (const { score } of availableScores) {
      if (score > target) continue

      let dart: DartThrow
      if (score === 50) {
        // BULL (ダブル25)
        dart = { number: 25, multiplier: 'double' }
      } else if (score === 25) {
        // OUT BULL (シングル25)
        dart = { number: 25, multiplier: 'single' }
      } else if (score % 3 === 0 && score >= 3 && score <= 60) {
        // トリプル
        const num = (score / 3) as DartNumber
        dart = { number: num, multiplier: 'triple' }
      } else if (score % 2 === 0 && score >= 2 && score <= 40) {
        // ダブル
        const num = (score / 2) as DartNumber
        dart = { number: num, multiplier: 'double' }
      } else if (score >= 1 && score <= 20) {
        // シングル
        dart = { number: score as DartNumber, multiplier: 'single' }
      } else {
        continue
      }

      const result = backtrack(target - score, darts - 1, [...current, dart])
      if (result) return result
    }

    return null
  }

  // 残り投球数から少ない順に探索
  for (let d = 1; d <= dartsLeft; d++) {
    const result = backtrack(remaining, d, [])
    if (result) return result
  }

  return null
}

export function GameView({ state, strategy, dispatch }: Props) {
  const currentPlayer = state.players[state.currentPlayerIndex]
  const isRoundComplete = state.currentThrows.length >= 3

  const handleHit = (segment: Segment) => {
    if (isRoundComplete) return
    dispatch({ type: 'RECORD_THROW', dart: segment })
  }

  const handleMiss = () => {
    if (isRoundComplete) return
    dispatch({ type: 'RECORD_THROW', dart: 'miss' })
  }

  const handleSelect = (dart: DartThrow) => {
    if (isRoundComplete) return
    dispatch({ type: 'RECORD_THROW', dart })
  }

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_TURN' })
  }

  const canUndo = state.currentThrows.length > 0 || state.currentRound > 0 || state.currentPlayerIndex > 0

  const totalScore = state.mode === 'zero-one'
    ? (state.startScore ?? 501) - strategy.getTotalScore(currentPlayer)
    : isCricketMode(state.mode)
    ? (state.cricketScores?.[state.currentPlayerIndex] ?? 0)
    : strategy.getTotalScore(currentPlayer)

  // チェックアウト計算（01モードのみ）
  const checkoutDarts = useMemo(() => {
    if (state.mode !== 'zero-one' || state.currentThrows.length >= 3) return null
    const currentRoundScore = state.currentThrows.reduce((sum, t) => sum + getThrowScore(t), 0)
    const remaining = totalScore - currentRoundScore
    const dartsLeft = 3 - state.currentThrows.length
    if (remaining > 0 && remaining <= 180 && dartsLeft > 0) {
      return findCheckout(remaining, dartsLeft)
    }
    return null
  }, [state.mode, state.currentThrows, totalScore])

  const checkoutText = checkoutDarts
    ? checkoutDarts.map(d => formatThrow(d)).join(' → ')
    : null

  // 1投でクリアできる全セグメント（盤面ハイライト用）
  const checkoutSegments = useMemo(() => {
    if (state.mode !== 'zero-one' || state.currentThrows.length >= 3) return []
    const currentRoundScore = state.currentThrows.reduce((sum, t) => sum + getThrowScore(t), 0)
    const remaining = totalScore - currentRoundScore
    if (remaining <= 0) return []
    const segments: Segment[] = []
    // シングル 1-20
    for (let n = 1; n <= 20; n++) {
      if (n === remaining) segments.push({ number: n as DartNumber, multiplier: 'single' })
      if (n * 2 === remaining) segments.push({ number: n as DartNumber, multiplier: 'double' })
      if (n * 3 === remaining) segments.push({ number: n as DartNumber, multiplier: 'triple' })
    }
    // ブル
    if (remaining === 25) segments.push({ number: 25, multiplier: 'single' })
    if (remaining === 50) segments.push({ number: 25, multiplier: 'double' })
    return segments
  }, [state.mode, state.currentThrows, totalScore])

  // シークレットCricket: 投げたけどsecretNumbersに含まれないハズレナンバー
  const triedMissNumbers = state.mode === 'cricket-secret' && state.secretNumbers
    ? (() => {
        const tried = new Set<number>()
        for (const player of state.players) {
          for (const round of player.rounds) {
            for (const t of round) {
              if (t !== 'miss') tried.add(t.number)
            }
          }
        }
        for (const t of state.currentThrows) {
          if (t !== 'miss') tried.add(t.number)
        }
        // secretNumbersに含まれないもの = ハズレ
        return [...tried].filter(n => !state.secretNumbers!.includes(n))
      })()
    : undefined

  return (
    <div className="h-full flex flex-col">
      {/* 上半分: スコア情報 */}
      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        {/* ヘッダー行（左: スコア情報, 右: ラウンド+戻るボタン） */}
        <div className="flex items-center px-2 py-1 flex-shrink-0 gap-2">
          {/* プレイヤー名とスコア */}
          <p className="text-xs text-[#00d4ff] font-semibold whitespace-nowrap shrink-0">
            {currentPlayer.name}
          </p>
          <p
            className="text-3xl font-mono font-black text-white leading-none shrink-0"
            style={{ textShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff' }}
          >
            {totalScore}
          </p>
          {/* スペーサー */}
          <div className="flex-1" />
          {/* ラウンド情報 */}
          <p className="text-xs text-gray-300 font-semibold whitespace-nowrap shrink-0">
            R{state.currentRound + 1}/{state.maxRounds} · {state.currentThrows.length}/3投
          </p>
          {/* 戻るボタン */}
          <button
            onClick={() => dispatch({ type: 'RESET_GAME' })}
            className="text-lg text-gray-400 hover:text-white transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* スコアボード */}
        <div className="flex-shrink-0 overflow-y-auto">
          {isCricketMode(state.mode) && state.cricketMarks && state.cricketScores ? (
            <CricketScoreBoard
              players={state.players.map((p, i) => ({
                name: p.name,
                marks: state.cricketMarks![i] ?? {},
                score: state.cricketScores![i] ?? 0,
              }))}
              currentPlayerIndex={state.currentPlayerIndex}
              cricketNumbers={state.mode === 'cricket-secret' ? (state.secretNumbers ?? []) : CRICKET_NUMBERS}
              secretMode={state.mode === 'cricket-secret'}
              revealedNumbers={state.revealedNumbers}
            />
          ) : (
            <ScoreBoard state={state} strategy={strategy} />
          )}
        </div>

        {/* 投球履歴 */}
        <div className="flex-shrink-0">
          <ThrowHistory
            throws={state.currentThrows}
            onUndo={() => dispatch({ type: 'UNDO_THROW' })}
            canUndo={canUndo}
            isCricket={isCricketMode(state.mode)}
            secretNumbers={state.mode === 'cricket-secret' ? state.secretNumbers : undefined}
          />
        </div>

        {/* チェックアウト表示（01モード専用） */}
        {checkoutText && (
          <div className="flex-shrink-0 bg-red-900/60 rounded-md px-3 py-1 text-center mx-2 mb-2">
            <p className="text-sm font-mono text-white tracking-wider">
              CHECKOUT: {checkoutText}
            </p>
          </div>
        )}
      </div>

      {/* 下半分: ダーツボード */}
      <div className="flex-1 min-h-0">
        <DartBoard
          onHit={handleHit}
          onMiss={handleMiss}
          disabled={isRoundComplete || state.waitingConfirm}
          currentThrows={state.currentThrows}
          waitingConfirm={state.waitingConfirm}
          onConfirm={handleConfirm}
          cricketNumbers={
            isCricketMode(state.mode)
              ? (state.mode === 'cricket-secret' ? state.revealedNumbers : CRICKET_NUMBERS)
              : undefined
          }
          closedNumbers={
            isCricketMode(state.mode) && state.cricketMarks
              ? Object.entries(state.cricketMarks[state.currentPlayerIndex] ?? {})
                  .filter(([num, marks]) => {
                    const numInt = parseInt(num)
                    return marks >= 3 && (!state.revealedNumbers || state.revealedNumbers.includes(numInt))
                  })
                  .map(([num]) => parseInt(num))
              : undefined
          }
          playerColor={
            isCricketMode(state.mode)
              ? ['#ff6b6b', '#00d4ff', '#ffaa00', '#00ff88'][state.currentPlayerIndex]
              : undefined
          }
          checkoutSegments={checkoutSegments}
          deadNumbers={
            isCricketMode(state.mode) && state.cricketMarks
              ? (state.mode === 'cricket-secret' ? state.secretNumbers : CRICKET_NUMBERS)
                  ?.filter(n =>
                    state.players.every((_, pi) => (state.cricketMarks![pi]?.[n] ?? 0) >= 3)
                  )
              : undefined
          }
          triedMissNumbers={triedMissNumbers}
          hideThrowHighlight={state.mode === 'cricket-secret'}
        />
      </div>
    </div>
  )
}

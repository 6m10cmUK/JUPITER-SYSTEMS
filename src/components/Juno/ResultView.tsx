import type { GameState, GameAction, GameModeStrategy } from '../../types/juno.types'

interface Props {
  state: GameState
  strategy: GameModeStrategy
  dispatch: React.Dispatch<GameAction>
}

function getModeName(state: GameState): string {
  if (state.mode === 'zero-one') return `01 - ${state.startScore ?? 501}`
  if (state.mode === 'cricket') return 'Cricket'
  if (state.mode === 'cricket-secret') return 'Secret Cricket'
  return 'Count Up'
}

export function ResultView({ state, strategy, dispatch }: Props) {
  const rankings = (state.mode === 'cricket' || state.mode === 'cricket-secret') && state.cricketScores
    ? state.players
        .map((_, i) => ({ playerIndex: i, score: state.cricketScores![i] ?? 0, rank: 0 }))
        .sort((a, b) => {
          // プレイヤー人数に応じてソート順を変更
          if (state.players.length === 2) {
            // タイマン: 最高スコア（降順）が上位
            return b.score - a.score
          } else {
            // カットスロート: 最低スコア（昇順）が上位
            return a.score - b.score
          }
        })
        .map((r, i, arr) => ({
          ...r,
          rank: i === 0 || arr[i - 1].score !== r.score ? i + 1 : arr[i - 1].rank,
        }))
    : strategy.getRankings(state.players)

  const handleRematch = () => {
    dispatch({ type: 'START_GAME', players: state.players.map(p => p.name), mode: state.mode, startScore: state.startScore })
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-black text-[#00d4ff] tracking-wider drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]">
          結果
        </h2>
        <p className="text-gray-500 text-sm tracking-widest uppercase">
          {getModeName(state)}
        </p>
      </div>

      <div className="space-y-3">
        {rankings.map((r) => {
          const player = state.players[r.playerIndex]
          const isFirst = r.rank === 1

          // 表示スコアの計算
          let displayScore: number
          if (state.mode === 'zero-one') {
            displayScore = (state.startScore ?? 501) - r.score
          } else if (state.mode === 'cricket' || state.mode === 'cricket-secret') {
            displayScore = r.score
          } else {
            displayScore = r.score
          }

          return (
            <div
              key={r.playerIndex}
              className={`p-4 rounded-xl ${
                isFirst
                  ? 'bg-gradient-to-r from-[#2a2000] to-[#1a1a2e] border-2 border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                  : 'bg-[#1a1a2e] border border-[#2a2a4a]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-black ${
                    isFirst
                      ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                      : 'text-gray-600'
                  }`}>
                    {r.rank}
                  </span>
                  <span className="font-semibold text-white text-lg">{player.name}</span>
                </div>
                <span className={`text-3xl font-black ${
                  isFirst
                    ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]'
                    : 'text-[#00d4ff] drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]'
                }`}>
                  {displayScore}
                </span>
              </div>
              {state.mode !== 'cricket' && state.mode !== 'cricket-secret' && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {player.rounds.map((round, rIdx) => (
                    <span key={rIdx} className="text-xs px-2 py-0.5 bg-[#252547] rounded text-gray-400">
                      R{rIdx + 1}: {strategy.calculateRoundScore(round)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRematch}
          className="flex-1 py-3 bg-[#00d4ff] text-[#0a0a0a] rounded-xl font-bold hover:bg-[#00b8d9] transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)]"
        >
          もう一度
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET_GAME' })}
          className="flex-1 py-3 bg-[#1a1a2e] text-gray-400 rounded-xl font-bold hover:bg-[#252547] transition-colors border border-[#2a2a4a]"
        >
          セットアップに戻る
        </button>
      </div>
    </div>
  )
}

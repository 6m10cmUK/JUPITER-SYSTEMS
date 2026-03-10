import { useEffect, useRef } from 'react'
import type { GameState, GameModeStrategy } from '../../types/juno.types'
import { ChevronRight } from 'lucide-react'
import { getThrowScore } from '../../types/juno.types'

interface Props {
  state: GameState
  strategy: GameModeStrategy
}

export function ScoreBoard({ state, strategy }: Props) {
  const currentRoundRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    currentRoundRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [state.currentRound])

  return (
    <div className="bg-[#1a1a2e] rounded-xl shadow-sm overflow-x-auto border border-[#333]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#252547]">
            <th className="py-2 px-3 text-left font-semibold text-gray-400 sticky left-0 bg-[#252547]">Player</th>
            {Array.from({ length: state.maxRounds }, (_, i) => (
              <th
                key={i}
                ref={i === state.currentRound ? currentRoundRef : undefined}
                className={`py-2 px-2 text-center font-semibold ${
                  i === state.currentRound ? 'text-[#00d4ff] bg-[#00d4ff]/10' : 'text-gray-500'
                }`}
              >
                R{i + 1}
              </th>
            ))}
            <th className="py-2 px-3 text-center font-bold text-gray-300">Total</th>
          </tr>
        </thead>
        <tbody>
          {state.players.map((player, pIdx) => {
            const isCurrentPlayer = state.phase === 'playing' && pIdx === state.currentPlayerIndex
            return (
              <tr key={pIdx} className={isCurrentPlayer ? 'bg-[#00d4ff]/10' : ''}>
                <td className={`py-2 px-3 font-semibold sticky left-0 whitespace-nowrap ${isCurrentPlayer ? 'text-[#00d4ff] bg-[#00d4ff]/10' : 'text-gray-300 bg-[#1a1a2e]'}`}>
                  {isCurrentPlayer && <ChevronRight size={14} className="inline mr-0.5 text-[#00d4ff]" />}
                  {player.name}
                </td>
                {Array.from({ length: state.maxRounds }, (_, rIdx) => {
                  const round = player.rounds[rIdx]
                  const isCurrentRoundForPlayer = isCurrentPlayer && rIdx === state.currentRound && !round && state.currentThrows.length > 0
                  const roundScore = round
                    ? strategy.calculateRoundScore(round)
                    : isCurrentRoundForPlayer
                      ? strategy.calculateRoundScore(state.currentThrows)
                      : null
                  return (
                    <td key={rIdx} className={`py-2 px-2 text-center ${
                      rIdx === state.currentRound ? 'bg-[#00d4ff]/5' : ''
                    }`}>
                      {roundScore !== null ? (
                        <span className={`font-mono ${isCurrentRoundForPlayer ? 'text-[#00d4ff]' : 'text-gray-300'}`}>{roundScore}</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  )
                })}
                <td className="py-2 px-3 text-center font-bold font-mono text-white">
                  {(() => {
                    const currentThrowsScore = isCurrentPlayer ? state.currentThrows.reduce((sum, t) => sum + getThrowScore(t), 0) : 0
                    const totalWithCurrent = strategy.getTotalScore(player) + currentThrowsScore
                    return state.mode === 'zero-one'
                      ? (state.startScore ?? 501) - totalWithCurrent
                      : totalWithCurrent
                  })()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

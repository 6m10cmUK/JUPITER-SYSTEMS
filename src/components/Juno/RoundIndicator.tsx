interface Props {
  currentRound: number
  maxRounds: number
  currentPlayerName: string
  throwCount: number
}

export function RoundIndicator({ currentRound, maxRounds, currentPlayerName, throwCount }: Props) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="font-semibold text-gray-400">
        Round <span className="text-[#00d4ff] text-lg drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]">{currentRound + 1}</span>
        <span className="text-gray-600"> / {maxRounds}</span>
      </div>
      <div className="font-semibold text-[#00d4ff]">
        {currentPlayerName} — {throwCount}/3投
      </div>
    </div>
  )
}

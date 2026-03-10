import { formatThrow, getThrowScore, type DartThrow } from '../../types/juno.types'
import { Undo2 } from 'lucide-react'

interface Props {
  throws: DartThrow[]
  onUndo: () => void
  canUndo: boolean
  isCricket?: boolean
  secretNumbers?: number[]
}

export function ThrowHistory({ throws, onUndo, canUndo, isCricket, secretNumbers }: Props) {
  const roundScore = throws.reduce((sum, t) => sum + getThrowScore(t), 0)

  // シークレットCricketでハズレかどうかを判定
  const isSecretMiss = (t: DartThrow): boolean => {
    if (secretNumbers === undefined) return false
    if (t === 'miss') return false
    return !secretNumbers.includes(t.number)
  }

  return (
    <div className="flex items-center gap-3">
      {[0, 1, 2].map((i) => {
        const t = throws[i]
        return (
          <div
            key={i}
            className={`flex-1 h-11 rounded-xl flex items-center justify-center font-bold text-sm border-2 transition-colors ${
              t !== undefined
                ? (isSecretMiss(t)
                    ? 'bg-[#1a1a2e] border-[#555] text-gray-500'
                    : 'bg-[#00d4ff]/20 border-[#00d4ff] text-white')
                : i === throws.length
                  ? 'border-[#00d4ff] border-dashed text-[#00d4ff]'
                  : 'border-[#333] bg-[#1a1a2e] text-gray-600'
            }`}
          >
            {t !== undefined ? (
              <div className="text-center">
                <div style={isSecretMiss(t) ? {} : { textShadow: '0 0 8px #00d4ff' }}>
                  {formatThrow(t)}
                </div>
                {!isCricket && <div className="text-xs text-gray-400">{getThrowScore(t)}pt</div>}
              </div>
            ) : (
              i === throws.length ? '?' : '-'
            )}
          </div>
        )
      })}
      <div className="w-16 text-center">
        <div className="text-xs text-gray-500">計</div>
        <div
          className="text-xl font-bold font-mono text-white"
          style={{ textShadow: '0 0 10px #00d4ff' }}
        >
          {roundScore}
        </div>
      </div>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="px-3 py-2 text-sm bg-[#252547] text-gray-400 rounded-lg hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Undo2 size={16} />
      </button>
    </div>
  )
}

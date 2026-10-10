import { ChevronRight } from 'lucide-react'

interface CricketMark {
  [number: number]: number // 15-20, 25 → マーク数
}

interface Props {
  players: { name: string; marks: CricketMark; score: number }[]
  currentPlayerIndex: number
  cricketNumbers: number[] // [20, 19, 18, 17, 16, 15, 25]
  secretMode?: boolean
  revealedNumbers?: number[]
}

function CricketMarkIcon({ count }: { count: number }) {
  if (count === 0) return <span className="text-gray-700">-</span>
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      {count >= 1 && (
        <line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {count >= 2 && (
        <line
          x1="18"
          y1="6"
          x2="6"
          y2="18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {count >= 3 && (
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      )}
    </svg>
  )
}

function getNumberLabel(n: number): string {
  return n === 25 ? 'BULL' : String(n)
}

export default function CricketScoreBoard({
  players,
  currentPlayerIndex,
  cricketNumbers,
  secretMode,
  revealedNumbers,
}: Props) {
  const playerColors = ['#ff6b6b', '#00d4ff', '#ffaa00', '#00ff88']

  // ナンバーが全プレイヤーともクローズ済みか判定
  const isClosed = (num: number) =>
    players.every((p) => (p.marks[num] ?? 0) >= 3)

  // プレイヤーを左右に分ける（常に4スロット対応: 左2 + 右2）
  const leftPlayers: (number | null)[] = [null, null]
  const rightPlayers: (number | null)[] = [null, null]

  if (players.length === 1) {
    leftPlayers[0] = 0
  } else if (players.length === 2) {
    leftPlayers[0] = 0
    rightPlayers[0] = 1
  } else if (players.length === 3) {
    leftPlayers[0] = 0
    leftPlayers[1] = 1
    rightPlayers[0] = 2
  } else if (players.length >= 4) {
    leftPlayers[0] = 0
    leftPlayers[1] = 1
    rightPlayers[0] = 2
    rightPlayers[1] = 3
  }

  // 左右に実際いるプレイヤー数をカウント
  const leftCount = leftPlayers.filter((p) => p !== null).length
  const rightCount = rightPlayers.filter((p) => p !== null).length
  const useSpan = players.length <= 2

  // 5列グリッド: 左2 | ナンバー3rem | 右2
  const gridTemplate = 'repeat(2, 1fr) 3rem repeat(2, 1fr)'

  // プレイヤースコア表示を描画
  const renderPlayerScore = (playerIndex: number) => {
    const player = players[playerIndex]
    return (
      <div
        style={{
          backgroundColor: currentPlayerIndex === playerIndex ? `${playerColors[playerIndex]}15` : 'transparent',
          border: currentPlayerIndex === playerIndex ? `1.5px solid ${playerColors[playerIndex]}50` : '1.5px solid transparent',
          borderRadius: '6px',
          padding: '6px 4px',
        }}
      >
        <div
          className="text-xs font-medium mb-1"
          style={{
            color:
              currentPlayerIndex === playerIndex ? playerColors[playerIndex] : '#9ca3af',
          }}
        >
          {currentPlayerIndex === playerIndex && <ChevronRight size={12} className="inline mr-0.5" />}
          {player.name}
        </div>
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color: playerColors[playerIndex] }}
        >
          {player.score}
        </div>
      </div>
    )
  }

  // マークを描画
  const renderMark = (playerIndex: number, num: number) => {
    const player = players[playerIndex]
    const isRevealed = !secretMode || revealedNumbers?.includes(num)
    return (
      <span style={{ color: playerColors[playerIndex] }}>
        {isRevealed ? (
          <CricketMarkIcon count={player.marks[num] ?? 0} />
        ) : (
          <span className="text-gray-700">-</span>
        )}
      </span>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden text-white select-none"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* スコア表示 */}
      <div
        className="text-center py-3 px-2"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          gap: '0.5rem',
        }}
      >
        {/* 左側プレイヤー */}
        {leftPlayers.filter((p) => p !== null).map((pIdx) => (
          <div
            key={`l${pIdx}`}
            style={{
              gridColumn: useSpan && leftCount === 1 ? 'span 2' : undefined,
            }}
          >
            {renderPlayerScore(pIdx!)}
          </div>
        ))}
        {/* 左側が0人の場合、空のspan 2セル */}
        {leftCount === 0 && <div style={{ gridColumn: 'span 2' }} />}

        {/* 中央（ナンバー列スペース） */}
        <div />

        {/* 右側プレイヤー */}
        {rightPlayers.filter((p) => p !== null).map((pIdx) => (
          <div
            key={`r${pIdx}`}
            style={{
              gridColumn: useSpan && rightCount === 1 ? 'span 2' : undefined,
            }}
          >
            {renderPlayerScore(pIdx!)}
          </div>
        ))}
        {/* 右側が0人の場合、空のspan 2セル */}
        {rightCount === 0 && <div style={{ gridColumn: 'span 2' }} />}
      </div>

      {/* マーク表 */}
      <div className="px-2 pb-2">
        {cricketNumbers.map((num) => {
          const isRevealed = !secretMode || revealedNumbers?.includes(num)
          const closed = isClosed(num)
          return (
            <div
              key={num}
              style={{
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                gap: '0.5rem',
                alignItems: 'center',
                paddingTop: '0.375rem',
                paddingBottom: '0.375rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                opacity: closed ? 0.35 : 1,
              }}
            >
              {/* 左側プレイヤーのマーク */}
              {leftPlayers.filter((p) => p !== null).map((pIdx) => (
                <div
                  key={`l${pIdx}`}
                  className="flex justify-center"
                  style={{
                    backgroundColor:
                      currentPlayerIndex === pIdx
                        ? `${playerColors[pIdx]}10`
                        : 'transparent',
                    gridColumn: useSpan && leftCount === 1 ? 'span 2' : undefined,
                  }}
                >
                  {renderMark(pIdx!, num)}
                </div>
              ))}
              {/* 左側が0人の場合、空のspan 2セル */}
              {leftCount === 0 && <div style={{ gridColumn: 'span 2' }} />}

              {/* 中央（ナンバーラベル） */}
              <div
                className="text-center text-sm font-bold"
                style={{
                  backgroundColor: '#252547',
                  borderRadius: 4,
                  padding: '2px 0',
                }}
              >
                {isRevealed ? getNumberLabel(num) : '???'}
              </div>

              {/* 右側プレイヤーのマーク */}
              {rightPlayers.filter((p) => p !== null).map((pIdx) => (
                <div
                  key={`r${pIdx}`}
                  className="flex justify-center"
                  style={{
                    backgroundColor:
                      currentPlayerIndex === pIdx
                        ? `${playerColors[pIdx]}10`
                        : 'transparent',
                    gridColumn: useSpan && rightCount === 1 ? 'span 2' : undefined,
                  }}
                >
                  {renderMark(pIdx!, num)}
                </div>
              ))}
              {/* 右側が0人の場合、空のspan 2セル */}
              {rightCount === 0 && <div style={{ gridColumn: 'span 2' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

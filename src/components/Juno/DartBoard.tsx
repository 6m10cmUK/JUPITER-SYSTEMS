import type { Segment, DartThrow } from '../../types/juno.types'
import { generateBoardPaths, getSegmentColor, getNumberLabelPositions, BOARD_SIZE, BOARD_CENTER, RADIUS } from '../../data/dartboard'
import { DartBoardSegment } from './DartBoardSegment'
import { useMemo } from 'react'

interface Props {
  onHit: (segment: Segment) => void
  onMiss: () => void
  disabled?: boolean
  currentThrows?: DartThrow[]
  waitingConfirm?: boolean
  onConfirm?: () => void
  cricketNumbers?: number[]
  closedNumbers?: number[]
  playerColor?: string
  deadNumbers?: number[]
  checkoutSegments?: Segment[]
  triedMissNumbers?: number[]
  hideThrowHighlight?: boolean
}

function segmentKey(s: Segment): string {
  return `${s.number}-${s.multiplier}`
}

export function DartBoard({ onHit, onMiss, disabled, currentThrows = [], waitingConfirm, onConfirm, cricketNumbers, closedNumbers, playerColor, deadNumbers, checkoutSegments = [], triedMissNumbers, hideThrowHighlight = false }: Props) {
  const paths = useMemo(() => generateBoardPaths(), [])
  const labels = useMemo(() => getNumberLabelPositions(), [])

  const hitThrowIndex = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < currentThrows.length; i++) {
      const t = currentThrows[i]
      if (t === 'miss') continue
      map.set(segmentKey(t), i)
    }
    return map
  }, [currentThrows])

  const closedSet = useMemo(() => new Set(closedNumbers ?? []), [closedNumbers])
  const cricketSet = useMemo(() => new Set(cricketNumbers ?? []), [cricketNumbers])
  const deadSet = useMemo(() => new Set(deadNumbers ?? []), [deadNumbers])
  const triedMissSet = useMemo(() => new Set(triedMissNumbers ?? []), [triedMissNumbers])
  const checkoutKeys = useMemo(() => new Set(checkoutSegments.map(segmentKey)), [checkoutSegments])

  const { segmentPaths, missPath } = useMemo(() => {
    const segments = []
    let miss = null
    for (const p of paths) {
      if (p.segment === 'miss') {
        miss = p
      } else {
        segments.push(p)
      }
    }
    return { segmentPaths: segments, missPath: miss }
  }, [paths])

  return (
    <div className={`flex items-center justify-center h-full ${disabled ? 'pointer-events-none' : ''}`}>
      <svg
        viewBox={`-20 -20 ${BOARD_SIZE + 40} ${BOARD_SIZE + 40}`}
        className="w-full h-full max-w-md"
      >
        {/* ボード背景 */}
        <circle cx={BOARD_CENTER} cy={BOARD_CENTER} r={RADIUS.outerDouble + 5} fill="#2A2A2A" />

        {/* セグメント */}
        {segmentPaths.map((p, i) => {
          const segment = p.segment as Segment
          const isDead = deadNumbers && deadSet.has(segment.number)
          const isDimmed = isDead || (cricketNumbers && !cricketSet.has(segment.number))
          const isClosed = !isDead && closedNumbers && closedSet.has(segment.number)
          const isTriedMiss = triedMissNumbers && triedMissSet.has(segment.number)
          return (
            <g key={i}>
              <DartBoardSegment
                d={p.d}
                fill={getSegmentColor(p.boardIndex, segment.multiplier, segment.number)}
                segment={segment}
                onHit={onHit}
                hitThrowIndex={hideThrowHighlight ? -1 : (hitThrowIndex.get(segmentKey(segment)) ?? -1)}
                dimmed={isDimmed}
                isCheckout={checkoutKeys.has(segmentKey(segment))}
              />
              {/* クローズしたセグメントのハイライト層 */}
              {isClosed && playerColor && (() => {
                const isDoubleTriple = segment.multiplier === 'double' || segment.multiplier === 'triple'
                return (
                  <path
                    d={p.d}
                    fill={playerColor}
                    opacity={isDoubleTriple ? 0.7 : 0.45}
                    style={{
                      pointerEvents: 'none',
                      filter: isDoubleTriple
                        ? `drop-shadow(0 0 6px ${playerColor}) drop-shadow(0 0 12px ${playerColor})`
                        : `drop-shadow(0 0 4px ${playerColor})`,
                    }}
                  />
                )
              })()}

              {/* 紫オーバーレイ（ハズレ or シークレット時の全員クローズ） */}
              {(isTriedMiss || (isDead && triedMissNumbers)) && (
                <path
                  d={p.d}
                  fill="#6b21a8"
                  opacity={0.5}
                  style={{
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 4px #6b21a8)',
                  }}
                />
              )}
            </g>
          )
        })}

        {/* MISSリング */}
        {missPath && (
          <>
            <path
              d={missPath.d}
              fill="#1a1a1a"
              stroke="#555"
              strokeWidth={0.5}
              style={{ cursor: 'pointer' }}
              onClick={onMiss}
            />
            <text
              x={BOARD_CENTER}
              y={BOARD_CENTER - (RADIUS.outerDouble + RADIUS.missRing) / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#888"
              fontSize={12}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              MISS
            </text>
          </>
        )}

        {/* 数字ラベル */}
        {labels.map((l) => (
          <text
            key={l.number}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={14}
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {l.number}
          </text>
        ))}

        {/* 確認フェーズ: 円形オーバーレイ */}
        {waitingConfirm && (
          <>
            <circle
              cx={BOARD_CENTER}
              cy={BOARD_CENTER}
              r={RADIUS.missRing}
              fill="rgba(0,0,0,0.4)"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={onConfirm}
            />
            <text
              x={BOARD_CENTER}
              y={BOARD_CENTER}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={20}
              fontWeight="900"
              letterSpacing={4}
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8)) drop-shadow(0 0 30px rgba(255,255,255,0.5))',
              }}
            >
              NEXT PLAYER →
            </text>
          </>
        )}
      </svg>
    </div>
  )
}

import type { Segment } from '../../types/juno.types'

interface Props {
  d: string
  fill: string
  segment: Segment
  onHit: (segment: Segment) => void
  hitThrowIndex?: number  // -1=未ヒット, 0=1投目, 1=2投目, 2=3投目
  dimmed?: boolean
  isCheckout?: boolean
}

const THROW_COLORS = ['#00d4ff', '#00ff88', '#ffaa00'] as const
const CHECKOUT_COLOR = '#ffd700'

export function DartBoardSegment({ d, fill, segment, onHit, hitThrowIndex = -1, dimmed = false, isCheckout = false }: Props) {
  const isHit = hitThrowIndex >= 0
  const hitColor = isHit ? THROW_COLORS[hitThrowIndex] : null

  const activeFill = isHit ? hitColor! : isCheckout ? CHECKOUT_COLOR : fill
  const activeFilter = isHit
    ? `drop-shadow(0 0 8px ${hitColor})`
    : isCheckout
    ? `drop-shadow(0 0 6px ${CHECKOUT_COLOR}) drop-shadow(0 0 12px ${CHECKOUT_COLOR})`
    : 'none'
  const activeOpacity = dimmed && !isHit && !isCheckout ? 0.15 : 1

  return (
    <path
      d={d}
      fill={activeFill}
      stroke="#555"
      strokeWidth={0.5}
      opacity={activeOpacity}
      style={{
        cursor: 'pointer',
        transition: 'fill 0.15s, filter 0.15s, opacity 0.15s',
        filter: activeFilter,
      }}
      onClick={() => onHit(segment)}
    />
  )
}

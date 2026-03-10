import type { DartNumber, Multiplier, Segment } from '../types/juno.types'

export const BOARD_CENTER = 220
export const BOARD_SIZE = 440

export const RADIUS = {
  bullseye: 18,
  outerBull: 42,
  innerSingle: 100,
  triple: 108,
  outerTriple: 130,
  outerSingle: 170,
  double: 175,
  outerDouble: 192,
  missRing: 220,
} as const

export const BOARD_NUMBERS: DartNumber[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
]

const SEGMENT_ANGLE = 360 / 20

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function arcPath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number): string {
  const s1 = polarToCartesian(cx, cy, rOuter, startAngle)
  const e1 = polarToCartesian(cx, cy, rOuter, endAngle)
  const s2 = polarToCartesian(cx, cy, rInner, endAngle)
  const e2 = polarToCartesian(cx, cy, rInner, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ')
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
}

function ringPath(cx: number, cy: number, rInner: number, rOuter: number): string {
  // 外側リング（時計回り）
  // 内側リング（反時計回り）で穴を開ける
  return [
    `M ${cx - rOuter} ${cy}`,
    `A ${rOuter} ${rOuter} 0 1 0 ${cx + rOuter} ${cy}`,
    `A ${rOuter} ${rOuter} 0 1 0 ${cx - rOuter} ${cy}`,
    'Z',
    `M ${cx - rInner} ${cy}`,
    `A ${rInner} ${rInner} 0 1 1 ${cx + rInner} ${cy}`,
    `A ${rInner} ${rInner} 0 1 1 ${cx - rInner} ${cy}`,
    'Z',
  ].join(' ')
}

export interface SegmentPath {
  d: string
  segment: Segment | 'miss'
  boardIndex: number
}

export function generateBoardPaths(): SegmentPath[] {
  const cx = BOARD_CENTER
  const cy = BOARD_CENTER
  const paths: SegmentPath[] = []

  paths.push({
    d: circlePath(cx, cy, RADIUS.bullseye),
    segment: { number: 25, multiplier: 'double' },
    boardIndex: -1,
  })

  paths.push({
    d: ringPath(cx, cy, RADIUS.bullseye, RADIUS.outerBull),
    segment: { number: 25, multiplier: 'single' },
    boardIndex: -1,
  })

  for (let i = 0; i < 20; i++) {
    const num = BOARD_NUMBERS[i]
    const startAngle = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2
    const endAngle = startAngle + SEGMENT_ANGLE

    paths.push({
      d: arcPath(cx, cy, RADIUS.outerBull, RADIUS.triple, startAngle, endAngle),
      segment: { number: num, multiplier: 'single' },
      boardIndex: i,
    })

    paths.push({
      d: arcPath(cx, cy, RADIUS.triple, RADIUS.outerTriple, startAngle, endAngle),
      segment: { number: num, multiplier: 'triple' },
      boardIndex: i,
    })

    paths.push({
      d: arcPath(cx, cy, RADIUS.outerTriple, RADIUS.double, startAngle, endAngle),
      segment: { number: num, multiplier: 'single' },
      boardIndex: i,
    })

    paths.push({
      d: arcPath(cx, cy, RADIUS.double, RADIUS.outerDouble, startAngle, endAngle),
      segment: { number: num, multiplier: 'double' },
      boardIndex: i,
    })
  }

  // MISSリング（ダブルリングの外側）
  paths.push({
    d: ringPath(cx, cy, RADIUS.outerDouble, RADIUS.missRing),
    segment: 'miss',
    boardIndex: -1,
  })

  return paths
}

export function getSegmentColor(boardIndex: number, multiplier: Multiplier, number: DartNumber): string {
  // DARTSLIVE風: 赤/青(ダブル・トリプル)、黒/白(シングル)
  if (number === 25) {
    return multiplier === 'double' ? '#E83535' : '#1565C0'
  }
  const isEven = boardIndex % 2 === 0
  if (multiplier === 'double' || multiplier === 'triple') {
    return isEven ? '#E83535' : '#1565C0'
  }
  return isEven ? '#1A1A1A' : '#F0F0E8'
}

export function getNumberLabelPositions(): { x: number; y: number; number: DartNumber }[] {
  const labelRadius = RADIUS.outerDouble + 15
  return BOARD_NUMBERS.map((num, i) => {
    const angle = i * SEGMENT_ANGLE
    const pos = polarToCartesian(BOARD_CENTER, BOARD_CENTER, labelRadius, angle)
    return { ...pos, number: num }
  })
}

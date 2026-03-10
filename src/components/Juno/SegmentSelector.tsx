import { useState } from 'react'
import type { DartNumber, DartThrow } from '../../types/juno.types'
import { BOARD_NUMBERS } from '../../data/dartboard'

interface Props {
  onSelect: (dart: DartThrow) => void
  disabled?: boolean
}

export function SegmentSelector({ onSelect, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<DartNumber | null>(null)

  const handleMultiplierClick = (multiplier: 'single' | 'double' | 'triple') => {
    if (!selectedNumber) return
    if (selectedNumber === 25 && multiplier === 'triple') return
    onSelect({ number: selectedNumber, multiplier })
    setSelectedNumber(null)
  }

  const handleMiss = () => {
    onSelect('miss')
    setSelectedNumber(null)
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-500 hover:text-[#00d4ff] underline transition-colors"
      >
        {isOpen ? 'ボタン入力を閉じる' : 'ボタン入力を開く'}
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-[#1a1a2e] rounded-xl space-y-3 border border-[#333]">
          {selectedNumber === null ? (
            <>
              <p className="text-sm text-gray-400 font-semibold">数字を選択</p>
              <div className="grid grid-cols-7 gap-1.5">
                {BOARD_NUMBERS.map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedNumber(num)}
                    className="py-2 bg-[#252547] border border-[#444] rounded-lg text-sm font-semibold text-gray-300 hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] active:bg-[#00d4ff]/30 transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedNumber(25)}
                  className="col-span-2 py-2 bg-[#252547] border border-[#444] rounded-lg text-sm font-semibold text-gray-300 hover:bg-[#00d4ff]/20 hover:border-[#00d4ff] active:bg-[#00d4ff]/30 transition-colors"
                >
                  BULL
                </button>
                <button
                  onClick={handleMiss}
                  className="col-span-2 py-2 bg-[#252547] border border-[#444] rounded-lg text-sm font-semibold text-gray-400 hover:bg-[#333] transition-colors"
                >
                  MISS
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400 font-semibold">
                  {selectedNumber === 25 ? 'BULL' : selectedNumber} の倍率
                </p>
                <button
                  onClick={() => setSelectedNumber(null)}
                  className="text-xs text-gray-500 hover:text-[#00d4ff] underline"
                >
                  戻る
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMultiplierClick('single')}
                  className="flex-1 py-3 bg-[#252547] border-2 border-[#444] rounded-lg font-bold text-gray-300 hover:bg-[#333] active:bg-[#3a3a5e] transition-colors"
                >
                  {selectedNumber === 25 ? 'OUTER BULL (25)' : `S${selectedNumber} (${selectedNumber})`}
                </button>
                <button
                  onClick={() => handleMultiplierClick('double')}
                  className="flex-1 py-3 bg-[#ff3366]/10 border-2 border-[#ff3366] rounded-lg font-bold text-[#ff3366] hover:bg-[#ff3366]/20 active:bg-[#ff3366]/30 transition-colors"
                >
                  {selectedNumber === 25 ? 'BULL (50)' : `D${selectedNumber} (${selectedNumber * 2})`}
                </button>
                {selectedNumber !== 25 && (
                  <button
                    onClick={() => handleMultiplierClick('triple')}
                    className="flex-1 py-3 bg-[#00ff88]/10 border-2 border-[#00ff88] rounded-lg font-bold text-[#00ff88] hover:bg-[#00ff88]/20 active:bg-[#00ff88]/30 transition-colors"
                  >
                    {`T${selectedNumber} (${selectedNumber * 3})`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import type { GameAction, GameMode } from '../../types/juno.types'

const NAMES_STORAGE_KEY = 'juno-player-names'
const LAST_MODE_STORAGE_KEY = 'juno-last-mode'
const LAST_START_SCORE_STORAGE_KEY = 'juno-last-start-score'
const LAST_PLAYER_COUNT_STORAGE_KEY = 'juno-last-player-count'
const LAST_SHUFFLE_STORAGE_KEY = 'juno-last-shuffle'

function safeSetItem(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

function loadNameHistory(): string[] {
  try {
    const saved = localStorage.getItem(NAMES_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function saveNameHistory(names: string[]) {
  const history = loadNameHistory()
  const updated = [...new Set([...names.filter(n => n.trim()), ...history])].slice(0, 20)
  safeSetItem(NAMES_STORAGE_KEY, JSON.stringify(updated))
}

function loadLastMode(): GameMode {
  try {
    const saved = localStorage.getItem(LAST_MODE_STORAGE_KEY)
    if (saved && ['count-up', 'zero-one', 'cricket', 'cricket-secret'].includes(saved)) {
      return saved as GameMode
    }
  } catch {}
  return 'count-up'
}

function loadLastStartScore(): 301 | 501 | 701 {
  try {
    const saved = localStorage.getItem(LAST_START_SCORE_STORAGE_KEY)
    if (saved && ['301', '501', '701'].includes(saved)) {
      return Number(saved) as 301 | 501 | 701
    }
  } catch {}
  return 501
}

function loadLastPlayerCount(): number {
  try {
    const saved = localStorage.getItem(LAST_PLAYER_COUNT_STORAGE_KEY)
    if (saved) {
      const parsed = Number(saved)
      if (parsed >= 1 && parsed <= 4) {
        return parsed
      }
    }
  } catch {}
  return 2
}

function removeFromStorageHistory(nameToRemove: string) {
  const history = loadNameHistory()
  const updated = history.filter(name => name !== nameToRemove)
  safeSetItem(NAMES_STORAGE_KEY, JSON.stringify(updated))
}

interface Props {
  dispatch: React.Dispatch<GameAction>
}

export function PlayerSetup({ dispatch }: Props) {
  const [playerCount, setPlayerCount] = useState(loadLastPlayerCount)
  const [names, setNames] = useState<string[]>(['', '', '', ''])
  const [nameHistory, setNameHistory] = useState<string[]>([])
  const [selectedMode, setSelectedMode] = useState<GameMode>(loadLastMode)
  const [selectedStartScore, setSelectedStartScore] = useState<301 | 501 | 701>(loadLastStartScore)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isCricketSecret, setIsCricketSecret] = useState(loadLastMode() === 'cricket-secret')
  const [shuffle, setShuffle] = useState(() => {
    try { return localStorage.getItem(LAST_SHUFFLE_STORAGE_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    const history = loadNameHistory()
    setNameHistory(history)
    if (history.length > 0) {
      const prefilled = ['', '', '', ''].map((_, i) => history[i] ?? '')
      setNames(prefilled)
    }
  }, [])

  useEffect(() => {
    setIsCricketSecret(selectedMode === 'cricket-secret')
  }, [selectedMode])

  const handleStart = () => {
    let playerNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`)
    saveNameHistory(names.slice(0, playerCount).filter(n => n.trim()))
    const gameMode: GameMode = isCricketSecret ? 'cricket-secret' : selectedMode
    safeSetItem(LAST_MODE_STORAGE_KEY, gameMode)
    safeSetItem(LAST_PLAYER_COUNT_STORAGE_KEY, String(playerCount))
    safeSetItem(LAST_SHUFFLE_STORAGE_KEY, String(shuffle))
    if (gameMode === 'zero-one') {
      safeSetItem(LAST_START_SCORE_STORAGE_KEY, String(selectedStartScore))
    }
    if (shuffle) {
      for (let i = playerNames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerNames[i], playerNames[j]] = [playerNames[j], playerNames[i]]
      }
    }
    dispatch({ type: 'START_GAME', players: playerNames, mode: gameMode, startScore: selectedMode === 'zero-one' ? selectedStartScore : undefined })
  }

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names]
    newNames[index] = value
    setNames(newNames)
  }

  const getSuggestions = (index: number) => {
    const current = names[index].toLowerCase()
    const usedNames = names.slice(0, playerCount)
    if (!current) return nameHistory.filter(h => !usedNames.includes(h)).slice(0, 5)
    return nameHistory.filter(
      h => h.toLowerCase().includes(current) && !usedNames.includes(h)
    ).slice(0, 5)
  }

  const removeFromHistory = (nameToRemove: string) => {
    removeFromStorageHistory(nameToRemove)
    const updated = nameHistory.filter(name => name !== nameToRemove)
    setNameHistory(updated)
    // 入力フィールドにその名前が入っていたらクリア
    const newNames = names.map(n => n === nameToRemove ? '' : n)
    setNames(newNames)
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-5xl font-black text-[#00d4ff] tracking-wider drop-shadow-[0_0_20px_rgba(0,212,255,0.6)]">
          Juno
        </h1>
        <p className="text-gray-500 mt-2 text-sm tracking-widest uppercase">Darts Scorer</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2">プレイヤー人数</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                playerCount === n
                  ? 'bg-[#00d4ff] text-[#0a0a0a] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                  : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252547] border border-[#2a2a4a]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-400">プレイヤー名</label>
        {Array.from({ length: playerCount }, (_, i) => {
          const suggestions = getSuggestions(i)
          const showDropdown = focusedIndex === i && suggestions.length > 0

          return (
            <div key={i} className="relative">
              <input
                type="text"
                value={names[i]}
                onChange={(e) => handleNameChange(i, e.target.value)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                placeholder={`Player ${i + 1}`}
                className="w-full px-4 pr-10 py-3 bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/50 focus:border-[#00d4ff] relative z-10"
                autoFocus={false}
              />

              {names[i] && (
                <button
                  type="button"
                  onClick={() => handleNameChange(i, '')}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-20"
                >
                  ✕
                </button>
              )}

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden z-50 shadow-lg">
                  {suggestions.map((name) => (
                    <div
                      key={name}
                      className="w-full px-4 py-2 flex justify-between items-center text-white hover:bg-[#252547] transition-colors group"
                    >
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleNameChange(i, name)
                          setFocusedIndex(null)
                        }}
                        className="flex-1 text-left"
                      >
                        {name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeFromHistory(name)
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        className="text-gray-500 hover:text-red-400 active:text-red-400 transition-colors ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2">ゲームモード</label>
        <div className="flex gap-2">
          {([['count-up', 'Count Up'], ['zero-one', '01'], ['cricket', 'Cricket']] as const).map(([mode, label]) => {
            const disabled = mode === 'cricket' && playerCount < 2
            const isSelected = mode === 'cricket' ? (selectedMode === 'cricket' || selectedMode === 'cricket-secret') : selectedMode === mode
            return (
              <button
                key={mode}
                onClick={() => {
                  if (!disabled) {
                    if (mode === 'cricket') {
                      setSelectedMode('cricket')
                      setIsCricketSecret(false)
                    } else {
                      setSelectedMode(mode)
                    }
                  }
                }}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  disabled
                    ? 'bg-[#1a1a2e] text-gray-600 border border-[#2a2a4a] cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#00d4ff] text-[#0a0a0a] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                    : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252547] border border-[#2a2a4a]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        {selectedMode === 'zero-one' && (
          <div className="flex gap-2 mt-2">
            {([301, 501, 701] as const).map((score) => (
              <button
                key={score}
                onClick={() => setSelectedStartScore(score)}
                className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                  selectedStartScore === score
                    ? 'bg-[#00d4ff] text-[#0a0a0a] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                    : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252547] border border-[#2a2a4a]'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        )}
        {(selectedMode === 'cricket' || selectedMode === 'cricket-secret') && (
          <div className="flex gap-2 mt-2">
            {(['normal', 'secret'] as const).map((variant) => (
              <button
                key={variant}
                onClick={() => {
                  if (variant === 'normal') {
                    setSelectedMode('cricket')
                    setIsCricketSecret(false)
                  } else {
                    setSelectedMode('cricket-secret')
                    setIsCricketSecret(true)
                  }
                }}
                className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                  (variant === 'normal' && selectedMode === 'cricket') || (variant === 'secret' && selectedMode === 'cricket-secret')
                    ? 'bg-[#00d4ff] text-[#0a0a0a] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                    : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252547] border border-[#2a2a4a]'
                }`}
              >
                {variant === 'normal' ? 'Normal' : 'Secret'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-gray-400">順番をシャッフル</span>
        <button
          type="button"
          onClick={() => setShuffle(!shuffle)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            shuffle ? 'bg-[#00d4ff]' : 'bg-[#333]'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              shuffle ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <button
        onClick={handleStart}
        disabled={selectedMode === 'cricket' && playerCount < 2 || selectedMode === 'cricket-secret' && playerCount < 2}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          (selectedMode === 'cricket' || selectedMode === 'cricket-secret') && playerCount < 2
            ? 'bg-[#1a1a2e] text-gray-600 border border-[#2a2a4a] cursor-not-allowed'
            : 'bg-[#00d4ff] text-[#0a0a0a] hover:bg-[#00b8d9] active:bg-[#009db8] shadow-[0_0_25px_rgba(0,212,255,0.4)] hover:shadow-[0_0_35px_rgba(0,212,255,0.6)]'
        }`}
      >
        ゲーム開始
      </button>
    </div>
  )
}

import { useReducer, useEffect } from 'react'
import type { GameState } from '../lib/juno.types'
import { gameModeStrategies } from '../lib/gameModes'
import { gameReducer, initialState } from '../lib/gameReducer'

const STORAGE_KEY = 'juno-game'

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 最低限のバリデーション
      if (parsed && typeof parsed === 'object' && parsed.phase === 'playing' && Array.isArray(parsed.players) && typeof parsed.currentPlayerIndex === 'number') {
        return parsed as GameState
      }
    }
  } catch {
    /* 保存データが壊れているか localStorage が使えないときは新規で始める */
  }
  return initialState
}

export function useJunoGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState)

  useEffect(() => {
    if (state.phase === 'playing') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [state])

  const strategy = gameModeStrategies[state.mode]

  return { state, dispatch, strategy }
}

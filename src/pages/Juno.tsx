import { useEffect } from 'react'
import { useJunoGame } from '../hooks/useJunoGame'
import { PlayerSetup } from '../components/Juno/PlayerSetup'
import { GameView } from '../components/Juno/GameView'
import { ResultView } from '../components/Juno/ResultView'

export default function Juno() {
  const { state, dispatch, strategy } = useJunoGame()

  useEffect(() => {
    document.title = 'Juno - Darts Scorer'
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div className="h-[100dvh] bg-[#0a0a0a] overflow-hidden">
      <div className={`h-full max-w-4xl mx-auto px-4 overflow-hidden ${state.phase === 'playing' ? 'py-2' : 'py-6'}`}>
        {state.phase === 'setup' && <PlayerSetup dispatch={dispatch} />}
        {state.phase === 'playing' && (
          <GameView state={state} strategy={strategy} dispatch={dispatch} />
        )}
        {state.phase === 'result' && (
          <ResultView state={state} strategy={strategy} dispatch={dispatch} />
        )}
      </div>
    </div>
  )
}

import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GameBoard from '../components/GameBoard/GameBoard';

export default function GameScreen() {
  const { currentTurn, myUserId, opponentName, status, winner, mode, timerRemaining, resetGame } = useGameStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (status === 'idle') {
      navigate('/');
    }
  }, [status, navigate]);

  const handleLeave = () => {
    // We should call leaveMatch here, but since it's mock logic for MVP, we just reset
    resetGame();
    navigate('/');
  };

  const isMyTurn = currentTurn === myUserId;

  return (
    <div className="w-full max-w-lg flex flex-col items-center">
      {/* Header Info */}
      <div className="flex justify-between w-full items-center mb-6 glass-panel py-3 px-6 rounded-full font-bold">
        <div className={`text-lg ${isMyTurn ? 'text-brand-primary' : 'text-slate-500'}`}>
          You (X)
        </div>
        <div className="text-xl px-4 py-1 bg-slate-900 rounded-full text-slate-300">VS</div>
        <div className={`text-lg ${!isMyTurn ? 'text-brand-accent' : 'text-slate-500'}`}>
          {opponentName} (O)
        </div>
      </div>

      <div className="text-center w-full min-h-[40px] flex items-center justify-center">
        {mode === 'timed' && status === 'playing' && (
          <div className="font-mono text-xl text-amber-500">
             {timerRemaining}s
          </div>
        )}
      </div>

      <GameBoard />

      {/* Result Overlay */}
      <AnimatePresence>
        {status === 'finished' && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 bg-brand-dark/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6"
          >
            <h1 className="text-6xl font-black mb-4">
              {winner === 'me' ? (
                <span className="text-brand-primary">Victory!</span>
              ) : winner === 'opponent' ? (
                <span className="text-brand-accent">Defeat</span>
              ) : (
                <span className="text-slate-400">Draw</span>
              )}
            </h1>
            <button 
              onClick={handleLeave}
              className="mt-8 px-8 py-3 bg-white text-brand-dark font-bold rounded-full hover:scale-105 transition transform shadow-xl"
            >
              Return to Lobby
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

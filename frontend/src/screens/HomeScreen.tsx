import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { motion } from 'framer-motion';

export default function HomeScreen() {
  const joinMatchmaker = useGameStore(state => state.joinMatchmaker);
  const status = useGameStore(state => state.status);
  const navigate = useNavigate();

  // Watch for game start through match status
  React.useEffect(() => {
    if (status === 'playing') {
      navigate('/game');
    }
  }, [status, navigate]);

  const handleQuickMatch = async (mode: 'classic' | 'timed' | 'computer') => {
    try {
      await joinMatchmaker(mode);
    } catch(err) {
      console.error("Matchmaker Error", err);
    }
  };

  if (status === 'waiting') {
    return (
      <div className="flex flex-col items-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full mb-6" />
        <h2 className="text-xl font-medium text-slate-300">Finding Opponent...</h2>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 rounded-2xl w-full max-w-sm flex flex-col gap-4"
    >
      <h2 className="text-2xl font-bold text-center mb-4">Lobby</h2>
      <button onClick={() => handleQuickMatch('computer')} className="w-full bg-brand-primary/80 hover:bg-brand-primary text-white font-semibold py-4 rounded-xl transition border border-brand-primary-light shadow-lg">
        Play vs Computer
      </button>
      <button onClick={() => handleQuickMatch('classic')} className="w-full bg-slate-700 hover:bg-slate-600 font-semibold py-4 rounded-xl transition border border-slate-600 hover:border-slate-500">
        Classic Match (vs Human)
      </button>
      <button onClick={() => handleQuickMatch('timed')} className="w-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 font-semibold py-4 rounded-xl transition shadow-lg">
        Timed Match (30s turns)
      </button>
    </motion.div>
  );
}

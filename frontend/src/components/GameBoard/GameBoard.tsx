import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { motion } from 'framer-motion';

function Cell({ index }: { index: number }) {
  const board = useGameStore(state => state.board);
  const makeMove = useGameStore(state => state.makeMove);
  const myUserId = useGameStore(state => state.myUserId);
  const currentTurn = useGameStore(state => state.currentTurn);
  const status = useGameStore(state => state.status);

  const value = board[index];
  const isMyTurn = currentTurn === myUserId;
  const isPlayable = status === 'playing' && value === '' && isMyTurn;

  return (
    <motion.button
      whileHover={isPlayable ? { scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={() => makeMove(index)}
      disabled={!isPlayable}
      className={`h-24 md:h-32 w-full rounded-xl flex items-center justify-center text-5xl md:text-7xl font-black shadow-inner transition-colors border
        ${value === '' ? 'bg-brand-cell border-slate-700/50 hover:bg-slate-700' : 'bg-slate-800 border-slate-600'}
        ${isPlayable ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: value ? 1 : 0 }}
        className={value === 'X' ? 'text-brand-accent' : 'text-brand-primary'}
      >
        {value}
      </motion.span>
    </motion.button>
  );
}

export default function GameBoard() {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 w-full p-4 md:p-6 bg-slate-900/50 rounded-2xl shadow-xl mt-6 border border-slate-800">
      {[0,1,2,3,4,5,6,7,8].map(i => (
        <Cell key={i} index={i} />
      ))}
    </div>
  );
}

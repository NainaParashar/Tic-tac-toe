import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { motion } from 'framer-motion';

export default function AuthScreen() {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(nickname);
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-8 rounded-2xl w-full max-w-sm flex flex-col items-center"
    >
      <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-primary-light mb-2">LILA</h1>
      <p className="text-slate-400 mb-8 font-medium">Multiplayer Tic-Tac-Toe</p>

      <form onSubmit={handleLogin} className="w-full">
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Choose Nickname (Optional)</label>
          <input 
            type="text"
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-brand-primary transition-colors text-white"
            placeholder="e.g. Ace"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        
        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-semibold py-3 rounded-lg transition-colors flex justify-center mt-2 disabled:opacity-50"
        >
          {loading ? 'Entering...' : 'Play Now'}
        </button>
      </form>
    </motion.div>
  );
}


import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';
import { MailIcon, LockIcon, ChevronLeftIcon } from './icons';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onBack: () => void;
}

const InputField = ({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <motion.div
    className="relative"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400">
      {icon}
    </div>
    <input 
      {...props}
      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
    />
  </motion.div>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onLogin(email, password);
    if (!success) {
      setError(t('loginError'));
      setPassword('');
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.5 } },
    exit: { opacity: 0, y: -50 },
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-4 login-gradient-bg">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <button onClick={onBack} className="absolute top-6 left-6 text-slate-300 hover:text-white transition-colors">
            <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-white shadow-xl">
            {t('appName')}
          </h1>
          <p className="text-slate-300 mt-3 text-lg">{t('appSubtitle')}</p>
        </div>
        
        <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-slate-900/50 p-8 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden border border-slate-700/50"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-2 text-white">{t('welcomeBack')}</h2>
            <InputField icon={<MailIcon />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            <InputField icon={<LockIcon />} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
            {error && <p className="text-red-400 text-sm text-center !mt-4">{error}</p>}
            <motion.button whileHover={{scale: 1.05}} whileTap={{scale: 0.95}} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all text-lg">{t('signIn')}</motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};
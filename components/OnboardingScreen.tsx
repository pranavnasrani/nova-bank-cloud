import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';
import { GlobeIcon } from './icons';

interface WelcomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const slides = [
  {
    titleKey: 'carouselTitle1',
    imageUrl: 'https://i.ibb.co/k6WrpMf2/Google-AI-Studio-2025-10-04-T06-46-08-345-Z.png',
  },
  {
    titleKey: 'carouselTitle2',
    imageUrl: 'https://i.ibb.co/6JWY9ryP/Google-AI-Studio-2025-10-04-T06-45-20-664-Z.png',
  },
  {
    titleKey: 'carouselTitle3',
    imageUrl: 'https://i.ibb.co/7NQC8VyL/Google-AI-Studio-2025-10-04-T06-44-29-364-Z.png',
  },
  {
    titleKey: 'carouselTitle4',
    imageUrl: 'https://i.ibb.co/4n3W9b89/Google-AI-Studio-2025-10-04-T06-43-43-153-Z.png',
  },
];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const LanguageSelector = () => {
    const { language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    
    const handleLanguageChange = (lang: 'en' | 'es' | 'th' | 'tl') => {
        setLanguage(lang);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white/80 hover:text-white transition-colors">
                <GlobeIcon className="w-6 h-6" />
            </button>
            <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-32 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl overflow-hidden"
                >
                    <button onClick={() => handleLanguageChange('en')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-indigo-600">English</button>
                    <button onClick={() => handleLanguageChange('es')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-indigo-600">Español</button>
                    <button onClick={() => handleLanguageChange('th')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-indigo-600">ภาษาไทย</button>
                    <button onClick={() => handleLanguageChange('tl')} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-indigo-600">Tagalog</button>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    )
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const { t } = useTranslation();
  const [[page, direction], setPage] = useState([0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
        setPage(([prevPage, prevDirection]) => [(prevPage + 1) % slides.length, 1]);
    }, 4000); // Change slide every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const slide = slides[page];

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center justify-between p-6 login-gradient-bg overflow-hidden relative">
      <div className="absolute top-6 right-6 z-20">
          <LanguageSelector />
      </div>

      <div className="w-full max-w-md flex-grow flex flex-col justify-center items-center pt-16">
        <div className="relative w-full aspect-[4/5] rounded-3xl mb-8 overflow-hidden shadow-2xl bg-slate-900">
           <AnimatePresence initial={false} custom={direction}>
                <motion.img
                    key={page}
                    src={slide.imageUrl}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.3 }
                    }}
                    className="absolute w-full h-full object-cover"
                />
            </AnimatePresence>
        </div>

        <motion.div
            key={`text-${page}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-center"
        >
          <h1 className="text-4xl font-bold">{t(slide.titleKey as any)}</h1>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        className="w-full max-w-md flex flex-col items-center gap-4 pb-4">
        <motion.button
          onClick={onNavigateToRegister}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg"
        >
            {t('getStarted')}
        </motion.button>
        <motion.button
          onClick={onNavigateToLogin}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg"
        >
            {t('logIn')}
        </motion.button>
      </motion.div>
    </div>
  );
};
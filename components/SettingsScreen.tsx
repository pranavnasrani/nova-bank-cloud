import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { BankContext } from '../App';
import { LogoutIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

export const SettingsScreen = () => {
    const { currentUser, logout } = useContext(BankContext);
    const { t, language, setLanguage } = useTranslation();

    return (
        <div className="p-4 flex flex-col gap-6 text-white">
            <div className="bg-slate-800 p-6 rounded-3xl flex items-center gap-4">
                <img src={currentUser?.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full border-2 border-indigo-400"/>
                <div>
                    <h2 className="text-xl font-bold">{currentUser?.name}</h2>
                    <p className="text-slate-400">@{currentUser?.username}</p>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-2xl">
                <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-2">{t('language')}</label>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'es' | 'th' | 'tl')}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="th">ภาษาไทย</option>
                    <option value="tl">Tagalog</option>
                </select>
            </div>

            <motion.button
                onClick={logout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-slate-800 hover:bg-red-500/20 text-red-400 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                <LogoutIcon className="w-5 h-5"/>
                {t('signOut')}
            </motion.button>
        </div>
    );
};
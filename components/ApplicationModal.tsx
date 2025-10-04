import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BankContext } from '../App';
import { CheckCircleIcon, XCircleIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationType: 'Card' | 'Loan';
}

type ApplicationStatus = 'pending' | 'submitting' | 'success' | 'rejected';

export const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, applicationType }) => {
  const { currentUser, addCardToUser, addLoanToUser } = useContext(BankContext);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || '',
    address: '',
    dateOfBirth: '',
    employmentStatus: 'Employed',
    employer: '',
    annualIncome: '',
    loanAmount: '10000',
    loanTerm: '36',
  });
  const [status, setStatus] = useState<ApplicationStatus>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
        // Reset form on open
        setFormData({
            fullName: currentUser?.name || '',
            address: '',
            dateOfBirth: '',
            employmentStatus: 'Employed',
            employer: '',
            annualIncome: '',
            loanAmount: '10000',
            loanTerm: '36',
        });
        setStatus('pending');
        setMessage('');
    }
  }, [isOpen, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    setTimeout(() => { // Simulate network delay
        const baseDetails = {
            fullName: formData.fullName,
            address: formData.address,
            dateOfBirth: formData.dateOfBirth,
            employmentStatus: formData.employmentStatus,
            employer: formData.employer,
            annualIncome: parseFloat(formData.annualIncome) || 0,
        };

        if (applicationType === 'Card') {
            const result = addCardToUser(baseDetails);
            setMessage(result.message);
            setStatus(result.success ? 'success' : 'rejected');
        } else {
            const loanDetails = {
                ...baseDetails,
                loanAmount: parseFloat(formData.loanAmount) || 0,
                loanTerm: parseInt(formData.loanTerm, 10) || 0,
            };
            const result = addLoanToUser(loanDetails);
            setMessage(result.message);
            setStatus(result.success ? 'success' : 'rejected');
        }
    }, 1500);
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-700/50 p-3 rounded-xl text-xs text-slate-300 space-y-1">
        <h4 className="font-bold text-sm text-slate-200">{t('pleaseNote')}</h4>
        {applicationType === 'Card' ? (
            <p><strong>{t('repAPR')}:</strong> {t('cardAPRNote')}</p>
        ) : (
            <p><strong>{t('interestRates')}:</strong> {t('loanAPRNote')}</p>
        )}
      </div>
      <InputField name="fullName" label={t('fullName')} value={formData.fullName} onChange={handleChange} />
      <InputField name="address" label={t('address')} value={formData.address} onChange={handleChange} placeholder={t('addressPlaceholder')} />
      <InputField name="dateOfBirth" label={t('dateOfBirth')} value={formData.dateOfBirth} onChange={handleChange} type="date" />
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{t('employmentStatus')}</label>
        <select name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>{t('employed')}</option>
            <option>{t('selfEmployed')}</option>
            <option>{t('unemployed')}</option>
            <option>{t('student')}</option>
        </select>
      </div>
      <InputField name="employer" label={t('employer')} value={formData.employer} onChange={handleChange} placeholder={t('employerPlaceholder')}/>
      <InputField name="annualIncome" label={t('annualIncome')} value={formData.annualIncome} onChange={handleChange} type="number" placeholder="e.g., 50000" />
      
      {applicationType === 'Loan' && (
        <>
            <InputField name="loanAmount" label={t('loanAmount')} value={formData.loanAmount} onChange={handleChange} type="number" />
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('loanTerm')}</label>
                <select name="loanTerm" value={formData.loanTerm} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="24">24 {t('months')}</option>
                    <option value="36">36 {t('months')}</option>
                    <option value="48">48 {t('months')}</option>
                    <option value="60">60 {t('months')}</option>
                </select>
            </div>
        </>
      )}
      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all" disabled={status === 'submitting'}>
        {status === 'submitting' ? t('submitting') : t('submitApplication')}
      </button>
    </form>
  );
  
  const renderResult = () => {
      const isSuccess = status === 'success';
      const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;
      const colorClass = isSuccess ? 'text-green-400' : 'text-red-400';

      return (
        <motion.div initial={{opacity: 0, scale: 0.8}} animate={{opacity: 1, scale: 1}} className="text-center flex flex-col items-center gap-4">
            <Icon className={`w-20 h-20 ${colorClass}`} />
            <h3 className={`text-xl font-bold ${colorClass}`}>{isSuccess ? t('approved') : t('applicationDenied')}</h3>
            <p className="text-slate-300">{message}</p>
            <button onClick={onClose} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all mt-4">
                {t('close')}
            </button>
        </motion.div>
      );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-slate-800 w-full max-w-md rounded-3xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-white">{t('newApplication', { type: applicationType })}</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </header>
            
            <div className="p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={status}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        {status === 'pending' || status === 'submitting' ? renderForm() : renderResult()}
                    </motion.div>
                </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const InputField = ({ name, label, value, onChange, type = 'text', placeholder = '' } : { name: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, placeholder?: string }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        {/* FIX: Removed the non-standard <style jsx> tag which caused a type error, and applied Tailwind classes directly for styling. */}
        <input 
            type={type} 
            name={name}
            id={name}
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
    </div>
);
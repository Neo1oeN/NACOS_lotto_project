import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Shield, Lock, User, Ticket, ArrowRight, ChevronRight } from 'lucide-react';

const ADMIN_REG_NUMBER = 'EU - AD - ADM - 01 - 001';

export default function Auth() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegChange = (val: string) => {
    // Remove all non-alphanumeric characters and limit to 12 chars
    const cleaned = val.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12);
    
    // Format: XX - XX - XXX - XX - XXX
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = formatted.slice(0, 2) + ' - ' + formatted.slice(2);
    }
    if (cleaned.length > 4) {
      formatted = formatted.slice(0, 7) + ' - ' + formatted.slice(7);
    }
    if (cleaned.length > 7) {
      formatted = formatted.slice(0, 13) + ' - ' + formatted.slice(13);
    }
    if (cleaned.length > 9) {
      formatted = formatted.slice(0, 18) + ' - ' + formatted.slice(18);
    }
    
    setRegNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const canonicalId = regNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (!canonicalId) {
      setError('Registration Number is required.');
      return;
    }

    if (isAdminMode && !password) {
      setError('Admin Security Key is required.');
      return;
    }

    setLoading(true);
    
    // ISOLATE namespaces to prevent collisions between admin and user roles for the same ID
    const adminCanonicalId = ADMIN_REG_NUMBER.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const emailPrefix = isAdminMode ? 'admin' : 'user';
    const email = `${emailPrefix}_${canonicalId.toLowerCase()}@lottery.app`;
    
    // User password is deterministic, Admin password is explicit
    const finalPassword = isAdminMode ? password : `USER_PASS_${canonicalId}`;

    try {
      try {
        await signInWithEmailAndPassword(auth, email, finalPassword);
      } catch (signInErr: any) {
        // If account doesn't exist, auto-register for users or specific admin ID
        const isInitialAdmin = isAdminMode && canonicalId === adminCanonicalId;
        const isRegularUser = !isAdminMode;

        if (signInErr.code === 'auth/user-not-found' && (isRegularUser || isInitialAdmin)) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, finalPassword);
          const user = userCredential.user;
          
          await setDoc(doc(db, 'users', user.uid), {
            regNumber: regNumber || canonicalId,
            role: isAdminMode ? 'admin' : 'user',
            createdAt: serverTimestamp(),
          });
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error('Auth Error:', err.code, err.message);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(isAdminMode ? 'Invalid Admin credentials.' : 'Something went wrong. Please check your ID.');
      } else if (err.code === 'auth/user-not-found' && isAdminMode) {
        setError('Admin account not found.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This account exists but requires a different login method.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header Section */}
        <div className={`p-8 text-center transition-colors duration-500 ${isAdminMode ? 'bg-primary' : 'bg-primary'}`}>
          <div className="flex justify-center mb-6">
            <motion.div 
              key={isAdminMode ? 'admin' : 'user'}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-accent/20 p-5 rounded-3xl backdrop-blur-md border border-white/10"
            >
              {isAdminMode ? (
                <Shield className="w-10 h-10 text-accent" />
              ) : (
                <Ticket className="w-10 h-10 text-accent" />
              )}
            </motion.div>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">NACOS LOTTERY</h1>
          <p className="text-white/60 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">
            {isAdminMode ? 'Administrator Portal' : 'User Access Dashboard'}
          </p>

          <button 
            onClick={() => { setIsAdminMode(!isAdminMode); setError(''); }}
            className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white border border-white/10 transition-all flex items-center gap-2 mx-auto"
          >
            {isAdminMode ? <User className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
            {isAdminMode ? 'Switch to User Access' : 'Switch to Admin Login'}
          </button>
        </div>

        {/* Content Section */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100 flex items-start gap-3 italic"
              >
                <span className="mt-0.5">⚠️</span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                <User className="w-3 h-3" /> Registration Number
              </label>
              <input
                type="text"
                placeholder={isAdminMode ? "Admin ID" : "EU - XX - XXX - XX - XXX"}
                value={regNumber}
                onChange={(e) => handleRegChange(e.target.value)}
                className="w-full px-6 py-5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-mono text-sm tracking-widest bg-slate-50/50"
                required
              />
            </div>

            {isAdminMode && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="space-y-2"
              >
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Lock className="w-3 h-3" /> Security Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-mono"
                  required={isAdminMode}
                />
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-light transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isAdminMode ? 'Authorize Access' : 'Enter Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {!isAdminMode && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Enter your registration number to access your unique lottery tickets and payment history instantly.
              </p>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}

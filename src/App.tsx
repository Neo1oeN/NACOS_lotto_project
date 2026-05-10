/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { Shield, User, Ticket, LogOut } from 'lucide-react';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const profile = snap.data();
          setUserProfile(profile);
          // If the user is an admin by role, maybe default to admin view?
          // But let's respect their choice or just allow switching.
          if (profile.role === 'admin') setView('admin');
        }
        setProfileLoading(false);
      });
    } else {
      setUserProfile(null);
    }
  }, [user]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-primary text-white border-b border-primary-light shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent p-1.5 rounded-lg hover:rotate-12 transition-transform cursor-pointer" onClick={() => setView('user')}>
              <Ticket className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight cursor-pointer" onClick={() => setView('user')}>NACOS LOTTERY</span>
          </div>
          
          <div className="flex items-center gap-4">
            {userProfile?.role === 'admin' && (
              <button
                onClick={() => setView(view === 'user' ? 'admin' : 'user')}
                className={`group flex items-center gap-2 transition-all text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg border ${
                  view === 'admin' 
                  ? 'bg-accent text-primary border-accent' 
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                }`}
              >
                {view === 'user' ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Admin Portal
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    User Dashboard
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => auth.signOut()}
              className="flex items-center gap-2 hover:text-accent transition-colors text-xs font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded-lg border border-white/10"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {view === 'admin' && userProfile?.role === 'admin' ? (
          <AdminPanel />
        ) : (
          <UserDashboard 
            overrideRegNumber={userProfile?.regNumber} 
          />
        )}
      </main>
    </div>
  );
}


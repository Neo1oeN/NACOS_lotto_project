import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  getDocs,
  query,
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  CheckCircle, 
  XSquare, 
  Settings, 
  Database, 
  Edit3, 
  Eye, 
  DollarSign, 
  Users, 
  Ticket as TicketIcon,
  RefreshCw,
  Plus
} from 'lucide-react';
import { generateLotteryNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface User {
  id: string;
  regNumber: string;
  role: 'user' | 'admin';
  createdAt: any;
}

interface Receipt {
  id: string;
  userId: string;
  regNumber: string;
  imageUrl: string;
  note: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  amount?: number;
  createdAt: any;
  verifiedAt?: any;
}

interface Ticket {
  id: string;
  userId: string;
  regNumber: string;
  lotteryNumber: string;
  receiptId: string;
  createdAt: any;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'summary' | 'queue' | 'tickets' | 'settings' | 'texts'>('summary');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // For modals/actions
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyAmount, setVerifyAmount] = useState<number>(0);

  useEffect(() => {
    const unsubReceipts = onSnapshot(collection(db, 'receipts'), (snap) => {
      setReceipts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt)));
    });
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snap) => {
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      } else {
        setSettings({
          bankName: "Sample Bank",
          accountNumber: "0123456789",
          accountName: "NACOS Account",
          ticketPrice: 1000,
          realTotal: 0,
          uiTexts: {
            welcome_message: "Welcome to NACOS Lottery",
            payment_instruction: "Make payment and upload receipt.",
            footer_text: "NACOS © 2024",
            ticket_button_copy: "Copy Ticket"
          }
        });
      }
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    setLoading(false);
    return () => {
      unsubReceipts();
      unsubTickets();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  const handleVerify = async (receipt: any) => {
    try {
      const lotteryNumber = generateLotteryNumber();
      
      // Update real total and create ticket atomically
      await runTransaction(db, async (transaction) => {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await transaction.get(settingsRef);
        let currentRealTotal = 0;
        if (settingsSnap.exists()) {
          currentRealTotal = settingsSnap.data().realTotal || 0;
        }

        // 1. Update Receipt Status
        transaction.update(doc(db, 'receipts', receipt.id), {
          status: 'verified',
          amount: verifyAmount,
          verifiedAt: serverTimestamp()
        });

        // 2. Create Ticket
        const ticketRef = doc(collection(db, 'tickets'));
        transaction.set(ticketRef, {
          userId: receipt.userId,
          regNumber: receipt.regNumber,
          lotteryNumber,
          receiptId: receipt.id,
          createdAt: serverTimestamp()
        });

        // 3. Update Real Total
        transaction.set(settingsRef, {
          realTotal: currentRealTotal + Number(verifyAmount)
        }, { merge: true });
      });

      setVerifyingId(null);
      setVerifyAmount(0);
      alert('Receipt verified and ticket generated!');
    } catch (error) {
      console.error(error);
      alert('Verification failed.');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    await updateDoc(doc(db, 'receipts', id), {
      status: 'rejected',
      rejectionReason: reason
    });
  };

  const updateSetting = async (field: string, value: any) => {
    await setDoc(doc(db, 'settings', 'global'), { [field]: value }, { merge: true });
  };

  const updateUIText = async (key: string, value: string) => {
    const newTexts = { ...settings.uiTexts, [key]: value };
    await updateSetting('uiTexts', newTexts);
  };

  if (loading || !settings) return <div className="p-8 text-center">Loading Admin Panel...</div>;

  const realTotal = settings.realTotal || 0;
  const editedTotal = settings.editedTotalReward;
  const displayTotal = editedTotal !== undefined ? editedTotal : realTotal;

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-primary text-white p-6 space-y-8 hidden md:block border-r border-primary-light">
        <div className="text-xl font-black tracking-tighter italic border-b border-white/10 pb-4 mb-4">ADMIN CORE</div>
        <nav className="space-y-2">
          {[
            { id: 'summary', icon: LayoutDashboard, label: 'Overview' },
            { id: 'queue', icon: CheckCircle, label: 'Verification Queue' },
            { id: 'tickets', icon: Database, label: 'Global Tickets' },
            { id: 'settings', icon: Settings, label: 'System Settings' },
            { id: 'texts', icon: Edit3, label: 'UI Text Editor' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold tracking-wide ${
                activeTab === tab.id ? 'bg-white/10 text-accent shadow-inner' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-primary capitalize flex items-center gap-3 italic">
            {activeTab.replace('_', ' ')}
            <span className="text-xs non-italic font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest block ml-2">Secure Panel</span>
          </h2>
          <div className="flex gap-4">
             <div className="bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-200">
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real Pool</div>
               <div className="text-lg font-black text-primary">₦ {realTotal.toLocaleString()}</div>
             </div>
             {editedTotal !== undefined && (
               <div className="bg-amber-50 px-5 py-2.5 rounded-xl shadow-sm border border-amber-200">
                 <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Display Total</div>
                 <div className="text-lg font-black text-amber-600">₦ {editedTotal.toLocaleString()}</div>
               </div>
             )}
          </div>
        </header>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <SummaryCard icon={TicketIcon} label="Total Tickets" value={tickets.length} color="primary" />
              <SummaryCard icon={CheckCircle} label="Total Verified" value={receipts.filter(r => r.status === 'verified').length} color="green" />
              <SummaryCard icon={RefreshCw} label="Pending" value={receipts.filter(r => r.status === 'pending').length} color="amber" />
              <SummaryCard icon={Users} label="Total Users" value={users.length} color="blue" />
            </motion.div>
          )}

          {activeTab === 'queue' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Reg Number</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Receipt</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Time</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Note</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/70 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic">
                  {receipts.filter(r => r.status === 'pending').map(receipt => (
                    <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-primary font-mono">{receipt.regNumber}</td>
                      <td className="px-6 py-4">
                        <a href={receipt.imageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:text-primary-light font-bold text-xs">
                          <Eye className="w-4 h-4" /> View Image
                        </a>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{receipt.createdAt?.toDate().toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs text-slate-600 truncate max-w-[150px]">{receipt.note || '-'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => { setVerifyingId(receipt.id); setVerifyAmount(settings.ticketPrice || 1000); }} className="bg-primary text-white p-2 rounded-lg hover:bg-primary-light transition-all shadow-md shadow-primary/20">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleReject(receipt.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-all">
                          <XSquare className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {receipts.filter(r => r.status === 'pending').length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No pending verifications. All clear!</td></tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'tickets' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-primary/5 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest italic">Global Ledger</span>
                  <div className="text-xs text-slate-400 font-mono">COUNT: {tickets.length}</div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Reg Number</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Lottery Number</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Generated On</th>
                    </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                    {tickets.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold font-mono">{ticket.regNumber}</td>
                        <td className="px-6 py-4">
                          <span className="bg-accent/10 px-3 py-1 rounded-lg text-accent font-black font-mono tracking-widest">{ticket.lotteryNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">{ticket.createdAt?.toDate().toLocaleString()}</td>
                      </tr>
                    ))}
                   </tbody>
                 </table>
               </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <h3 className="font-black text-xl text-primary border-b border-slate-100 pb-4 flex items-center gap-2 italic">
                  <DollarSign className="w-5 h-5" /> Reward Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Ticket Price (₦)</label>
                    <input 
                      type="number" 
                      defaultValue={settings.ticketPrice} 
                      onBlur={(e) => updateSetting('ticketPrice', Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                  </div>
                  <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 space-y-3">
                    <label className="text-xs font-bold text-amber-600 uppercase tracking-widest block">Manual Display Override</label>
                    <div className="flex gap-2">
                       <input 
                        type="number" 
                        value={settings.editedTotalReward || ''} 
                        onChange={(e) => updateSetting('editedTotalReward', e.target.value === '' ? undefined : Number(e.target.value))}
                        className="w-full p-3 bg-white rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/20 font-mono placeholder:text-slate-300"
                        placeholder="Leave blank to use Real Pool"
                      />
                      <button onClick={() => updateSetting('editedTotalReward', undefined)} className="bg-white px-4 border border-amber-200 rounded-lg text-amber-600 font-bold text-xs hover:bg-amber-100 transition-colors">RESET</button>
                    </div>
                    <p className="text-[10px] text-amber-700 italic">Overrides the real total shown on user dashboard. Leave empty to display calculated sum of verified payments.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <h3 className="font-black text-xl text-primary border-b border-slate-100 pb-4 flex items-center gap-2 italic">
                  <RefreshCw className="w-5 h-5" /> Bank Details
                </h3>
                <div className="space-y-4">
                   <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Bank Name</label>
                    <input 
                      type="text" 
                      defaultValue={settings.bankName} 
                      onBlur={(e) => updateSetting('bankName', e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Account Number</label>
                    <input 
                      type="text" 
                      defaultValue={settings.accountNumber} 
                      onBlur={(e) => updateSetting('accountNumber', e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Account Name</label>
                    <input 
                      type="text" 
                      defaultValue={settings.accountName} 
                      onBlur={(e) => updateSetting('accountName', e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'texts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto space-y-10">
              <header className="border-b border-slate-100 pb-6 flex items-center justify-between">
                <div>
                   <h3 className="font-black text-2xl text-primary flex items-center gap-2 italic"><Edit3 className="w-6 h-6" /> Text Editor</h3>
                   <p className="text-slate-400 text-sm mt-1">Changes are live and instant across all user dashboards.</p>
                </div>
                <div className="bg-primary/5 text-primary text-[10px] uppercase font-black tracking-[0.2em] px-4 py-2 rounded-full border border-primary/10">No-Code Interface</div>
              </header>

              <div className="space-y-8">
                {Object.keys(settings.uiTexts || {}).map(key => (
                  <div key={key} className="space-y-3 group">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-primary transition-colors">{key.replace('_', ' ')}</label>
                      <span className="text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">ID: {key}</span>
                    </div>
                    <textarea 
                      defaultValue={settings.uiTexts[key]} 
                      onBlur={(e) => updateUIText(key, e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-700 italic leading-relaxed"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Modal */}
        <AnimatePresence>
          {verifyingId && (
            <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6">
                <h4 className="text-xl font-bold text-primary flex items-center gap-2">
                  <CheckCircle className="text-green-500" /> Verify Payment
                </h4>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2">Amount Paid (₦)</label>
                    <input 
                      type="number" 
                      value={verifyAmount} 
                      onChange={(e) => setVerifyAmount(Number(e.target.value))}
                      className="w-full p-4 bg-white rounded-xl border border-slate-200 font-mono text-xl font-black text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight italic">Enter the exact amount confirmed from the receipt. This will be added to the Global Real Pool.</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setVerifyingId(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Cancel</button>
                   <button onClick={() => handleVerify(receipts.find(r => r.id === verifyingId))} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-light transition-all shadow-lg shadow-primary/20">Verify</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: any) {
  const colorMap: any = {
    primary: 'bg-primary text-white',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow group">
      <div className={`p-4 rounded-xl ${colorMap[color] || colorMap.primary} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{label}</div>
        <div className="text-2xl font-black text-primary italic font-mono">{value}</div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDoc,
  doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Upload, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Ticket as TicketIcon, 
  Copy, 
  Printer, 
  Download,
  Wallet,
  History,
  Info,
  User as UserIcon
} from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';

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

export default function UserDashboard({ overrideRegNumber }: { overrideRegNumber: string | null }) {
  const { settings, uiTexts } = useSettings();
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overrideRegNumber) return;

    const rq = query(collection(db, 'receipts'), where('regNumber', '==', overrideRegNumber));
    const unsubscribeReceipts = onSnapshot(rq, (snapshot) => {
      setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt)));
    });

    const tq = query(collection(db, 'tickets'), where('regNumber', '==', overrideRegNumber));
    const unsubscribeTickets = onSnapshot(tq, (snapshot) => {
      const ts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      setTickets(ts);
      if (ts.length > 0) {
        // Find the newest ticket to animate
        const sorted = [...ts].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setActiveTicketId(sorted[0].id);
      }
    });

    return () => {
      unsubscribeReceipts();
      unsubscribeTickets();
    };
  }, [overrideRegNumber]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !overrideRegNumber) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `receipts/${overrideRegNumber}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'receipts'), {
        userId: auth.currentUser?.uid || 'anonymous',
        regNumber: overrideRegNumber,
        imageUrl,
        note,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      setFile(null);
      setNote('');
      alert('Receipt uploaded successfully! Awaiting verification.');
    } catch (error) {
      console.error(error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!overrideRegNumber) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Lottery number copied!');
  };

  const downloadTicket = async () => {
    if (ticketRef.current === null) return;
    const dataUrl = await toPng(ticketRef.current, { cacheBust: true });
    const link = document.createElement('a');
    link.download = 'nacos-lottery-ticket.png';
    link.href = dataUrl;
    link.click();
  };

  const printTicket = () => {
    window.print();
  };

  const currentTotal = settings?.editedTotalReward || settings?.realTotal || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Welcome Banner */}
      <section className="bg-primary text-white p-8 rounded-2xl shadow-lg border border-primary-light relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h2 className="text-3xl font-bold italic tracking-tight">{uiTexts.welcome_message}</h2>
          <p className="text-white/80 leading-relaxed font-light">{uiTexts.payment_instruction}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase font-bold text-accent tracking-widest">Total Reward Pool</span>
            <div className="text-4xl font-black text-white font-mono">
              ₦{currentTotal.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 opacity-10">
          <TicketIcon className="w-48 h-48" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (Tickets & Receipts) */}
        <div className="lg:col-span-2 space-y-12">
          {/* Active Ticket Display */}
          {tickets.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <TicketIcon className="w-5 h-5 text-primary" />
                <h3 className="font-bold uppercase tracking-widest text-slate-500 text-sm">Your Latest Ticket</h3>
              </div>
              
              <AnimatePresence mode="wait">
                {tickets
                  .filter(t => t.id === activeTicketId)
                  .map(ticket => (
                    <motion.div
                      key={ticket.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="group"
                    >
                      <div 
                        ref={ticketRef}
                        className="ticket-gradient p-8 rounded-3xl shadow-2xl border-4 border-accent/30 relative overflow-hidden min-h-[300px] flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-8 relative z-10">
                          <div>
                            <div className="text-accent uppercase font-black tracking-[0.2em] text-xs mb-1">NACOS Official Lottery</div>
                            <div className="text-white/60 font-mono text-[10px]">{ticket.regNumber}</div>
                          </div>
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <TicketIcon className="text-accent w-6 h-6" />
                          </div>
                        </div>

                        <div className="text-center py-6 relative z-10">
                          <motion.div 
                            className="flex justify-center gap-4 text-white font-black text-4xl sm:text-5xl font-mono tracking-tighter"
                            onViewportEnter={() => {
                              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#006400', '#D4AF37'] });
                            }}
                          >
                            {ticket.lotteryNumber.split(' ').map((group: string, idx: number) => (
                              <motion.span
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                              >
                                {group}
                              </motion.span>
                            ))}
                          </motion.div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-t border-white/10 pt-6 mt-6 relative z-10">
                          <div className="text-[10px] text-white/40 font-mono">
                            VERIFIED: {ticket.createdAt?.toDate().toLocaleString() || 'Processsing...'}
                            <br />ID: {ticket.id}
                          </div>
                          <div className="flex gap-2 no-print">
                            <button 
                              onClick={() => copyToClipboard(ticket.lotteryNumber)}
                              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 text-white flex items-center gap-2 text-xs font-semibold"
                            >
                              <Copy className="w-4 h-4 text-accent" /> {uiTexts.ticket_button_copy}
                            </button>
                            <button 
                              onClick={downloadTicket}
                              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 text-white"
                              title="Download as PNG"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={printTicket}
                              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 text-white"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Decorative Patterns */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_20%_20%,#fff_0%,transparent_20%)] bg-[length:20px_20px]" />
                        <div className="absolute top-1/2 left-0 w-8 h-8 rounded-full bg-slate-50 -ml-4" />
                        <div className="absolute top-1/2 right-0 w-8 h-8 rounded-full bg-slate-50 -mr-4" />
                      </div>
                    </motion.div>
                  ))
                }
              </AnimatePresence>
            </section>
          )}

          {/* History / My Tickets */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-bold uppercase tracking-widest text-slate-500 text-sm">Transaction History</h3>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Combine tickets and receipts for a unified history */}
                    {[
                      ...receipts.map(r => ({ ...r, type: 'Receipt' })),
                      ...tickets.map(t => ({ ...t, type: 'Ticket', status: 'verified' }))
                    ]
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.type === 'Ticket' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold truncate max-w-[200px]">
                            {item.type === 'Ticket' ? item.lotteryNumber : (item.note || 'No note')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {item.status === 'verified' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {item.status === 'pending' && <Clock className="w-4 h-4 text-amber-500 animate-pulse" />}
                            {item.status === 'rejected' && <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-xs font-medium capitalize text-slate-600">{item.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                          {item.createdAt?.toDate().toLocaleDateString() || '...'}
                        </td>
                      </tr>
                    ))}
                    {receipts.length === 0 && tickets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No transactions found yet. Make a payment to get started!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar (Account & Upload) */}
        <div className="space-y-8">
          {/* Payment Info */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-slate-800">Bank Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Bank Name</div>
                <div className="font-bold text-primary">{settings?.bankName || '...'}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1 group cursor-pointer" onClick={() => copyToClipboard(settings?.accountNumber)}>
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex justify-between">
                  Account Number <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="font-bold text-primary font-mono text-lg">{settings?.accountNumber || '...'}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Beneficiary Name</div>
                <div className="font-bold text-primary">{settings?.accountName || '...'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl text-amber-800 text-xs border border-amber-100 leading-relaxed italic">
              <Info className="w-6 h-6 shrink-0" />
              <p>Note: Each ticket costs exactly ₦{settings?.ticketPrice || 1000}. Multiple payments require multiple receipt uploads.</p>
            </div>
          </section>

          {/* Upload Form */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Upload className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-slate-800">Submit Receipt</h3>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Image/PDF</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center group-hover:border-primary transition-colors bg-slate-50/50">
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-sm text-slate-500 font-medium truncate block">
                      {file ? file.name : 'Click or drag files here'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optional Note</label>
                <textarea
                  placeholder="e.g. Paid from John's Account..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-light transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Submit Reference</>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>

      <footer className="pt-12 border-t border-slate-200 text-center space-y-4">
        <p className="text-sm text-slate-400 font-medium tracking-wide uppercase italic">{uiTexts.footer_text}</p>
        <div className="flex justify-center gap-6 opacity-30 grayscale saturate-0 contrast-50 hover:grayscale-0 transition-all">
          {/* Logo Placeholders */}
          <div className="h-8 w-24 bg-slate-300 rounded" />
          <div className="h-8 w-24 bg-slate-300 rounded" />
        </div>
      </footer>
    </div>
  );
}

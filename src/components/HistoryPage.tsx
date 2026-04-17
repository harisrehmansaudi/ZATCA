import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Search, Filter, Share2, FileText, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

interface Receipt {
  id: string;
  seller: string;
  vatNumber: string;
  total: number;
  vatAmount: number;
  category: string;
  createdAt: string;
  userId: string;
}

export const HistoryPage = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'receipts'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt)));
    });
  }, []);

  const totalVat = receipts.reduce((acc, r) => acc + r.vatAmount, 0).toFixed(2);
  const chartData = [100, 200, 150, 300, 250, 400].map((v, i) => ({ name: `Day ${i+1}`, value: v }));

  const filteredReceipts = receipts.filter(r => r.seller.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 p-6 h-full text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit History</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <div className="text-gray-400">Total VAT Tracked</div>
          <div className="text-4xl font-bold text-emerald">{totalVat} <span className="text-xl">SAR</span></div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-4 text-emerald" size={20} />
        <input 
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Merchant Name..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 p-4 text-white placeholder-gray-500"
        />
      </div>

      <div className="space-y-4">
        {filteredReceipts.map(r => (
          <motion.div 
            key={r.id} onClick={() => setSelectedReceipt(r)}
            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-emerald/5 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-lg">{r.seller[0]}</div>
              <div>
                <div className="font-bold">{r.seller}</div>
                <div className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-bold text-lg">{r.total.toFixed(2)} SAR</div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400"><CheckCircle2 size={14} className="inline mr-1" /> Verified</div>
            </div>
          </motion.div>
        ))}
      </div>
      {selectedReceipt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-slate-900 p-6">
          <button onClick={() => setSelectedReceipt(null)} className="text-emerald mb-6 text-xl">← Back</button>
          <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
            <h2 className="text-2xl font-bold mb-6">{selectedReceipt.seller}</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-400">
               <div>Date: {new Date(selectedReceipt.createdAt).toLocaleDateString()}</div>
               <div>VAT Number: {selectedReceipt.vatNumber}</div>
               <div className="text-2xl font-bold text-white col-span-2 mt-4">{selectedReceipt.total.toFixed(2)} SAR</div>
            </div>
            <button className="w-full mt-8 bg-emerald text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                <Share2 size={20} /> Share Report
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

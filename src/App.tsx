/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { LayoutDashboard, Camera, BrainCircuit, History, Settings, LogOut, User, Languages, ArrowLeft, Download, CheckCircle2 } from 'lucide-react';
import { HistoryPage } from './components/HistoryPage';
import { Scanner } from './components/ScannerComponent';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { Html5QrcodeScanner } from 'html5-qrcode';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type Lang = 'en' | 'ar';

const LanguageContext = createContext({
  lang: 'en' as Lang,
  toggleLang: () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('en');
  const toggleLang = () => setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  
  // Also update document dir for layout mirroring
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const translations = {
  en: {
    greeting: 'Welcome, Architect',
    recentScans: 'Recent Scans',
    vatHealth: 'VAT Health',
    goal: 'Goal',
    scanner: 'Scanner',
    dashboard: 'Dashboard',
    scanHistory: 'Scan History',
    settings: 'Settings',
    alignQR: 'Align ZATCA QR here',
    processing: 'Processing',
    profile: 'Profile',
    logout: 'Logout',
    subscription: 'Subscription',
    editProfile: 'Edit Profile',
    changePassword: 'Change Password',
    notificationPrefs: 'Notification Preferences',
    zatcaFinance: 'ZATCA & Finance',
    savingsGoal: 'Manage Savings Goal (Car)',
    exportTax: 'Export Tax History (PDF/Excel)',
    vatDetails: 'VAT Registration Details',
    appPrefs: 'App Preferences',
    language: 'Language',
    theme: 'Theme',
    deleteAccount: 'Delete Account',
    back: 'Back'
  },
  ar: {
    greeting: 'مرحباً، المعماري',
    recentScans: 'المسوح الأخيرة',
    vatHealth: 'صحة الضريبة',
    goal: 'الهدف',
    scanner: 'الماسح الضوئي',
    dashboard: 'لوحة التحكم',
    scanHistory: 'سجل المسوح',
    settings: 'الإعدادات',
    alignQR: 'وجه الكاميرا نحو رمز ZATCA QR',
    processing: 'جاري المعالجة...',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    subscription: 'الاشتراك',
    editProfile: 'تعديل الملف الشخصي',
    changePassword: 'تغيير كلمة المرور',
    notificationPrefs: 'تفضيلات الإشعارات',
    zatcaFinance: 'ZATCA والمالية',
    savingsGoal: 'إدارة هدف الادخار (سيارة)',
    exportTax: 'تصدير سجل الضرائب (PDF/Excel)',
    vatDetails: 'تفاصيل تسجيل ضريبة القيمة المضافة',
    appPrefs: 'تفضيلات التطبيق',
    language: 'اللغة',
    theme: 'السمة',
    deleteAccount: 'حذف الحساب',
    back: 'رجوع'
  }
};

const Sidebar = () => {
    const { lang } = useLanguage();
    const t = translations[lang];
    return (
      <nav className={`hidden md:flex w-64 bg-surface border border-border rounded-3xl p-8 flex-col backdrop-blur-md ${lang === 'ar' ? 'order-last' : 'order-first'}`}>
        <div className="flex items-center gap-3 mb-12 pl-3">
          <div className="w-8 h-8 bg-emerald rounded-lg shadow-[0_0_15px_var(--color-emerald-glow)]"></div>
          <span className="font-bold text-xl tracking-tighter">ZATCA PRO</span>
        </div>
        <ul className="flex flex-col gap-2">
            <NavItem icon={<LayoutDashboard size={20} />} label={t.dashboard} to="/" />
            <NavItem icon={<History size={20} />} label={t.scanHistory} to="/history" />
            <NavItem icon={<Settings size={20} />} label={t.settings} to="/settings" />
        </ul>
      </nav>
    );
};

const NavItem = ({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) => (
  <Link to={to} className="p-3 rounded-xl flex items-center gap-3 text-sm transition-all text-text-dim hover:bg-glass hover:text-emerald">
    {icon} {label}
  </Link>
);

// Update BottomNav to trigger the scanner input directly
const BottomNav = () => {
    const navigate = useNavigate();
    
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-lg border-t border-border z-50 flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom)] pt-3">
            <Link to="/" className="text-emerald flex flex-col items-center"><LayoutDashboard size={24}/></Link>
            
            {/* Camera Pill */}
            <motion.div 
                whileTap={{ scale: 0.9 }} 
                className="relative -top-6"
            >
                <button onClick={() => navigate('/scanner')} className="text-white p-4 rounded-full bg-emerald shadow-lg shadow-emerald/20 block">
                    <Camera size={28} />
                </button>
            </motion.div>
            
            <Link to="/settings" className="text-text-dim flex flex-col items-center"><Settings size={24} /></Link>
        </nav>
    );
};

function AnimatedRoutes({ lang }: { lang: 'en' | 'ar' }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} key={location.pathname}>
        <Routes location={location}>
            <Route path="/" element={<PageWrapper><Dashboard lang={lang} /></PageWrapper>} />
            <Route path="/scanner" element={<PageWrapper><Scanner /></PageWrapper>} />
            <Route path="/history" element={<PageWrapper><HistoryPage /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><SettingsPage lang={lang} /></PageWrapper>} />
            <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </AnimatePresence>
  );
}

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
    {children}
  </motion.div>
);

const SettingsPage = ({ lang }: { lang: 'en' | 'ar' }) => {
    const { toggleLang } = useLanguage();
    const t = translations[lang];
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 p-6 text-white overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-2xl font-bold">{t.settings}</h1>
                <button onClick={() => navigate('/')} className="p-2 bg-white/10 rounded-full"><X size={24} /></button>
            </div>
            
            <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 rounded-full border-4 border-emerald flex items-center justify-center mb-4 bg-slate-800"><User size={48} className="text-emerald"/></div>
                <h1 className="text-xl font-bold flex items-center gap-2">Architect</h1>
                <p className="text-text-dim text-sm">harisrehmansaudi@gmail.com</p>
            </div>
            
            <div className="space-y-6">
                <SettingsCard title={t.profile}>
                   <div className="space-y-2">
                       <button className="w-full text-left p-3 hover:bg-white/5 rounded-xl">{t.editProfile}</button>
                       <button className="w-full text-left p-3 hover:bg-white/5 rounded-xl">{t.changePassword}</button>
                       <button className="w-full text-left p-3 hover:bg-white/5 rounded-xl">{t.notificationPrefs}</button>
                   </div>
                </SettingsCard>

                <SettingsCard title="Pro Subscription">
                    <div className="p-3 text-sm text-emerald">You have reached Architect PRO level.</div>
                </SettingsCard>
            </div>

            <div className="mt-12">
                <button className="w-full p-4 rounded-2xl bg-red-500/10 text-red-500 font-semibold hover:bg-red-500/20">{t.logout}</button>
            </div>
        </div>
    );
};

const SettingsCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-text-dim mb-3 px-2">{title}</h3>
        {children}
    </div>
);

export default function App() {
  return (
    <LanguageProvider>
        <BrowserRouter>
           <AppContent />
        </BrowserRouter>
    </LanguageProvider>
  );
}

function AppContent() {
  const { lang, toggleLang } = useLanguage();

  return (
      <div className="flex w-full h-[100dvh] p-2 md:p-6 gap-6 bg-bg overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar />
        <main className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar pb-32 md:pb-6">
           <header className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5 backdrop-blur-md rounded-2xl">
              <div className="flex items-center gap-3">
                 <Link to="/settings" className="w-8 h-8 rounded-full bg-emerald/20 border border-emerald/50 flex items-center justify-center shadow-[0_0_10px_var(--color-emerald-glow)]"><User size={16} className="text-emerald" /></Link>
                 <div className="text-sm font-semibold">{translations[lang].greeting}</div>
              </div>
              <div className="flex gap-2">
                 <button onClick={toggleLang} className="p-2 rounded-lg bg-glass text-xs hover:bg-emerald/20 transition-all"><Languages size={18} /></button>
                 <Link to="/settings" className="p-2 rounded-lg bg-glass hover:bg-emerald/20 transition-all"><Settings size={18} /></Link>
              </div>
           </header>
           <AnimatedRoutes lang={lang} />
        </main>
        
        <BottomNav />
      </div>
  );
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0); // 0: Login, 1: Goal, 2: Scan
    const [goal, setGoal] = useState('');

    const handleContinue = () => {
        if (onboardingStep === 0) {
            // Simplified logic: simulate signup
            setIsNewUser(true);
            setOnboardingStep(1);
        } else if (onboardingStep === 1) {
            setOnboardingStep(2);
        } else {
            // Redirect to scanner
            window.location.href = '/scanner';
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-border p-8 rounded-3xl"
            >
                {onboardingStep === 0 && (
                    <>
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-emerald rounded-2xl shadow-[0_0_30px_var(--color-emerald-glow)] mb-4"></div>
                            <h1 className="text-2xl font-bold tracking-tighter">ZATCA Pro</h1>
                            <p className="text-text-dim mt-2 text-center text-sm">
                                {isNewUser ? 'Welcome to the future of Saudi Finance' : 'Welcome back, Architect'}
                            </p>
                        </div>
                        <input 
                            type="email" 
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-xl bg-black/20 border border-border placeholder:text-text-dim focus:border-emerald focus:ring-1 focus:ring-emerald outline-none transition-all mb-4"
                        />
                        <button onClick={handleContinue} className="w-full p-4 rounded-xl bg-emerald text-black font-semibold hover:opacity-90 transition-opacity">
                            Continue
                        </button>
                    </>
                )}

                {onboardingStep === 1 && (
                    <>
                        <h2 className="text-xl font-bold mb-6">What is your primary goal?</h2>
                        {['Save for a Car', 'Track Business VAT', 'Personal Wealth'].map(g => (
                            <button key={g} onClick={() => setGoal(g)} className={`w-full p-4 mb-3 rounded-xl border ${goal === g ? 'border-emerald text-emerald bg-emerald/10' : 'border-border'}`}>
                                {g}
                            </button>
                        ))}
                        <button onClick={handleContinue} disabled={!goal} className="w-full mt-4 p-4 rounded-xl bg-emerald text-black font-semibold disabled:opacity-50">
                            Continue
                        </button>
                    </>
                )}

                {onboardingStep === 2 && (
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-6">Scan your first receipt to see the magic.</h2>
                        <div className="w-32 h-32 mx-auto bg-glass rounded-full flex items-center justify-center mb-6 text-emerald">
                            <Camera size={48} />
                        </div>
                        <button onClick={handleContinue} className="w-full p-4 rounded-xl bg-emerald text-black font-semibold">
                            Start Scanning
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const Scanner = () => {
    const [result, setResult] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(false);
    const [cameraPermissionError, setCameraPermissionError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error(err);
                setCameraPermissionError(true);
            }
        };
        startCamera();
        return () => {
             const stream = videoRef.current?.srcObject as MediaStream;
             stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const SCAN_KEY = 'zatca_scanning';

    useEffect(() => {
        if (localStorage.getItem(SCAN_KEY) === 'true') {
            setProcessing(true);
        }
    }, []);

    const processImage = async (file: File) => {
        console.log('Step 1: File received', file.name);
        localStorage.setItem(SCAN_KEY, 'true');
        setProcessing(true);
        setResult(null);
        setResultVisible(false);

        try {
            console.log('Step 2: Compressing image...');
            const compressedBlob = await new Promise<Blob>((resolve) => {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
                };
            });

            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            const base64Image = await new Promise<string>((resolve) => reader.onloadend = () => resolve(reader.result as string));
            console.log('Step 3: Compression complete, size roughly:', Math.round(compressedBlob.size / 1024), 'KB');

            console.log('Step 4: Sending to Gemini...');
            const prompt = 'Extract the Saudi ZATCA QR data. If no QR, OCR the text. Return ONLY JSON: {"merchant": "string", "vat_id": "string", "total": number, "vat": number, "date": "string"}';

            const response = await genAI.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: [
                    {
                        parts: [
                            { text: prompt },
                            { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } }
                        ]
                    }
                  ]
            });
            
            console.log('Step 5: Parsing JSON...');
            const responseText = response.text || "";
            const data = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, ''));
            
            console.log('Step 6: Success', data);
            setResult(data);
            setScans(prev => [...prev, data]);
            setResultVisible(true);
            localStorage.removeItem(SCAN_KEY);
            
        } catch (error) {
            console.error('OCR Error:', error);
            alert('Scan failed. Please ensure the QR is visible.');
            localStorage.removeItem(SCAN_KEY);
        } finally {
            setProcessing(false);
        }
    };

    const [scans, setScans] = useState<any[]>([]);

    const captureAndProcess = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) processImage(new File([blob], 'scan.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {processing && (
                <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-24 h-24 border-t-4 border-emerald rounded-full mb-6" />
                    <div className="text-emerald text-xl font-bold animate-pulse text-center">ZATCA Pro is decoding your invoice...</div>
                </div>
            )}

            {cameraPermissionError ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-white">
                    <p>Please allow camera access in your iPad settings to use the Pro Scanner.</p>
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    
                    {/* Scanner Overlay */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                        <div className="relative w-72 h-72 border-2 border-emerald/50 rounded-lg backdrop-blur-[2px]">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald rounded-tl" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald rounded-tr" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald rounded-bl" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald rounded-br" />
                            <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute left-0 right-0 h-0.5 bg-emerald shadow-[0_0_10px_var(--color-emerald-glow)]" />
                        </div>
                        <div className="mt-8 text-center text-sm font-semibold text-white drop-shadow-md">
                            Align ZATCA QR here<br/>
                            <span className="text-emerald">ضع رمز الاستجابة السريع هنا</span>
                        </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="absolute bottom-8 left-8 z-20">
                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/20 rounded-full backdrop-blur-md">
                            <Download size={24} className="text-white" />
                        </button>
                    </div>
                    <div className="absolute bottom-8 left-1/2 -ml-8 z-20">
                        <button onClick={captureAndProcess} className="w-16 h-16 bg-white rounded-full border-4 border-emerald/50" />
                    </div>
                </>
            )}

            <div className="absolute top-8 left-6 z-20">
                <Link to="/" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white block"><ArrowLeft size={24} /></Link>
            </div>
            
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" 
                onChange={(e) => e.target.files && processImage(e.target.files[0])} />

            {/* Result Card (Slides Up) */}
            {resultVisible && result && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="absolute bottom-0 left-0 right-0 p-8 bg-slate-900/95 backdrop-blur-2xl border-t border-emerald/50 rounded-t-3xl z-40 text-white">
                    <h2 className="text-xl font-bold mb-4">ZATCA Scanned Result</h2>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>Merchant: {result.merchant}</p>
                        <p>VAT ID: {result.vat_id}</p>
                        <p>Total: {result.total} SAR</p>
                        <p>VAT: {result.vat} SAR</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
const CountUp = ({ to, prefix = '', suffix = '' }: { to: number, prefix?: string, suffix?: string }) => {
    const value = useMotionValue(0);
    const displayValue = useTransform(value, (v) => Math.round(v));
    useEffect(() => {
        const controls = animate(value, to, { duration: 2 });
        return () => controls.stop();
    }, [to]);
    return <>{prefix}<motion.span>{displayValue}</motion.span>{suffix}</>;
};

const Dashboard = ({ lang }: { lang: 'en' | 'ar' }) => {
    const t = translations[lang];
    return (
  <div className="flex flex-col h-full gap-2 p-2 overflow-hidden">
    {/* Recent Scans - Compact */}
    <Card className="flex flex-col gap-1 p-3">
        <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">{t.recentScans}</h2>
        <div className="space-y-1">
            {[ { merchant: 'Starbucks', date: '12 Apr', total: '24 SAR' },
               { merchant: 'Jarir', date: '10 Apr', total: '450 SAR' },
               { merchant: 'Panda', date: '08 Apr', total: '89 SAR' }
            ].map((scan, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-sm font-semibold truncate">{scan.merchant}</div>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{scan.total}</span>
                        <CheckCircle2 className="text-emerald" size={14} />
                    </div>
                </div>
            ))}
        </div>
    </Card>

    {/* 2-Column Grid */}
    <div className="grid grid-cols-2 gap-2 flex-grow overflow-hidden">
        {/* VAT Health Score */}
        <Card className="flex flex-col items-center justify-center p-2">
            <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">{t.vatHealth}</h2>
            <div className="h-24 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={[{ value: 85 }, { value: 15 }]} innerRadius={35} outerRadius={45} startAngle={90} endAngle={-270} dataKey="value">
                            <Cell fill="#10b981" />
                            <Cell fill="rgba(255,255,255,0.1)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-xl font-bold text-emerald font-mono"><CountUp to={85} suffix="%" /></div>
                </div>
            </div>
        </Card>

        {/* Savings Progress */}
        <Card className="flex flex-col justify-center p-3 gap-2">
            <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">{t.goal}</h2>
            <div className="text-lg font-bold text-emerald">{t.dashboard === 'لوحة التحكم' ? 'سيارة جديدة' : 'New Car'}</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                 <motion.div className="h-full bg-emerald" initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 2 }} />
            </div>
            <div className="text-xs font-mono">12,500 <span className="text-[10px] text-text-dim">SAR</span></div>
        </Card>
    </div>
  </div>
);
};

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 ${className}`}>
        {children}
    </div>
);

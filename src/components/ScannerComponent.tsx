import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export const Scanner = () => {
    const [result, setResult] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setErrorMsg('');
        setResult(null);

        try {
            const base64Image = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
            const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const base64Data = base64Image.split(',')[1];
            
            const response = await model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{
                        inlineData: { data: base64Data, mimeType: "image/jpeg" }
                    }, {
                        text: "You are a Saudi Tax Expert. Extract Merchant, VAT Number, Total Amount (SAR), and Date. If a QR code is visible, prioritize decoding the ZATCA TLV data. Return ONLY a JSON object."
                    }]
                }]
            });
            
            const jsonText = response.text().replace(/```json\n?|\n?```/g, '');
            const parsedResult = JSON.parse(jsonText);
            setResult(parsedResult);
            
            // Save to history
            const history = JSON.parse(localStorage.getItem('scans') || '[]');
            localStorage.setItem('scans', JSON.stringify([parsedResult, ...history]));
            
        } catch (err: any) {
            setErrorMsg('Image too blurry, please snap again!');
        } finally {
            setProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
            <div className="absolute top-8 left-6">
                <Link to="/" className="p-3 bg-white/10 rounded-full text-white block"><ArrowLeft size={24} /></Link>
            </div>

            <input type="file" capture="environment" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleCapture} />

            {processing ? (
                <div className="flex flex-col items-center gap-6">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-32 h-32 rounded-full border-4 border-emerald flex items-center justify-center p-2"
                    >
                        <RefreshCw size={48} className="text-emerald animate-spin" />
                    </motion.div>
                    <p className="text-xl font-bold animate-pulse">ZATCA Pro is Analyzing...</p>
                </div>
            ) : (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-4 bg-emerald/20 border-2 border-emerald p-10 rounded-3xl"
                >
                    <Camera size={64} className="text-emerald" />
                    <span className="font-bold text-lg">Snap & Auto-Analyze</span>
                </button>
            )}

            {errorMsg && <p className="mt-8 text-red-500 font-bold">{errorMsg}</p>}

            <AnimatePresence>
                {result && !processing && (
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute bottom-0 left-0 right-0 p-8 bg-slate-900 backdrop-blur-2xl border-t border-emerald/50 rounded-t-3xl z-[1002]">
                        <h2 className="text-xl font-bold mb-4">Scan Result</h2>
                        <pre className="text-xs text-gray-300 overflow-auto max-h-60 bg-black p-4 rounded-xl">{JSON.stringify(result, null, 2)}</pre>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

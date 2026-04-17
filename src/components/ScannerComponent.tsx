import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';

export const Scanner = () => {
    const [result, setResult] = useState<any>(null);
    const [resultVisible, setResultVisible] = useState(false);
    const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export const Scanner = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startStream = async () => {
        setStatus('loading');
        setErrorMsg('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: { exact: 'environment' } } 
            });
            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                await video.play();
                setStatus('active');
            }
        } catch (err: any) {
            setErrorMsg(err.name + ': ' + err.message);
            setStatus('error');
        }
    };

    const takeSnapshot = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        setStatus('loading');
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            
            // Gemini Handoff
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
                const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
                const base64Data = dataUrl.split(',')[1];
                
                const response = await model.generateContent({
                    contents: [{
                        role: "user",
                        parts: [{
                            inlineData: { data: base64Data, mimeType: "image/jpeg" }
                        }, {
                            text: "Extract merchant name, VAT ID, and total amount from this receipt image. Format as JSON."
                        }]
                    }]
                });
                
                const text = response.text();
                // Simple parser assumption for simplicity
                setResult({ analysis: text }); 
                setStatus('active');
            } catch (err: any) {
                setErrorMsg('OCR Error: ' + err.message);
                setStatus('error');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            <div className="absolute top-8 left-6 z-[1001]">
                <Link to="/" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white block"><ArrowLeft size={24} /></Link>
            </div>

            {errorMsg && (
                <div className="p-4 bg-red-900/50 text-red-500 font-bold text-lg text-center z-50 mb-4 uppercase">
                    {errorMsg}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <button onClick={startStream} className="bg-emerald text-black px-8 py-4 rounded-full font-bold text-lg">
                    FORCE ACTIVATE CAMERA
                </button>
                <button onClick={takeSnapshot} className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg">
                    Take Snapshot (OCR)
                </button>
            </div>

            <video 
                id="raw-video"
                ref={videoRef} 
                autoPlay muted playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'fixed', top: 0, left: 0, zIndex: -1 }} 
            />
            <canvas ref={canvasRef} className="hidden" width="640" height="480" />
            
            {result && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="absolute bottom-0 left-0 right-0 p-8 bg-slate-900/95 backdrop-blur-2xl border-t border-emerald/50 rounded-t-3xl z-[1002] text-white">
                    <h2 className="text-xl font-bold mb-4">Snapshot Result</h2>
                    <pre className="text-xs text-gray-300">{JSON.stringify(result.analysis, null, 2)}</pre>
                </motion.div>
            )}
        </div>
    );
};

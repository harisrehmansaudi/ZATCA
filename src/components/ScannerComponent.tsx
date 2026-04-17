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
    
    const decodeZatca = (base64String: string) => {
        try {
            let bytes: Uint8Array;
            try {
                bytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
            } catch (e) { return null; }
            let i = 0;
            const result: any = {};
            while (i < bytes.length) {
                const tag = bytes[i++];
                const len = bytes[i++];
                const valBytes = bytes.slice(i, i + len);
                const val = new TextDecoder().decode(valBytes);
                if (tag === 1) result.merchant = val;
                if (tag === 2) result.vat_id = val;
                if (tag === 4) result.total = parseFloat(val);
                i += len;
            }
            return result;
        } catch (e) { return null; }
    };

    const startStream = async () => {
        setStatus('loading');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            
            // 300ms Delay to allow lens tech to init
            setTimeout(() => {
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    // Explicit play command to force Android to render
                    video.play().catch(e => console.error("Explicit play failed:", e));
                    
                    // GPU Wakeup Fallback using frame draw
                    setTimeout(() => {
                        if (video.videoWidth === 0 || video.videoHeight === 0) {
                             canvasRef.current?.getContext('2d')?.drawImage(video, 0, 0);
                        }
                        setStatus('active');
                    }, 500); 
                }
            }, 300);
        } catch (err: any) {
            setErrorMsg(err.message || 'Unknown Camera Error');
            setStatus('error');
        }
    };

    useEffect(() => {
        startStream();

        const interval = setInterval(() => {
            if (videoRef.current && canvasRef.current && status === 'active') {
                const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) {
                        if (navigator.vibrate) navigator.vibrate(200);
                        setResult(decodeZatca(code.data));
                        setResultVisible(true);
                        clearInterval(interval);
                    }
                }
            }
        }, 400);                
        
        return () => {
            clearInterval(interval);
            videoRef.current?.srcObject?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        };
    }, [status]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            {status === 'loading' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center text-emerald animate-pulse bg-black">
                    Architect, we are initializing the lens...
                </div>
            )}
            
            {status === 'error' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-black p-6 gap-4">
                    <p className="text-center text-red-500 font-bold">Camera Error: {errorMsg}</p>
                    <button onClick={startStream} className="bg-emerald text-black px-6 py-3 rounded-full font-bold">Retry Camera</button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 text-white px-6 py-3 rounded-full font-bold">Upload from Gallery</button>
                </div>
            )}
            
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                loop 
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 999 }} 
            />
            <canvas ref={canvasRef} className="hidden" width="300" height="300" />
            
            <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
                <div className="w-[250px] h-[250px] border-2 border-emerald rounded-lg relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald rounded-br-lg" />
                </div>
            </div>

            <div className="absolute top-8 left-6 z-[1001]">
                <Link to="/" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white block"><ArrowLeft size={24} /></Link>
            </div>
            
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" />

            {resultVisible && result && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="absolute bottom-0 left-0 right-0 p-8 bg-slate-900/95 backdrop-blur-2xl border-t border-emerald/50 rounded-t-3xl z-[1002] text-white">
                    <h2 className="text-xl font-bold mb-4">ZATCA Scanned Result</h2>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>Merchant: {result.merchant}</p>
                        <p>VAT ID: {result.vat_id}</p>
                        <p>Total: {result.total} SAR</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

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

    // Ghost animation: invisible 1px div that oscillates opacity
    const GhostHeartbeat = () => (
        <motion.div 
            initial={{ opacity: 0.01 }}
            animate={{ opacity: 0.02 }}
            transition={{ repeat: Infinity, duration: 0.1, yoyo: Infinity }}
            style={{ width: '1px', height: '1px', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
        />
    );

    const startStream = async () => {
        if(videoRef.current?.srcObject) {
             (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        setStatus('loading');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            
            setTimeout(() => {
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    video.play().catch(e => console.error(e));
                    setStatus('active');
                }
            }, 300);
        } catch (err: any) {
            setErrorMsg(err.message || 'Camera Error');
            setStatus('error');
        }
    };

    useEffect(() => {
        startStream();

        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        let req: number;
        const renderLoop = () => {
            if (canvas && video && status === 'active') {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && !resultVisible) {
                        if (navigator.vibrate) navigator.vibrate(200);
                        setResult(decodeZatca(code.data));
                        setResultVisible(true);
                    }
                }
            }
            req = requestAnimationFrame(renderLoop);
        };
        req = requestAnimationFrame(renderLoop);
        
        return () => {
            cancelAnimationFrame(req);
            videoRef.current?.srcObject?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        };
    }, [status, resultVisible]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <GhostHeartbeat />
            
            {status === 'loading' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center text-emerald animate-pulse bg-black">
                    Architect, we are initializing the lens...
                </div>
            )}
            
            {status === 'error' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-black p-6 gap-4">
                    <p className="text-center text-red-500 font-bold">Error: {errorMsg}</p>
                    <button onClick={startStream} className="bg-emerald text-black px-6 py-3 rounded-full font-bold">Retry Camera</button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 text-white px-6 py-3 rounded-full font-bold">Upload from Gallery</button>
                </div>
            )}
            
            <video 
                ref={videoRef} 
                autoPlay muted playsInline loop 
                style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1 }} 
            />
            
            <canvas 
                ref={canvasRef} 
                width="640" height="480" 
                className="w-full h-full object-cover"
                style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
            />
            
            <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
                <div className="w-[250px] h-[250px] border-2 border-emerald rounded-lg relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald rounded-br-lg" />
                </div>
            </div>

            <div className="absolute top-8 left-6 z-[1001] flex gap-4">
                <Link to="/" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white block"><ArrowLeft size={24} /></Link>
                <button onClick={startStream} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white">🔄</button>
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

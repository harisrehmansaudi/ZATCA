import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Scanner = () => {
    const [result, setResult] = useState<any>(null);
    const [resultVisible, setResultVisible] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIdx = useRef(0);

    const decodeZatca = (base64String: string) => {
        try {
            let bytes: Uint8Array;
            try {
                bytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
            } catch (e) {
                return null;
            }
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
        } catch (e) {
            console.error('TLV Decode error:', e);
            return null;
        }
    };

    useEffect(() => {
        const startStream = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        };
        startStream();

        const loop = () => {
            if (frameIdx.current++ % 15 === 0 && videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) {
                        if (navigator.vibrate) navigator.vibrate(200);
                        setResult(decodeZatca(code.data));
                        setResultVisible(true);
                        // Stop stream? User said 'Auto-Scan' and 'moment QR detected, trigger success'.
                    }
                }
            }
            requestAnimationFrame(loop);
        };
        const req = requestAnimationFrame(loop);
        
        return () => {
            cancelAnimationFrame(req);
            videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" width="300" height="300" />
            
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="w-[300px] h-[300px] border-2 border-emerald rounded-lg relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald rounded-br-lg" />
                </div>
            </div>
            <div className="absolute top-1/2 mt-32 text-emerald font-bold animate-pulse text-center">Align QR Code Only / ضع الرمز هنا</div>

            <div className="absolute top-8 left-6 z-20">
                <Link to="/" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white block"><ArrowLeft size={24} /></Link>
            </div>
            
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

            <div className="absolute bottom-8 z-20">
                <button className="bg-emerald text-black px-6 py-3 rounded-full font-bold">Upload from Gallery</button>
            </div>
        </div>
    );
};

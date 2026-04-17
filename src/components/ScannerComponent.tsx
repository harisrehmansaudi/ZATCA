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
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Scanner = () => {
    const [result, setResult] = useState<any>(null);
    const [resultVisible, setResultVisible] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

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

    const stopScanner = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const startScanner = () => {
        setErrorMsg('');
        setTimeout(() => {
            scannerRef.current = new Html5Qrcode("reader");
            scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    useBarCodeDetectorIfSupported: false, // Required for Samsung stability
                },
                (decodedText) => {
                    if (navigator.vibrate) navigator.vibrate(200);
                    setResult(decodeZatca(decodedText));
                    setResultVisible(true);
                    stopScanner();
                },
                (err) => { console.log(err); }
            ).then(() => setIsScanning(true)).catch(err => {
                setErrorMsg(err.toString());
            });
        }, 500);
    };

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 text-white">
            <div className="absolute top-8 left-6 z-[1001]">
                <Link to="/" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white block"><ArrowLeft size={24} /></Link>
            </div>

            {!isScanning && (
                <button onClick={startScanner} className="bg-emerald text-black px-8 py-4 rounded-full font-bold text-lg animate-pulse">
                    ACTIVATE SCANNER
                </button>
            )}

            {errorMsg && <p className="text-red-500 font-bold mb-4">{errorMsg}</p>}

            <div id="reader" className="w-full max-w-[500px]" style={{ display: isScanning ? 'block' : 'none' }}></div>
            
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

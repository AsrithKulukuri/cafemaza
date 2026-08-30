"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, Zap, AlertCircle, Scan, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { createWorker, Worker } from "tesseract.js";

interface CameraBarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (scannedCode: string) => void;
}

// Play pleasant scan beep sound using native Web Audio API
function playScanBeep() {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1900, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
    } catch {
        // AudioContext ignored
    }
}

// Extract Cafe Maza card code (CMM001, CMG002, CMP003) or phone number from OCR text
function extractCardCodeOrPhone(rawText: string): string | null {
    if (!rawText) return null;
    const clean = rawText.toUpperCase().replace(/[\s\-_]+/g, "");

    // 1. Match Cafe Maza Card Codes (e.g. CMM001, CMG001, CMP001, CMB001, CMS001)
    const cardMatch = clean.match(/CM[A-Z0-9]{3,5}/);
    if (cardMatch) {
        return cardMatch[0];
    }

    // 2. Match standard 10-digit Indian mobile number
    const phoneMatch = rawText.match(/(?:\+?91)?[6-9]\d{9}/);
    if (phoneMatch) {
        return phoneMatch[0].replace(/^\+?91/, "");
    }

    // 3. Fallback: match any 6-digit alphanumeric code if formatted like card
    const fallbackMatch = clean.match(/[A-Z]{3}\d{3}/);
    if (fallbackMatch) {
        return fallbackMatch[0];
    }

    return null;
}

export function CameraBarcodeScannerModal({
    isOpen,
    onClose,
    onScanSuccess,
}: CameraBarcodeScannerModalProps) {
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [torchActive, setTorchActive] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [isInitializing, setIsInitializing] = useState(true);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const zxingControlsRef = useRef<IScannerControls | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const ocrWorkerRef = useRef<Worker | null>(null);
    const manualInputRef = useRef<HTMLInputElement | null>(null);
    const isScanningActiveRef = useRef(false);
    const hasFiredRef = useRef(false);

    const stopAllScanning = useCallback(() => {
        isScanningActiveRef.current = false;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (ocrIntervalRef.current) {
            clearInterval(ocrIntervalRef.current);
            ocrIntervalRef.current = null;
        }

        if (zxingControlsRef.current) {
            try {
                zxingControlsRef.current.stop();
            } catch {
                // Ignore
            }
            zxingControlsRef.current = null;
        }

        if (streamRef.current) {
            try {
                streamRef.current.getTracks().forEach((t) => t.stop());
            } catch {
                // Ignore
            }
            streamRef.current = null;
        }

        if (videoRef.current) {
            try {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            } catch {
                // Ignore
            }
        }
    }, []);

    const handleDetectedCode = useCallback(
        (code: string) => {
            if (!code || hasFiredRef.current || !isScanningActiveRef.current) return;
            const clean = code.trim().toUpperCase();
            if (!clean || clean.length < 2) return;

            hasFiredRef.current = true;
            stopAllScanning();
            setScannedResult(clean);
            playScanBeep();

            if (typeof navigator !== "undefined" && navigator.vibrate) {
                try {
                    navigator.vibrate([100, 50, 100]);
                } catch {
                    // Ignore
                }
            }

            setTimeout(() => {
                onScanSuccess(clean);
                onClose();
            }, 400);
        },
        [stopAllScanning, onScanSuccess, onClose]
    );

    // Perform OCR on current video frame to scrape printed card code (e.g. CMM001)
    const performOcrOnFrame = useCallback(async () => {
        if (!isScanningActiveRef.current || !videoRef.current || isProcessingOcr) return;
        const video = videoRef.current;
        if (video.readyState < 2 || video.paused || video.videoWidth === 0) return;

        try {
            setIsProcessingOcr(true);

            if (!ocrWorkerRef.current) {
                try {
                    ocrWorkerRef.current = await createWorker("eng");
                } catch {
                    return;
                }
            }
            if (!ocrWorkerRef.current) return;

            const canvas = canvasRef.current || document.createElement("canvas");
            canvasRef.current = canvas;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;

            // Sample the center region of the video where the barcode and text are located
            const srcWidth = video.videoWidth;
            const srcHeight = video.videoHeight;
            const cropW = Math.floor(srcWidth * 0.85);
            const cropH = Math.floor(srcHeight * 0.6);
            const cropX = Math.floor((srcWidth - cropW) / 2);
            const cropY = Math.floor((srcHeight - cropH) / 2);

            canvas.width = cropW;
            canvas.height = cropH;

            // Draw and enhance contrast for text detection
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            const result = await ocrWorkerRef.current.recognize(canvas).catch(() => null);
            if (!result || !result.data) return;

            const text = result.data.text || "";
            const detectedCode = extractCardCodeOrPhone(text);
            if (detectedCode) {
                handleDetectedCode(detectedCode);
            }
        } catch {
            // Frame OCR skipped safely
        } finally {
            setIsProcessingOcr(false);
        }
    }, [handleDetectedCode, isProcessingOcr]);

    const startCameraAndScanner = useCallback(
        async (deviceId?: string) => {
            stopAllScanning();
            setIsInitializing(true);
            setScannerError(null);
            setIsPermissionDenied(false);
            isScanningActiveRef.current = true;

            try {
                if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setIsPermissionDenied(true);
                    setScannerError("Camera not supported or requires secure HTTPS connection.");
                    setIsInitializing(false);
                    return;
                }

                // Initialize Tesseract OCR worker in background
                if (!ocrWorkerRef.current) {
                    try {
                        const worker = await createWorker("eng");
                        ocrWorkerRef.current = worker;
                    } catch (e) {
                        console.warn("OCR worker init skipped:", e);
                    }
                }

                // Query video devices
                const allDevices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
                const videoDevices = allDevices
                    .filter((d) => d.kind === "videoinput")
                    .map((d, i) => ({
                        id: d.deviceId,
                        label: d.label || `Camera ${i + 1}`,
                    }));

                setCameras(videoDevices);

                let chosenDeviceId = deviceId;
                if (!chosenDeviceId && videoDevices.length > 0) {
                    const backCam = videoDevices.find((d) =>
                        /back|rear|environment|main|0/i.test(d.label)
                    );
                    chosenDeviceId = backCam ? backCam.id : videoDevices[0].id;
                }
                if (chosenDeviceId) {
                    setSelectedCameraId(chosenDeviceId);
                }

                const constraints: MediaStreamConstraints = {
                    audio: false,
                    video: chosenDeviceId
                        ? {
                              deviceId: { exact: chosenDeviceId },
                              width: { ideal: 1280, min: 640 },
                              height: { ideal: 720, min: 480 },
                          }
                        : {
                              facingMode: { ideal: "environment" },
                              width: { ideal: 1280, min: 640 },
                              height: { ideal: 720, min: 480 },
                          },
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;

                // Check torch support safely
                try {
                    const track = stream.getVideoTracks()[0];
                    if (track && typeof track.getCapabilities === "function") {
                        const caps = track.getCapabilities() as unknown as { torch?: boolean };
                        setTorchSupported(Boolean(caps && caps.torch));
                    }
                } catch {
                    setTorchSupported(false);
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }

                setIsInitializing(false);

                // 1. Native Hardware BarcodeDetector on video frames
                if (typeof window !== "undefined" && "BarcodeDetector" in window) {
                    try {
                        const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
                        const supportedFormats: string[] = (await BarcodeDetectorClass.getSupportedFormats?.()) || [
                            "code_128",
                            "code_39",
                            "qr_code",
                            "ean_13",
                            "upc_a",
                        ];

                        const desiredFormats = [
                            "code_128",
                            "code_39",
                            "qr_code",
                            "ean_13",
                            "ean_8",
                            "upc_a",
                            "upc_e",
                            "itf",
                            "codabar",
                        ].filter((f) => supportedFormats.includes(f));

                        const detector = new BarcodeDetectorClass({ formats: desiredFormats });

                        const runNativeDetection = async () => {
                            if (!isScanningActiveRef.current || !videoRef.current) return;
                            try {
                                if (
                                    videoRef.current.readyState >= 2 &&
                                    !videoRef.current.paused &&
                                    videoRef.current.videoWidth > 0
                                ) {
                                    const barcodes = await detector.detect(videoRef.current);
                                    if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                                        handleDetectedCode(barcodes[0].rawValue);
                                        return;
                                    }
                                }
                            } catch {
                                // Frame skip
                            }
                            if (isScanningActiveRef.current) {
                                animationFrameRef.current = requestAnimationFrame(runNativeDetection);
                            }
                        };

                        animationFrameRef.current = requestAnimationFrame(runNativeDetection);
                    } catch {
                        // Ignore
                    }
                }

                // 2. ZXing BrowserMultiFormatReader on <video> element
                const hints = new Map<DecodeHintType, any>();
                hints.set(DecodeHintType.TRY_HARDER, true);
                hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                    BarcodeFormat.CODE_128,
                    BarcodeFormat.CODE_39,
                    BarcodeFormat.QR_CODE,
                    BarcodeFormat.EAN_13,
                    BarcodeFormat.EAN_8,
                    BarcodeFormat.UPC_A,
                    BarcodeFormat.UPC_E,
                    BarcodeFormat.ITF,
                    BarcodeFormat.CODABAR,
                ]);

                const codeReader = new BrowserMultiFormatReader(hints, {
                    delayBetweenScanAttempts: 100,
                    delayBetweenScanSuccess: 1000,
                });

                if (videoRef.current) {
                    const controls = await codeReader.decodeFromVideoElement(
                        videoRef.current,
                        (result) => {
                            if (result && result.getText()) {
                                handleDetectedCode(result.getText());
                            }
                        }
                    );
                    zxingControlsRef.current = controls;
                }

                // 3. Continuous OCR loop to scrape printed text like CMM001 directly from the card
                ocrIntervalRef.current = setInterval(() => {
                    void performOcrOnFrame();
                }, 900);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                if (/NotAllowedError|Permission denied|denied/i.test(message)) {
                    setIsPermissionDenied(true);
                    setScannerError("Camera permission was denied. Please allow camera access in your browser settings.");
                } else {
                    setScannerError("Failed to access camera stream. You can enter the card code manually below.");
                }
                setIsInitializing(false);
                setTimeout(() => manualInputRef.current?.focus(), 200);
            }
        },
        [stopAllScanning, handleDetectedCode, performOcrOnFrame]
    );

    useEffect(() => {
        if (!isOpen) {
            stopAllScanning();
            hasFiredRef.current = false;
            setScannedResult(null);
            setScannerError(null);
            setIsPermissionDenied(false);
            setTorchActive(false);
            return;
        }

        hasFiredRef.current = false;
        const timer = setTimeout(() => {
            void startCameraAndScanner();
        }, 100);

        return () => {
            clearTimeout(timer);
            stopAllScanning();
            if (ocrWorkerRef.current) {
                ocrWorkerRef.current.terminate().catch(() => {});
                ocrWorkerRef.current = null;
            }
        };
    }, [isOpen, startCameraAndScanner, stopAllScanning]);

    async function switchCamera(deviceId: string) {
        setSelectedCameraId(deviceId);
        await startCameraAndScanner(deviceId);
    }

    async function toggleTorch() {
        try {
            if (streamRef.current) {
                const track = streamRef.current.getVideoTracks()[0];
                if (track) {
                    const nextTorch = !torchActive;
                    await track.applyConstraints({
                        advanced: [{ torch: nextTorch } as unknown as MediaTrackConstraintSet],
                    }).catch(() => {});
                    setTorchActive(nextTorch);
                }
            }
        } catch {
            // Torch toggle ignored
        }
    }

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 15 }}
                    className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#CFAF63]/35 bg-[#121212] shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] bg-[#161616]">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-[#CFAF63]/15 text-[#CFAF63]">
                                <Camera className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-(--font-heading) text-lg font-bold text-[#F5F5F5]">
                                    Device Camera Barcode & OCR Scanner
                                </h3>
                                <p className="text-xs text-[#999]">
                                    Reads card barcode and printed card code (e.g. CMM001)
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-[#888] hover:text-[#FFF] hover:bg-[#2A2A2A] transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Viewfinder Container */}
                    <div className="relative p-4 sm:p-6 bg-[#0A0A0A] flex flex-col items-center">
                        <div className="relative w-full aspect-4/3 max-h-[300px] overflow-hidden rounded-2xl border-2 border-[#CFAF63]/30 bg-black flex items-center justify-center">
                            {/* Live Video Element */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />

                            {/* Viewfinder Overlay Targeting Guide */}
                            {!scannerError && !isInitializing && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                                    <div className="relative w-[320px] h-[160px] rounded-xl border-2 border-dashed border-[#CFAF63] shadow-[0_0_25px_rgba(207,175,99,0.25)] flex items-center justify-center">
                                        {/* Laser Scan line animation */}
                                        <div className="absolute inset-x-0 h-0.5 bg-linear-to-r from-transparent via-[#00D98E] to-transparent animate-bounce shadow-[0_0_12px_#00D98E]" />

                                        {/* Corner Guides */}
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#CFAF63]" />
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#CFAF63]" />
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#CFAF63]" />
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#CFAF63]" />

                                        <span className="text-[11px] font-mono font-bold tracking-widest text-[#CFAF63]/90 bg-black/70 px-2 py-0.5 rounded">
                                            ALIGN CARD OR BARCODE HERE
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Scanned Success Overlay */}
                            {scannedResult && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-30"
                                >
                                    <CheckCircle2 className="w-14 h-14 text-[#00D98E] mb-2 animate-pulse" />
                                    <p className="text-sm font-semibold text-[#00D98E]">Card Detected & Visit Marked!</p>
                                    <p className="text-xl font-mono font-bold text-[#F5F5F5] mt-1 bg-[#1A1A1A] px-4 py-1.5 rounded-xl border border-[#00D98E]/40">
                                        {scannedResult}
                                    </p>
                                </motion.div>
                            )}

                            {/* Initializing State */}
                            {isInitializing && !scannerError && (
                                <div className="absolute inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
                                    <RefreshCw className="w-8 h-8 text-[#CFAF63] animate-spin mb-2" />
                                    <p className="text-xs text-[#999]">Starting barcode & card reader...</p>
                                </div>
                            )}

                            {/* Error / Permission Denied State */}
                            {scannerError && (
                                <div className="absolute inset-0 bg-[#121212] flex flex-col items-center justify-center p-6 text-center z-20">
                                    {isPermissionDenied ? (
                                        <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 mb-2">
                                            <Lock className="w-8 h-8" />
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 mb-2">
                                            <AlertCircle className="w-8 h-8" />
                                        </div>
                                    )}
                                    <h4 className="text-sm font-bold text-[#F5F5F5] mb-1">
                                        {isPermissionDenied ? "Camera Permission Required" : "Camera Scanner"}
                                    </h4>
                                    <p className="text-xs text-[#AAA] max-w-xs leading-relaxed">
                                        {scannerError}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Controls Bar & Instant Capture Trigger */}
                        {!scannerError && (
                            <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <button
                                    type="button"
                                    onClick={() => void performOcrOnFrame()}
                                    disabled={isProcessingOcr}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-[#CFAF63] to-[#E5C378] text-[#111] font-bold shadow-md hover:opacity-95 transition cursor-pointer"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {isProcessingOcr ? "Scanning Card..." : "Snap & Mark Visit"}
                                </button>

                                <div className="flex items-center gap-2">
                                    {cameras.length > 1 && (
                                        <div className="flex items-center gap-1.5">
                                            <select
                                                value={selectedCameraId}
                                                onChange={(e) => void switchCamera(e.target.value)}
                                                className="rounded-lg border border-[#CFAF63]/30 bg-[#1A1A1A] px-2.5 py-1.5 text-[#F5F5F5] focus:outline-none"
                                            >
                                                {cameras.map((c, i) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.label || `Camera ${i + 1}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {torchSupported && (
                                        <button
                                            type="button"
                                            onClick={toggleTorch}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                                                torchActive
                                                    ? "border-amber-400 bg-amber-400/20 text-amber-300"
                                                    : "border-[#333] bg-[#161616] text-[#999] hover:text-[#FFF]"
                                            }`}
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                            {torchActive ? "Torch On" : "Flashlight"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Manual Code Input Fallback */}
                        <div className="w-full mt-4 pt-4 border-t border-[#2A2A2A]">
                            <p className="text-xs text-[#CFAF63] mb-2 font-semibold flex items-center gap-1.5">
                                <Scan className="w-3.5 h-3.5" />
                                Enter Card Code or Mobile Number Manually:
                            </p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (manualCode.trim()) {
                                        handleDetectedCode(manualCode.trim());
                                    }
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    ref={manualInputRef}
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. CMM001 or 9876543210"
                                    className="flex-1 rounded-xl border border-[#CFAF63]/40 bg-[#161616] px-3.5 py-2.5 text-sm font-mono text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                />
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-[#CFAF63] text-[#111] font-bold text-xs uppercase tracking-wider hover:bg-[#E5C378] transition cursor-pointer"
                                >
                                    Lookup
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

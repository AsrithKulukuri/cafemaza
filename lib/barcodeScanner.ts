/**
 * TVS BS-C101 Star 1D USB Barcode Scanner Integration Driver
 * Works as a Keyboard Wedge HID device emitting rapid keystrokes followed by Enter.
 */

type BarcodeCallback = (barcode: string) => void | Promise<void>;

interface ScannerOptions {
    maxIntervalMs?: number; // Maximum ms between characters to consider as scanner input (default: 50ms)
    minBarcodeLength?: number; // Minimum barcode length (default: 4)
    playBeep?: boolean; // Audible beep on successful scan
    onScanStart?: () => void;
    onError?: (err: string) => void;
}

let activeListeners: Set<BarcodeCallback> = new Set();
let isInitialized = false;

// Web Audio API synthesized scanner confirmation beep
function playScannerBeep(frequency = 1200, duration = 0.08) {
    if (typeof window === "undefined") return;
    try {
        const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch {
        // AudioContext not allowed or muted
    }
}

export function createBarcodeScannerListener(
    onBarcodeScanned: BarcodeCallback,
    options: ScannerOptions = {}
) {
    const {
        maxIntervalMs = 50,
        minBarcodeLength = 4,
        playBeep = true,
        onScanStart,
        onError,
    } = options;

    let buffer: string[] = [];
    let lastKeyTime = 0;
    let timeoutTimer: NodeJS.Timeout | null = null;

    function clearBuffer() {
        buffer = [];
        lastKeyTime = 0;
        if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Ignore special modifier keys
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        const currentTime = Date.now();
        const interval = lastKeyTime ? currentTime - lastKeyTime : 0;
        lastKeyTime = currentTime;

        // If Enter is received
        if (event.key === "Enter" || event.keyCode === 13) {
            if (buffer.length >= minBarcodeLength) {
                // If the buffered characters were typed in rapid succession
                const scannedBarcode = buffer.join("").trim();
                clearBuffer();

                // Prevent form submissions if triggered by scanner Enter
                event.preventDefault();
                event.stopPropagation();

                if (playBeep) {
                    playScannerBeep();
                }

                // Dispatch to current callback
                onBarcodeScanned(scannedBarcode);
                return;
            } else {
                clearBuffer();
                return;
            }
        }

        // Only capture printable ASCII characters
        if (event.key.length === 1) {
            // If interval between consecutive keys is too slow, reset buffer (user is typing manually)
            if (buffer.length > 0 && interval > maxIntervalMs) {
                clearBuffer();
            }

            if (buffer.length === 0 && onScanStart) {
                onScanStart();
            }

            buffer.push(event.key);

            // Timeout protection: clear buffer if Enter is not received within 350ms
            if (timeoutTimer) clearTimeout(timeoutTimer);
            timeoutTimer = setTimeout(() => {
                if (buffer.length > 0 && buffer.length < minBarcodeLength) {
                    if (onError) onError("Scan timed out or incomplete.");
                }
                clearBuffer();
            }, 350);
        }
    }

    if (typeof window !== "undefined") {
        window.addEventListener("keydown", handleKeyDown, true);
    }

    return {
        destroy: () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("keydown", handleKeyDown, true);
            }
            clearBuffer();
        },
    };
}

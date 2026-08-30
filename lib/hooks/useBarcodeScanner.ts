"use client";

import { useEffect, useRef } from "react";
import { createBarcodeScannerListener } from "../barcodeScanner";

export function useBarcodeScanner(
    onScan: (barcode: string) => void | Promise<void>,
    options: {
        enabled?: boolean;
        playBeep?: boolean;
        maxIntervalMs?: number;
    } = {}
) {
    const { enabled = true, playBeep = true, maxIntervalMs = 50 } = options;
    const scanHandlerRef = useRef(onScan);

    useEffect(() => {
        scanHandlerRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        if (!enabled) return;

        const scanner = createBarcodeScannerListener(
            (code) => {
                scanHandlerRef.current?.(code);
            },
            {
                playBeep,
                maxIntervalMs,
            }
        );

        return () => {
            scanner.destroy();
        };
    }, [enabled, playBeep, maxIntervalMs]);
}

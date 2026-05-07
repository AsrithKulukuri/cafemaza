const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizeE164(input: string): string {
    const trimmed = input.trim();
    const compact = trimmed.replace(/[\s()-]/g, "");
    const plusPrefixed = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;

    if (!E164_REGEX.test(plusPrefixed)) {
        throw new Error("Phone number must be in valid E.164 format, for example +919876543210");
    }

    return plusPrefixed;
}

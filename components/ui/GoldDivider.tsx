type GoldDividerProps = {
    className?: string;
};

export function GoldDivider({ className = "" }: GoldDividerProps) {
    return (
        <div className={`my-4 flex items-center gap-3 ${className}`.trim()}>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#CFAF63]/45 to-[#FF6A00]/35" />
            <span className="text-[10px] tracking-[0.24em] text-[#CFAF63]/70">✦</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#CFAF63]/45 to-[#FF6A00]/35" />
        </div>
    );
}

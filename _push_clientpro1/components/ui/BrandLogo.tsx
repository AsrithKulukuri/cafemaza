type BrandLogoProps = {
    className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
    return (
        <div
            className={[
                "relative grid h-12 w-12 place-items-center overflow-hidden rounded-full shadow-[0_0_34px_rgba(255,166,59,0.22)]",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <img src="/logoo.jpeg" alt="Cafe Maza logo" className="h-full w-full object-contain" />
        </div>
    );
}

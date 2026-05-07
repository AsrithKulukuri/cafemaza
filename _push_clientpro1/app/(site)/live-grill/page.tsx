import { SectionReveal } from "@/components/ui/SectionReveal";

export default function LiveGrillPage() {
    return (
        <div className="mx-auto max-w-6xl space-y-10 px-6 pb-20 md:px-10">
            <SectionReveal className="glass-card rounded-3xl border border-[#CFAF63]/20 p-8">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Live Grill</p>
                <h1 className="mt-3 font-[var(--font-heading)] text-5xl text-[#F5F5F5]">Cinematic Fire. Premium Taste.</h1>
                <p className="mt-4 max-w-3xl text-[#F5F5F5]/75">
                    Watch flames rise as your chicken tikka, paneer tikka, and lamb chops are prepared live. Every table gets
                    a front-row seat to our signature grill performance.
                </p>
            </SectionReveal>

            <SectionReveal className="grid gap-6 md:grid-cols-3">
                {["Chicken Tikka", "Paneer Tikka", "Lamb Chops"].map((item) => (
                    <article key={item} className="glass-card rounded-2xl border border-[#CFAF63]/20 p-5">
                        <h2 className="font-[var(--font-heading)] text-3xl text-[#F5F5F5]">{item}</h2>
                        <p className="mt-3 text-sm text-[#F5F5F5]/70">Charred at perfect heat, brushed with house marinade, and served smoking hot.</p>
                    </article>
                ))}
            </SectionReveal>
        </div>
    );
}

import { menuCategories } from "@/data/mockData";
import { SectionReveal } from "@/components/ui/SectionReveal";

export default function TakeawayPage() {
    return (
        <div className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
            <SectionReveal>
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Takeaway</p>
                <h1 className="mt-2 font-(--font-heading) text-5xl text-[#F5F5F5]">Premium Meals To Go</h1>
                <p className="mt-4 max-w-3xl text-[#F5F5F5]/75">Fast pickup service for biryani packs, curries, breads, and mocktails.</p>
            </SectionReveal>

            <SectionReveal className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {menuCategories.map((category) => (
                    <article key={category.id} className="glass-card rounded-2xl border border-[#CFAF63]/20 p-5">
                        <h3 className="font-(--font-heading) text-2xl text-[#F5F5F5]">{category.label}</h3>
                        <p className="mt-2 text-sm text-[#F5F5F5]/70">{category.items.length} options available for takeaway.</p>
                    </article>
                ))}
            </SectionReveal>
        </div>
    );
}

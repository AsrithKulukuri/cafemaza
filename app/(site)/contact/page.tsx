import { SectionReveal } from "@/components/ui/SectionReveal";

const MAPS_URL = "https://maps.app.goo.gl/nGPrhuvSoBKp45LV7";
const GOOGLE_LISTING_URL = "https://www.google.com/search?sca_esv=d0a1e93f4488cb4c&hl=en-US&gl=us&output=search&kgmid=%2Fg%2F11ykvs1cf3&q=Cafe%20Maza&shndl=30&source=sh%2Fx%2Floc%2Fact%2Fm1%2F2&kgs=0de98d57fd9592ec";
const INSTAGRAM_URL = "https://www.instagram.com/cafe_maza?igsh=MW1qdm14eXlrbDdpeQ==";

export default function ContactPage() {
    return (
        <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 md:grid-cols-2 md:px-10">
            <SectionReveal className="glass-card rounded-2xl border border-[#CFAF63]/20 p-7">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Contact</p>
                <h1 className="mt-2 font-(--font-heading) text-4xl text-[#F5F5F5]">Visit Cafe Maza</h1>
                <div className="mt-6 space-y-3 text-[#F5F5F5]/80">
                    <p>
                        Address: <a href={MAPS_URL} target="_blank" rel="noreferrer" className="text-[#CFAF63] hover:text-[#FF6A00]">2-308 V VENKATAYAPALEM, Raghunadhpalem, Khammam, Telangana - 507318</a>
                    </p>
                    <p>
                        Phone: <a href="tel:+919959691599" className="text-[#CFAF63] hover:text-[#FF6A00]">+91 99596 91599</a>
                    </p>
                    <p>Opening Hours: 12:00 PM - 11:30 PM</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#F5F5F5]/80">
                    <a href={MAPS_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1 hover:text-[#CFAF63]">Google Maps</a>
                    <a href={GOOGLE_LISTING_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1 hover:text-[#CFAF63]">Google Listing</a>
                    <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1 hover:text-[#CFAF63]">Instagram</a>
                </div>
            </SectionReveal>
            <SectionReveal className="overflow-hidden rounded-2xl border border-[#CFAF63]/20">
                <iframe
                    title="Cafe Maza Location"
                    src="https://www.google.com/maps?q=2-308+V+VENKATAYAPALEM,+Raghunadhpalem,+Khammam,+Telangana+-+507318&output=embed"
                    className="h-105 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </SectionReveal>
        </div>
    );
}

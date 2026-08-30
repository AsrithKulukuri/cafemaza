import { SectionReveal } from "@/components/ui/SectionReveal";
import { MapPin, Phone, MessageCircle, Clock, ShieldCheck, Navigation } from "lucide-react";

const MAPS_URL = "https://maps.app.goo.gl/nGPrhuvSoBKp45LV7";
const GOOGLE_LISTING_URL = "https://www.google.com/search?sca_esv=d0a1e93f4488cb4c&hl=en-US&gl=us&output=search&kgmid=%2Fg%2F11ykvs1cf3&q=Cafe%20Maza&shndl=30&source=sh%2Fx%2Floc%2Fact%2Fm1%2F2&kgs=0de98d57fd9592ec";
const INSTAGRAM_URL = "https://www.instagram.com/cafe_maza?igsh=MW1qdm14eXlrbDdpeQ==";
const WHATSAPP_URL = "https://wa.me/919959691599?text=Hi%20CafeMaza%2C%20I%20would%20like%20to%20know%20more%20about%20table%20reservation%20and%20orders.";

export default function ContactPage() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10 px-4 sm:px-6 pb-20 md:px-10">
            {/* Header section */}
            <SectionReveal className="text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[#CFAF63]">Find Us in Khammam</p>
                <h1 className="mt-1.5 font-(--font-heading) text-3xl sm:text-4xl text-[#F5F5F5] md:text-5xl">
                    Visit CafeMaza, V.Venkatayapalem
                </h1>
                <p className="mx-auto mt-2.5 sm:mt-3 max-w-2xl text-xs sm:text-sm text-[#F5F5F5]/70 md:text-base leading-relaxed">
                    Enjoy authentic live grills, signature biryanis, and premium family dining. Located conveniently in V.Venkatayapalem, serving the entire Khammam region.
                </p>
            </SectionReveal>

            <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
                {/* Left Card: Full Contact Details */}
                <SectionReveal className="glass-card rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 p-5 sm:p-7 md:p-9 space-y-5 sm:space-y-6">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#CFAF63]/30 bg-[#14120C] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#CFAF63]">
                            <MapPin className="h-3.5 w-3.5" /> Business Location
                        </span>
                        <h2 className="mt-2.5 sm:mt-3 font-(--font-heading) text-2xl text-[#F5F5F5]">CafeMaza</h2>
                        <p className="mt-1 font-mono text-xs sm:text-sm text-[#CFAF63]">66RG+852, V.Venkatayapalem, Telangana 507318</p>
                        <p className="mt-1 text-[11px] sm:text-xs text-[#F5F5F5]/60">2-308 V.Venkatayapalem, Raghunadhpalem, Khammam, Telangana 507318</p>
                    </div>

                    <div className="space-y-3.5 sm:space-y-4 pt-2 border-t border-zinc-800">
                        <div className="flex items-start gap-3">
                            <Phone className="h-4 sm:h-5 w-4 sm:w-5 text-[#CFAF63] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#F5F5F5]/50">Phone Number</p>
                                <a href="tel:+919959691599" className="text-sm sm:text-base font-semibold text-[#F5F5F5] hover:text-[#CFAF63] transition">
                                    +91 99596 91599
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <MessageCircle className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#F5F5F5]/50">WhatsApp Inquiries & Orders</p>
                                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-sm sm:text-base font-semibold text-emerald-400 hover:underline transition">
                                    Chat with us on WhatsApp
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-[#CFAF63] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#F5F5F5]/50">Opening Hours</p>
                                <p className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">12:00 PM – 11:30 PM (All 7 Days)</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5 text-[#CFAF63] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#F5F5F5]/50">Service Areas</p>
                                <p className="text-xs sm:text-sm text-[#F5F5F5]/80">
                                    Khammam, V.Venkatayapalem, Raghunadhpalem, and surrounding nearby regions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 sm:pt-4 border-t border-zinc-800 flex flex-wrap gap-2 sm:gap-3">
                        <a
                            href={MAPS_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-4 py-2 text-xs font-bold text-black hover:opacity-90 transition shadow-lg min-h-[38px]"
                        >
                            <Navigation className="h-3.5 w-3.5" /> Open Google Maps
                        </a>
                        <a
                            href={GOOGLE_LISTING_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border border-[#CFAF63]/30 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-[#F5F5F5] hover:border-[#CFAF63] transition min-h-[38px]"
                        >
                            Google Listing
                        </a>
                        <a
                            href={INSTAGRAM_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border border-pink-500/30 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-pink-300 hover:border-pink-500 transition min-h-[38px]"
                        >
                            Instagram
                        </a>
                    </div>
                </SectionReveal>

                {/* Right Card: Google Map Embed */}
                <SectionReveal className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 bg-zinc-950 shadow-xl flex flex-col">
                    <div className="p-3 sm:p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#CFAF63]">Live Map Location</span>
                        <span className="text-[10px] sm:text-[11px] text-zinc-400 font-mono">66RG+852, V.Venkatayapalem</span>
                    </div>
                    <iframe
                        title="CafeMaza Khammam Location"
                        src="https://www.google.com/maps?q=66RG%2B852,+V.Venkatayapalem,+Telangana+507318&output=embed"
                        className="h-full min-h-[280px] sm:min-h-[380px] w-full flex-1 border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </SectionReveal>
            </div>
        </div>
    );
}

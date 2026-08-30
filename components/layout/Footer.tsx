import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { MapPin, Phone, MessageCircle } from "lucide-react";

const MAPS_URL = "https://maps.app.goo.gl/nGPrhuvSoBKp45LV7";
const GOOGLE_LISTING_URL = "https://www.google.com/search?sca_esv=d0a1e93f4488cb4c&hl=en-US&gl=us&output=search&kgmid=%2Fg%2F11ykvs1cf3&q=Cafe%20Maza&shndl=30&source=sh%2Fx%2Floc%2Fact%2Fm1%2F2&kgs=0de98d57fd9592ec";
const INSTAGRAM_URL = "https://www.instagram.com/cafe_maza?igsh=MW1qdm14eXlrbDdpeQ==";
const WHATSAPP_URL = "https://wa.me/919959691599?text=Hi%20CafeMaza%2C%20I%20would%20like%20to%20know%20more%20about%20your%20menu%20and%20reservations.";

export function Footer() {
    return (
        <footer className="border-t border-[#CFAF63]/20 bg-[#0B0B0B] px-4 py-10 sm:px-6 md:px-10 md:py-12">
            <div className="mx-auto grid max-w-7xl gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:gap-10">
                {/* 1. Brand & Tagline */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <BrandLogo className="h-12 w-12 sm:h-14 sm:w-14 shrink-0" />
                        <div>
                            <h4 className="font-(--font-heading) text-xl text-[#CFAF63]">CafeMaza</h4>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#F5F5F5]/45">Khammam, Telangana</p>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[#F5F5F5]/70 leading-relaxed">
                        CafeMaza serves authentic dum biryani, live grills, cafe drinks, and family dining across V.Venkatayapalem and Khammam.
                    </p>
                </div>

                {/* 2. Menu Links */}
                <div>
                    <h5 className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63] font-semibold">Explore Menu</h5>
                    <ul className="mt-3 space-y-2 text-xs sm:text-sm text-[#F5F5F5]/80">
                        <li><Link href="/menu" className="block py-1 hover:text-[#CFAF63] transition">Biryani & Main Course</Link></li>
                        <li><Link href="/menu" className="block py-1 hover:text-[#CFAF63] transition">Live Grills & Kebabs</Link></li>
                        <li><Link href="/menu" className="block py-1 hover:text-[#CFAF63] transition">Starters & Mocktails</Link></li>
                        <li><Link href="/order-online" className="block py-1 hover:text-[#CFAF63] transition">Online Food Delivery</Link></li>
                    </ul>
                </div>

                {/* 3. Dining & Services */}
                <div>
                    <h5 className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63] font-semibold">Dining Services</h5>
                    <ul className="mt-3 space-y-2 text-xs sm:text-sm text-[#F5F5F5]/80">
                        <li><Link href="/reserve-table" className="block py-1 hover:text-[#CFAF63] transition">Table Reservation</Link></li>
                        <li><Link href="/screening" className="block py-1 hover:text-[#CFAF63] transition">Private Screening Room</Link></li>
                        <li><Link href="/live-grill" className="block py-1 hover:text-[#CFAF63] transition">Live Grill Experience</Link></li>
                        <li><Link href="/takeaway" className="block py-1 hover:text-[#CFAF63] transition">Takeaway & Parcel</Link></li>
                    </ul>
                </div>

                {/* 4. Local NAP / Contact */}
                <div>
                    <h5 className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63] font-semibold">Location & Contact</h5>
                    <div className="mt-3 space-y-2.5 text-xs sm:text-sm text-[#F5F5F5]/80">
                        <p className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-[#CFAF63] shrink-0 mt-0.5" />
                            <a href={MAPS_URL} target="_blank" rel="noreferrer" className="hover:text-[#CFAF63] transition break-words">
                                66RG+852, V.Venkatayapalem, Telangana 507318
                            </a>
                        </p>
                        <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#CFAF63] shrink-0" />
                            <a href="tel:+919959691599" className="hover:text-[#CFAF63] transition font-semibold">
                                +91 99596 91599
                            </a>
                        </p>
                        <p className="text-[11px] sm:text-xs text-[#F5F5F5]/60">
                            Service Areas: Khammam, V.Venkatayapalem & nearby areas
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#F5F5F5]/75">
                        <a href={MAPS_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1.5 hover:text-[#CFAF63] transition min-h-[36px] flex items-center">
                            Google Maps
                        </a>
                        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1.5 text-emerald-400 hover:text-emerald-300 transition min-h-[36px] flex items-center">
                            WhatsApp
                        </a>
                        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1.5 hover:text-[#CFAF63] transition min-h-[36px] flex items-center">
                            Instagram
                        </a>
                    </div>
                </div>
            </div>

            <div className="mx-auto mt-8 sm:mt-10 max-w-7xl border-t border-zinc-800/80 pt-5 sm:pt-6 text-center text-[11px] sm:text-xs text-[#F5F5F5]/50 leading-relaxed">
                <p>© {new Date().getFullYear()} CafeMaza. All rights reserved. 66RG+852, V.Venkatayapalem, Khammam, Telangana 507318.</p>
            </div>
        </footer>
    );
}

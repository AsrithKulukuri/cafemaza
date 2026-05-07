import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

const MAPS_URL = "https://maps.app.goo.gl/nGPrhuvSoBKp45LV7";
const GOOGLE_LISTING_URL = "https://www.google.com/search?sca_esv=d0a1e93f4488cb4c&hl=en-US&gl=us&output=search&kgmid=%2Fg%2F11ykvs1cf3&q=Cafe%20Maza&shndl=30&source=sh%2Fx%2Floc%2Fact%2Fm1%2F2&kgs=0de98d57fd9592ec";
const INSTAGRAM_URL = "https://www.instagram.com/cafe_maza?igsh=MW1qdm14eXlrbDdpeQ==";

export function Footer() {
    return (
        <footer className="border-t border-[#CFAF63]/20 bg-[#0B0B0B] px-6 py-12 md:px-10">
            <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
                <div>
                    <div className="flex items-center gap-3">
                        <BrandLogo className="h-14 w-14" />
                        <div>
                            <h4 className="font-(--font-heading) text-xl text-[#CFAF63]">Cafe Maza</h4>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-[#F5F5F5]/45">Live Grill Luxury</p>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-[#F5F5F5]/70">Luxury family dining, live grills, and legendary biryani.</p>
                </div>
                <div>
                    <h5 className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Menu</h5>
                    <ul className="mt-3 space-y-2 text-sm text-[#F5F5F5]/80">
                        <li><Link href="/menu">Soups & Starters</Link></li>
                        <li><Link href="/menu">Main Course</Link></li>
                        <li><Link href="/menu">Biryani</Link></li>
                    </ul>
                </div>
                <div>
                    <h5 className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Reservations</h5>
                    <ul className="mt-3 space-y-2 text-sm text-[#F5F5F5]/80">
                        <li><Link href="/reserve-table">Reserve Table</Link></li>
                        <li><Link href="/screening">Private Screening</Link></li>
                        <li><Link href="/order-online">Order Online</Link></li>
                    </ul>
                </div>
                <div>
                    <h5 className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Contact</h5>
                    <p className="mt-3 text-sm text-[#F5F5F5]/80">
                        <a href={MAPS_URL} target="_blank" rel="noreferrer" className="hover:text-[#CFAF63]">2-308 V VENKATAYAPALEM, Raghunadhpalem, Khammam, Telangana - 507318</a>
                    </p>
                    <p className="text-sm text-[#F5F5F5]/80">
                        <a href="tel:+919959691599" className="hover:text-[#CFAF63]">+91 99596 91599</a>
                    </p>
                    <div className="mt-4 flex gap-3 text-xs text-[#F5F5F5]/70">
                        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1 hover:text-[#CFAF63]">Instagram</a>
                        <a href={MAPS_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1 hover:text-[#CFAF63]">Google Maps</a>
                        <a href={GOOGLE_LISTING_URL} target="_blank" rel="noreferrer" className="glass-card rounded-full px-3 py-1 hover:text-[#CFAF63]">Google</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

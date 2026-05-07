import { SiteLayoutShell } from "@/components/layout/SiteLayoutShell";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return <SiteLayoutShell>{children}</SiteLayoutShell>;
}

import {
  IBM_Plex_Mono,
  Manrope,
  Outfit,
} from "next/font/google";
import FunnelClient from "./funnel-client";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-outfit",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
});

export default function FunnelPage() {
  return (
    <main
      className={`${outfit.variable} ${manrope.variable} ${plexMono.variable} bg-[#0A0A0A] text-white`}
    >
      <FunnelClient />
    </main>
  );
}

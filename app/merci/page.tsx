import {
  IBM_Plex_Mono,
  Manrope,
  Outfit,
} from "next/font/google";
import MerciClient from "./merci-client";

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

export default function MerciPage() {
  return (
    <main
      className={`${outfit.variable} ${manrope.variable} ${plexMono.variable} min-h-screen bg-[#050607] text-white`}
    >
      <MerciClient />
    </main>
  );
}

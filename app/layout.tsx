import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TrafficTracker } from "@/components/TrafficTracker";
import "./globals.css";
import "driver.js/dist/driver.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0f1d",
};

export const metadata: Metadata = {
  title: "Superior Project Showcase | University Capstone & Engineering Portfolio",
  description:
    "Official university project repository & student capstone showcase. Explore computer science, software engineering, and AI projects mentored by distinguished faculty.",
  keywords: [
    "University Projects",
    "Capstone Showcase",
    "Student Portfolio",
    "Computer Science",
    "Software Engineering",
    "AI Projects",
    "Superior University",
  ],
  authors: [{ name: "Superior Academic Engineering" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && window.fetch) {
                  const originalFetch = window.fetch;
                  window.fetch = function(input, init) {
                    init = init || {};
                    init.headers = init.headers || {};
                    if (init.headers instanceof Headers) {
                      init.headers.set('ngrok-skip-browser-warning', 'true');
                      init.headers.set('Bypass-Tunnel-Reminder', 'true');
                    } else if (Array.isArray(init.headers)) {
                      init.headers.push(['ngrok-skip-browser-warning', 'true']);
                      init.headers.push(['Bypass-Tunnel-Reminder', 'true']);
                    } else {
                      init.headers['ngrok-skip-browser-warning'] = 'true';
                      init.headers['Bypass-Tunnel-Reminder'] = 'true';
                    }
                    return originalFetch.call(this, input, init);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#0a0f1d] text-[#f8fafc] font-sans antialiased selection:bg-blue-600 selection:text-white">
        <TrafficTracker />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

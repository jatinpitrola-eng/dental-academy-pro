import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dental Academy Pro — Secure Learning",
  description:
    "A secure dental learning platform with protected video courses, time-limited access and device-bound playback.",
  keywords: [
    "dental academy",
    "dental courses",
    "video learning",
    "secure video",
    "dental education",
  ],
  authors: [{ name: "Dental Academy Pro" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dental Academy",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
  openGraph: {
    title: "Dental Academy Pro",
    description: "Secure dental learning platform.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Capture all errors BEFORE any React code runs, so we can debug
            production-only crashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ERRS__ = [];
              window.addEventListener('error', function(e) {
                window.__ERRS__.push({
                  type: 'error',
                  message: e.message,
                  filename: e.filename,
                  lineno: e.lineno,
                  colno: e.colno,
                  stack: e.error && e.error.stack ? e.error.stack : null,
                  errorObj: e.error ? (e.error.message + ' | ' + e.error.name) : null
                });
              });
              window.addEventListener('unhandledrejection', function(e) {
                window.__ERRS__.push({
                  type: 'unhandledrejection',
                  reason: e.reason ? (e.reason.message || String(e.reason)) : String(e.reason),
                  stack: e.reason && e.reason.stack ? e.reason.stack : null
                });
              });
              // Override console.error to capture React's error logging.
              var origConsoleError = console.error;
              console.error = function() {
                var args = Array.prototype.slice.call(arguments);
                window.__ERRS__.push({
                  type: 'console.error',
                  message: args.map(function(a) { try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e) { return String(a); } }).join(' ')
                });
                origConsoleError.apply(console, args);
              };
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

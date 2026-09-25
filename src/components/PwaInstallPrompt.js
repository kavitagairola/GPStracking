"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is already running in standalone PWA mode
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(inStandalone);

    // Check if user agent is Mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Listen for Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show install banner on mobile devices if not already installed as standalone
    if (isMobileDevice && !inStandalone) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-3.5 px-4 rounded-2xl shadow-lg border border-orange-400/30 flex items-center justify-between flex-wrap gap-3 mb-4 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-white animate-bounce" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-black tracking-tight flex items-center gap-1.5">
            Install Gokul Dham App
            <span className="bg-white/20 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">PWA Mobile</span>
          </span>
          <span className="text-[11px] text-orange-100 font-medium leading-tight">
            {isIos
              ? "Tap Share button below & select 'Add to Home Screen'!"
              : deferredPrompt
              ? "Tap Install Now to add app directly to your home screen."
              : "Tap Chrome Menu (3 Dots) top-right ➔ select 'Add to Home Screen'!"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isIos && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-white text-orange-600 hover:bg-orange-50 px-3.5 py-2 rounded-xl text-[12px] font-black flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install Now</span>
          </button>
        )}
        <button
          onClick={() => setShowBanner(false)}
          className="w-8 h-8 text-white/80 hover:text-white rounded-lg flex items-center justify-center hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}

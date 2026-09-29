"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  Truck, ClipboardList, Map, Battery,
  LogOut, Bell, Menu, X, CheckCircle2, Download, Smartphone
} from "lucide-react";

import { DRIVERS_LIST } from "@/lib/gpsUtils";

function DriverSidebar({ sidebarOpen, setSidebarOpen, onLogout }) {
  const pathname = usePathname();
  const [driverName, setDriverName] = useState("Raj Kumar");

  useEffect(() => {
   fetch("/api/auth/me?role=DRIVER") 
      .then(res => res.json())
      .then(json => {
        if (json.user && json.user.name) {
          setDriverName(json.user.name);
        } else {
          const savedDriver = localStorage.getItem("currentDriverName");
          if (savedDriver) setDriverName(savedDriver);
        }
      })
      .catch(() => {
        const savedDriver = localStorage.getItem("currentDriverName");
        if (savedDriver) setDriverName(savedDriver);
      });
  }, []);

  const driverIndex = DRIVERS_LIST.findIndex(d => d.name === driverName);
  const ambulanceNum = driverIndex !== -1 ? driverIndex + 1 : 1;
  const initials = driverName.split(" ").map(n => n[0]).join("").toUpperCase();

  const navItems = [
    { href: "/driver", icon: ClipboardList, label: "My Tasks", exact: true },
    { href: "/driver/completed-cases", icon: CheckCircle2, label: "Completed Cases", exact: true },
    { href: "/driver/navigation", icon: Map, label: "Navigation Map", exact: true },
    { href: "/driver/vehicle-diagnostic", icon: Battery, label: "Vehicle Status", exact: true },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-orange-100 text-slate-700 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      {/* Brand */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between flex-shrink-0">
        <Link href="/driver" className="flex items-center gap-2.5">
          <img src="/gokuldham-logo.png" alt="Gokul Dham Logo" className="h-8 w-auto object-contain flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[13.5px] font-black text-slate-800 tracking-wide">Gokul Dham</span>
            <span className="text-[9px] text-orange-600 font-bold uppercase tracking-widest">Driver Console</span>
          </div>
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-[2px]">
        <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 block">DRIVER TASKS</span>
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-[10px] rounded-xl text-[12.5px] transition-all duration-150 ${
                isActive
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-orange-50/50 font-semibold"
              }`}
            >
              <Icon className={`w-[17px] h-[17px] ${isActive ? "text-orange-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 flex flex-col gap-1 flex-shrink-0 border-t border-orange-100/60 pt-3 mt-1">
        <button onClick={onLogout} className="flex items-center gap-3 px-3.5 py-[9.5px] rounded-xl text-[12.5px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer bg-transparent border-none w-full text-left">
          <LogOut className="w-[17px] h-[17px] text-slate-400" style={{ strokeWidth: 1.8 }} />
          <span>Logout</span>
        </button>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-orange-50/30">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8.5 h-8.5 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[12.5px] font-black text-slate-800 truncate leading-tight">{driverName}</span>
              <span className="text-[9.5px] text-orange-600 font-bold truncate mt-[2px]">Ambulance {String(ambulanceNum).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DriverHeaderProfile() {
  const [driverName, setDriverName] = useState("Raj Kumar");

  useEffect(() => {
    fetch("/api/auth/me?role=DRIVER")
      .then(res => res.json())
      .then(json => {
        if (json.user && json.user.name) {
          setDriverName(json.user.name);
        } else {
          const savedDriver = localStorage.getItem("currentDriverName");
          if (savedDriver) setDriverName(savedDriver);
        }
      })
      .catch(() => {
        const savedDriver = localStorage.getItem("currentDriverName");
        if (savedDriver) setDriverName(savedDriver);
      });
  }, []);

  const driverIndex = DRIVERS_LIST.findIndex(d => d.name === driverName);
  const ambulanceNum = driverIndex !== -1 ? driverIndex + 1 : 1;
  const initials = driverName.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <>
      <div className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center text-[13px] font-bold shadow-sm">{initials}</div>
      <div className="hidden sm:flex flex-col">
        <span className="text-[13px] font-bold text-gray-900 leading-tight">{driverName}</span>
        <span className="text-[10px] text-orange-500 font-semibold leading-tight mt-[3px]">Ambulance {String(ambulanceNum).padStart(2, "0")}</span>
      </div>
    </>
  );
}

function MobileBottomBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/driver", icon: ClipboardList, label: "Tasks", exact: true },
    { href: "/driver/completed-cases", icon: CheckCircle2, label: "History", exact: true },
    { href: "/driver/navigation", icon: Map, label: "Map Route", exact: true },
    { href: "/driver/vehicle-diagnostic", icon: Battery, label: "Diagnostic", exact: true },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-orange-100 px-3 py-1.5 flex items-center justify-around shadow-lg shadow-orange-950/5">
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? "text-orange-600 font-bold"
                : "text-slate-500 font-medium hover:text-slate-800"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-orange-50" : ""}`}>
              <Icon className={`w-5 h-5 ${isActive ? "text-orange-600" : "text-slate-400"}`} style={{ strokeWidth: isActive ? 2.2 : 1.8 }} />
            </div>
            <span className="text-[10.5px] leading-none mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DriverLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  useEffect(() => {
    // Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      });
    } else {
      alert("App install karne ke liye mobile browser menu (⋮ ya Share button) par jaakar 'Add to Home screen' par tap karein.");
    }
  };

  const getPageTitle = () => {
    if (pathname === "/driver") return "My Active Tasks";
    if (pathname.includes("completed-cases")) return "Completed Cases History";
    if (pathname.includes("navigation")) return "Route Navigation Map";
    if (pathname.includes("vehicle-diagnostic")) return "Ambulance Diagnostics";
    return "Driver Panel";
  };

  return (
    <div className="flex h-screen w-full bg-[#fcf9f6] text-gray-900 overflow-hidden">
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-[1px]" />
      )}
      <DriverSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={logout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-[76px] bg-white border-b border-orange-100 px-4 sm:px-8 flex items-center justify-between z-30 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-orange-600 hover:text-orange-800 bg-transparent border-none cursor-pointer p-1">
              <Menu className="w-5.5 h-5.5" style={{ strokeWidth: 1.8 }} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-[16px] sm:text-[17.5px] font-bold text-gray-900 leading-tight">{getPageTitle()}</h1>
              <p className="text-[11px] sm:text-[12px] text-gray-400 mt-[3px] font-medium leading-none">Ambulance driver task console</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Install PWA Button */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[12px] font-bold shadow-sm shadow-orange-500/20 transition cursor-pointer"
                title="Install Driver Mobile App"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            <button className="relative w-9.5 h-9.5 bg-orange-50/50 hover:bg-orange-50 transition-colors rounded-full flex items-center justify-center border border-orange-100 cursor-pointer flex-shrink-0">
              <Bell className="w-[18px] h-[18px] text-orange-600" style={{ strokeWidth: 1.8 }} />
              <span className="absolute top-[-2px] right-[-2px] w-[16px] h-[16px] bg-rose-500 text-white text-[9.5px] font-bold rounded-full flex items-center justify-center border border-white">2</span>
            </button>
            <div className="w-px h-8 bg-orange-100 hidden sm:block" />
            <div className="flex items-center gap-3 py-1 flex-shrink-0">
              <DriverHeaderProfile />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#fcf9f6] flex flex-col min-h-[calc(100vh-76px)] pb-16 lg:pb-0">
          <div className="p-4 sm:p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col gap-6">
            {children}
          </div>
          <footer className="hidden sm:flex h-[56px] bg-white border-t border-orange-100 px-6 sm:px-8 items-center justify-between flex-shrink-0 w-full mt-auto text-[11px] font-bold text-gray-400">
            <span>© {new Date().getFullYear()} RESQTRACK SYSTEMS.</span>
            <span className="flex items-center gap-1.5 text-orange-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Driver Connected
            </span>
          </footer>
        </main>
      </div>

      {/* Mobile App Bottom Bar */}
      <MobileBottomBar />
    </div>
  );
}


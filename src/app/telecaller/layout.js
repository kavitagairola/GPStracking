"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  HeartHandshake, Phone, PhoneCall, ClipboardList, MapPin, Users,
  LogOut, Bell, MoreVertical, ChevronDown, Menu, X
} from "lucide-react";

function TelecallerSidebar({ sidebarOpen, setSidebarOpen, user, logout }) {
  const pathname = usePathname();
  const userName = user?.name || "Telecaller";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { href: "/telecaller", icon: ClipboardList, label: "Dashboard", exact: true },
    { href: "/telecaller/new-call", icon: PhoneCall, label: "New Rescue Call", exact: true },
    { href: "/telecaller/active-cases", icon: HeartHandshake, label: "Active Cases", exact: true },
    { href: "/telecaller/driver-status", icon: MapPin, label: "Driver Status", exact: true },
    { href: "/telecaller/contacts", icon: Users, label: "Quick Contacts", exact: true },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200/70 text-slate-700 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      {/* Brand */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between flex-shrink-0">
        <Link href="/telecaller" className="flex items-center gap-2.5">
          <img src="/gokuldham-logo.png" alt="Gokul Dham Logo" className="h-8 w-auto object-contain flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[13.5px] font-black text-slate-800 tracking-wide">Gokul Dham</span>
            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Telecaller Panel</span>
          </div>
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-[2px]">
        <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 block">OPERATIONS</span>
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
                  ? "bg-emerald-50 text-emerald-700 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
              }`}
            >
              <Icon className={`w-[17px] h-[17px] ${isActive ? "text-emerald-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 flex flex-col gap-1 flex-shrink-0 border-t border-slate-100 pt-3 mt-1">
        <button onClick={logout} className="flex items-center gap-3 px-3.5 py-[9.5px] rounded-xl text-[12.5px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer bg-transparent border-none w-full text-left">
          <LogOut className="w-[17px] h-[17px] text-slate-400" style={{ strokeWidth: 1.8 }} />
          <span>Logout</span>
        </button>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-50/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8.5 h-8.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[12.5px] font-black text-slate-800 truncate leading-tight">{userName}</span>
              <span className="text-[9.5px] text-slate-400 font-bold truncate mt-[2px]">Telecaller</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function TelecallerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userName = user?.name || "Telecaller";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getPageTitle = () => {
    if (pathname === "/telecaller") return "Telecaller Dashboard";
    if (pathname.includes("new-call")) return "Log New Rescue Call";
    if (pathname.includes("active-cases")) return "Active Cases";
    if (pathname.includes("driver-status")) return "Driver Live Status";
    if (pathname.includes("contacts")) return "Quick Contacts";
    return "Telecaller Panel";
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-gray-900 overflow-hidden">
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-[1px]" />
      )}
      <TelecallerSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} logout={logout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-[76px] bg-white border-b border-gray-200/60 px-6 sm:px-8 flex items-center justify-between z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-900 bg-transparent border-none cursor-pointer p-1">
              <Menu className="w-5.5 h-5.5" style={{ strokeWidth: 1.8 }} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-[17.5px] font-bold text-gray-900 leading-tight">{getPageTitle()}</h1>
              <p className="text-[12px] text-gray-400 mt-[3px] font-medium leading-none">Rescue call management console</p>
            </div>
          </div>
          <div className="flex items-center gap-5 flex-shrink-0">
            <button className="relative w-9.5 h-9.5 bg-gray-50 hover:bg-gray-100 transition-colors rounded-full flex items-center justify-center border border-gray-200/50 cursor-pointer flex-shrink-0">
              <Bell className="w-[18px] h-[18px] text-gray-500" style={{ strokeWidth: 1.8 }} />
              <span className="absolute top-[-2px] right-[-2px] w-[16px] h-[16px] bg-rose-500 text-white text-[9.5px] font-bold rounded-full flex items-center justify-center border border-white">3</span>
            </button>
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex items-center gap-3 py-1 flex-shrink-0">
              <div className="w-9 h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[13px] font-bold shadow-sm">{userInitials}</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[13px] font-bold text-gray-900 leading-tight">{userName}</span>
                <span className="text-[10px] text-gray-400 font-semibold leading-tight mt-[3px]">Telecaller</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] flex flex-col min-h-[calc(100vh-76px)]">
          <div className="p-6 sm:p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col gap-6">
            {children}
          </div>
          <footer className="h-[56px] bg-white border-t border-gray-200/50 px-6 sm:px-8 flex items-center justify-between flex-shrink-0 w-full mt-auto text-[11px] font-bold text-gray-400">
            <span>© {new Date().getFullYear()} RESQTRACK SYSTEMS.</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Telecaller Active
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

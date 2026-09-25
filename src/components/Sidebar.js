"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  LayoutDashboard,
  HeartHandshake,
  Users,
  Truck,
  MapPin,
  History,
  FileBarChart,
  Bell,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MoreVertical,
  Smartphone,
  X
} from "lucide-react";

export default function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const adminName = user?.name || "Admin";
  const adminInitials = adminName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Collapsible submenu states
  const [openSubmenus, setOpenSubmenus] = useState({
    cases: true,
    drivers: false,
    ambulances: false,
  });

  const toggleSubmenu = (menu) => {
    if (collapsed) {
      // If collapsed, clicking a submenu header expands the sidebar first
      setCollapsed(false);
    }
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const isCaseActive = pathname.startsWith("/admin/cases");
  const isDriverActive = pathname.startsWith("/admin/drivers");
  const isAmbulanceActive = pathname.startsWith("/admin/ambulances");

  const showLabels = !collapsed || sidebarOpen;

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-[99999] w-[270px] bg-white border-r border-slate-200/70 text-slate-700 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      } ${collapsed ? "lg:w-[76px]" : "lg:w-[260px]"}`}
      style={{ height: '100dvh' }}
    >
      {/* Brand Header */}
      <div className={`px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <img src="/gokuldham-logo.png" alt="Gokul Dham Logo" className="h-16 w-auto object-contain flex-shrink-0" />
        </Link>

        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition active:scale-95 touch-manipulation"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" style={{ strokeWidth: 2 }} />
        </button>

        {/* Toggle Collapse Button (Desktop only) */}
        {!collapsed ? (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden lg:flex w-6 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 border border-slate-200 items-center justify-center cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden lg:flex w-6 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 border border-slate-200 items-center justify-center cursor-pointer transition absolute left-[62px] top-6 z-50 shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3.5 py-3 flex flex-col gap-4">

        {/* Core Link */}
        <div className="flex flex-col gap-[2px]">
          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-[9.5px] rounded-xl text-[12.5px] transition-all duration-150 ${pathname === "/admin"
              ? "bg-blue-50 text-blue-600 font-bold"
              : "text-slate-650 hover:text-slate-900 hover:bg-slate-50 font-semibold"
              } ${collapsed ? "justify-center" : ""}`}
            title="Dashboard"
          >
            <LayoutDashboard className={`w-[17px] h-[17px] ${pathname === "/admin" ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 2 }} />
            {showLabels && <span className="animate-in fade-in duration-200">Dashboard</span>}
          </Link>
        </div>

        {/* Category: MANAGEMENT */}
        <div className="flex flex-col gap-1">
          {showLabels ? (
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1 block animate-in fade-in duration-200">
              MANAGEMENT
            </span>
          ) : (
            <hr className="border-slate-100 my-1" />
          )}

          {/* Rescue Cases Submenu */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSubmenu("cases")}
              className={`flex items-center justify-between px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${isCaseActive ? "text-blue-600" : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
                } ${!showLabels ? "justify-center" : ""}`}
              title="Rescue Cases"
            >
              <div className="flex items-center gap-3">
                <HeartHandshake className={`w-[17px] h-[17px] ${isCaseActive ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
                {showLabels && <span className="animate-in fade-in duration-200">Rescue Cases</span>}
              </div>
              {showLabels && (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openSubmenus.cases ? "rotate-180" : ""}`} />
              )}
            </button>
            {openSubmenus.cases && showLabels && (
              <div className="flex flex-col pl-8 mt-1 gap-1">
                <Link
                  href="/admin/cases"
                  onClick={() => setSidebarOpen(false)}
                  className={`text-[12px] py-1.5 hover:text-slate-900 transition-colors font-medium ${pathname === "/admin/cases" ? "text-blue-600 font-bold" : "text-slate-500"
                    }`}
                >
                  All Cases Registry
                </Link>
              </div>
            )}
          </div>

          {/* Drivers Submenu */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSubmenu("drivers")}
              className={`flex items-center justify-between px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${isDriverActive ? "text-blue-600" : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
                } ${!showLabels ? "justify-center" : ""}`}
              title="Drivers"
            >
              <div className="flex items-center gap-3">
                <Users className={`w-[17px] h-[17px] ${isDriverActive ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
                {showLabels && <span className="animate-in fade-in duration-200">Drivers</span>}
              </div>
              {showLabels && (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openSubmenus.drivers ? "rotate-180" : ""}`} />
              )}
            </button>
            {openSubmenus.drivers && showLabels && (
              <div className="flex flex-col pl-8 mt-1 gap-1">
                <Link
                  href="/admin/drivers"
                  onClick={() => setSidebarOpen(false)}
                  className={`text-[12px] py-1.5 hover:text-slate-900 transition-colors font-medium ${pathname === "/admin/drivers" ? "text-blue-600 font-bold" : "text-slate-500"
                    }`}
                >
                  Drivers Directory
                </Link>
              </div>
            )}
          </div>

          {/* Ambulances Submenu */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSubmenu("ambulances")}
              className={`flex items-center justify-between px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${isAmbulanceActive ? "text-blue-600" : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
                } ${!showLabels ? "justify-center" : ""}`}
              title="Ambulances"
            >
              <div className="flex items-center gap-3">
                <Truck className={`w-[17px] h-[17px] ${isAmbulanceActive ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
                {showLabels && <span className="animate-in fade-in duration-200">Ambulances</span>}
              </div>
              {showLabels && (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openSubmenus.ambulances ? "rotate-180" : ""}`} />
              )}
            </button>
            {openSubmenus.ambulances && showLabels && (
              <div className="flex flex-col pl-8 mt-1 gap-1">
                <Link
                  href="/admin/ambulances"
                  onClick={() => setSidebarOpen(false)}
                  className={`text-[12px] py-1.5 hover:text-slate-900 transition-colors font-medium ${pathname === "/admin/ambulances" ? "text-blue-600 font-bold" : "text-slate-500"
                    }`}
                >
                  Ambulance Fleet
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Category: TRACKING */}
        <div className="flex flex-col gap-1">
          {showLabels ? (
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1 block animate-in fade-in duration-200">
              TRACKING
            </span>
          ) : (
            <hr className="border-slate-100 my-1" />
          )}

          <Link
            href="/admin/live-tracking"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${pathname === "/admin/live-tracking"
              ? "bg-blue-50 text-blue-600 font-bold"
              : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
              } ${!showLabels ? "justify-center" : ""}`}
            title="Live Tracking"
          >
            <MapPin className={`w-[17px] h-[17px] ${pathname === "/admin/live-tracking" ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
            {showLabels && <span className="animate-in fade-in duration-200">Live Tracking</span>}
          </Link>

          <Link
            href="/admin/gps-history"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${pathname === "/admin/gps-history"
              ? "bg-blue-50 text-blue-600 font-bold"
              : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
              } ${!showLabels ? "justify-center" : ""}`}
            title="GPS History"
          >
            <History className={`w-[17px] h-[17px] ${pathname === "/admin/gps-history" ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
            {showLabels && <span className="animate-in fade-in duration-200">GPS History</span>}
          </Link>
        </div>

        {/* Category: REPORTS */}
        <div className="flex flex-col gap-1">
          {showLabels ? (
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1 block animate-in fade-in duration-200">
              REPORTS
            </span>
          ) : (
            <hr className="border-slate-100 my-1" />
          )}

          <Link
            href="/admin/reports"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${pathname === "/admin/reports"
              ? "bg-blue-50 text-blue-600 font-bold"
              : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
              } ${!showLabels ? "justify-center" : ""}`}
            title="Reports"
          >
            <FileBarChart className={`w-[17px] h-[17px] ${pathname === "/admin/reports" ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
            {showLabels && <span className="animate-in fade-in duration-200">Reports</span>}
          </Link>
        </div>

        {/* Category: SETTINGS */}
        <div className="flex flex-col gap-1">
          {showLabels ? (
            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1 block animate-in fade-in duration-200">
              SETTINGS
            </span>
          ) : (
            <hr className="border-slate-100 my-1" />
          )}

          <Link
            href="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold transition-all ${pathname === "/admin/settings"
              ? "bg-blue-50 text-blue-600 font-bold"
              : "text-slate-650 hover:text-slate-900 hover:bg-slate-50"
              } ${!showLabels ? "justify-center" : ""}`}
            title="Settings"
          >
            <Settings className={`w-[17px] h-[17px] ${pathname === "/admin/settings" ? "text-blue-600" : "text-slate-400"}`} style={{ strokeWidth: 1.8 }} />
            {showLabels && <span className="animate-in fade-in duration-200">Settings</span>}
          </Link>

          <Link
            href="/driver"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-[9.5px] rounded-xl text-[12.5px] font-semibold text-orange-600 bg-orange-50/70 hover:bg-orange-100/70 transition-all ${!showLabels ? "justify-center" : ""}`}
            title="Driver PWA App"
          >
            <Smartphone className="w-[17px] h-[17px] text-orange-600" style={{ strokeWidth: 2 }} />
            {showLabels && <span className="animate-in fade-in duration-200 font-bold">Install Mobile App</span>}
          </Link>
        </div>

      </nav>

      {/* Sidebar Footer — User Avatar block */}
      <div className="px-3.5 pb-4 flex flex-col gap-1.5 flex-shrink-0 border-t border-slate-100 pt-3 mt-1">
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-[9px] rounded-xl text-[12.5px] font-semibold text-slate-550 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer bg-transparent border-none w-full text-left ${!showLabels ? "justify-center" : ""
            }`}
          title="Logout"
        >
          <LogOut className="w-[17px] h-[17px] text-slate-400" />
          {showLabels && <span className="animate-in fade-in duration-200">Logout</span>}
        </button>

        <div className={`flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-50/50 ${!showLabels ? "justify-center" : ""}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {adminInitials}
            </div>
            {showLabels && (
              <div className="flex flex-col overflow-hidden animate-in fade-in duration-200">
                <span className="text-[12.5px] font-black text-slate-800 truncate leading-tight">{adminName}</span>
                <span className="text-[9.5px] text-slate-400 truncate mt-[2px] font-bold">Super Admin</span>
              </div>
            )}
          </div>
          {showLabels && (
            <button className="text-slate-400 hover:text-slate-600 transition bg-transparent border-none cursor-pointer">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

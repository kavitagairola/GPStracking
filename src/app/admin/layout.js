"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] w-full bg-[#f8fafc] text-gray-900 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-[9998] lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar setSidebarOpen={setSidebarOpen} />

        {/* Scrollable Page Wrapper */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] flex flex-col min-h-[calc(100vh-76px)]">
          {/* Page Contents */}
          <div className="p-6 sm:p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col gap-6">
            {children}
          </div>

          {/* Standard Minimal Footer */}
          <footer className="h-[56px] bg-white border-t border-gray-200/50 px-6 sm:px-8 flex items-center justify-between flex-shrink-0 w-full mt-auto text-[11px] font-bold text-gray-400">
            <span>© {new Date().getFullYear()} RESQTRACK SYSTEMS.</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              All Operations Active
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

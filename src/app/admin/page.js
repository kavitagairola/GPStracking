"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  Phone,
  FilePlus2,
  Truck,
  CheckCircle2,
  MoreVertical,
  MapPin,
  Battery,
  Zap,
  Activity,
  Compass,
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function AdminDashboard() {
  const [gpsData, setGpsData] = useState([]);
  const [cases, setCases] = useState([]);
  const [loadingGps, setLoadingGps] = useState(true);
  const [loadingCases, setLoadingCases] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");

  // Fetch real-time GPS telemetry and persistent Cases
  const fetchData = async () => {
    try {
      // 1. Fetch GPS Data
      const gpsRes = await fetch("/api/gps?t=" + Date.now());
      const gpsJson = await gpsRes.json();
      if (gpsJson.success && gpsJson.data?.object) {
        setGpsData(gpsJson.data.object);
        setGpsError(null);
      } else {
        setGpsError("Could not sync with Millitrack server.");
      }

      // 2. Fetch Cases Data
      const casesRes = await fetch("/api/cases?t=" + Date.now());
      const casesJson = await casesRes.json();
      if (casesJson.success && casesJson.data) {
        setCases(casesJson.data);
      }
    } catch (err) {
      console.error("Fetch Error on Admin Dashboard:", err);
      setGpsError("Network error. Sync failed.");
    } finally {
      setLoadingGps(false);
      setLoadingCases(false);
      setLastUpdated(new Date().toLocaleTimeString("en-IN"));
    }
  };

  useEffect(() => {
    fetchData();
    // Poll real-time data every 4 seconds
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Enrich all GPS vehicles dynamically
  const enrichedVehicles = gpsData.map(v => enrichGpsVehicle(v)).filter(Boolean);

  // Dynamic Case Counts
  const totalCallsToday = cases.length;
  const newRequestsCount = cases.filter(c => c.status === "Assigned").length;
  const activeRescuesList = cases.filter(c => c.status !== "Completed");
  const activeRescuesCount = activeRescuesList.length;
  const completedCasesCount = cases.filter(c => c.status === "Completed").length;

  // Active Rescue Status Breakdown
  const enRouteCount = cases.filter(c => c.status === "En Route").length;
  const reachedCount = cases.filter(c => c.status === "Reached Location").length;
  const pickedCount = cases.filter(c => c.status === "Animal Picked").length;
  const hospitalCount = cases.filter(c => c.status === "Hospital Reached").length;
  const assignedCount = cases.filter(c => c.status === "Assigned").length;

  // Total mileage today across fleet
  const totalGpsDistanceToday = enrichedVehicles.reduce((sum, v) => sum + (parseFloat(v.todayDistKm) || 0), 0);

  // Dynamic Top Drivers Calculation
  const driverRescueCounts = {};
  cases.forEach(c => {
    if (c.driver) {
      driverRescueCounts[c.driver] = (driverRescueCounts[c.driver] || 0) + 1;
    }
  });

  const sortedTopDrivers = Object.entries(driverRescueCounts)
    .map(([name, rescues]) => ({ name, rescues }))
    .sort((a, b) => b.rescues - a.rescues)
    .slice(0, 3);

  // Fallback if no cases logged yet
  const topDrivers = sortedTopDrivers.length > 0 ? sortedTopDrivers : [
    { name: "Raj Kumar", rescues: 0 },
    { name: "Manoj Yadav", rescues: 0 },
    { name: "Pawan Singh", rescues: 0 }
  ];

  // Donut SVG calculations
  const totalActiveForDonut = activeRescuesCount || 1;
  const circum = 238.76;
  const enRouteDash = (enRouteCount / totalActiveForDonut) * circum;
  const reachedDash = (reachedCount / totalActiveForDonut) * circum;
  const pickedDash = (pickedCount / totalActiveForDonut) * circum;
  const hospitalDash = (hospitalCount / totalActiveForDonut) * circum;
  const assignedDash = (assignedCount / totalActiveForDonut) * circum;

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "HIGH": return "bg-red-50 text-red-650 border border-red-100";
      case "MEDIUM": return "bg-amber-50 text-amber-600 border border-amber-100";
      case "LOW": return "bg-gray-50 text-gray-500 border border-gray-150";
      default: return "bg-gray-50 text-gray-500";
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Assigned": return "bg-blue-50 text-blue-600 border border-blue-100";
      case "En Route": return "bg-orange-50 text-orange-600 border border-orange-100";
      case "Reached Location": return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "Animal Picked": return "bg-amber-50 text-amber-700 border border-amber-150";
      case "Hospital Reached": return "bg-purple-50 text-purple-600 border border-purple-100";
      case "Completed": return "bg-teal-50 text-teal-600 border border-teal-100";
      default: return "bg-gray-50 text-gray-500";
    }
  };

  const todayStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800">

      {/* Top filter controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[12px] font-bold text-gray-400">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Millitrack GPS & Operations Feed: {loadingGps ? "Syncing..." : `Live as of ${lastUpdated || 'now'} IST`}</span>
        </div>

        {/* Date display badge */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 bg-white text-[12.5px] font-black text-slate-600 shadow-3xs">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{todayStr}</span>
        </div>
      </div>

      {/* ===== 4 DYNAMIC KPI CARDS ROW ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* 1. Total Calls Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-black text-gray-400 uppercase tracking-wide">Total Calls Today</span>
            <span className="text-[28px] font-black text-slate-900 leading-tight mt-1">{totalCallsToday}</span>
            <span className="text-[11.5px] text-blue-600 font-extrabold mt-1.5 flex items-center gap-0.5">
              Live Synced <span className="text-gray-400 font-normal">from Telecallers</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Phone className="w-5.5 h-5.5 text-blue-500" />
          </div>
        </div>

        {/* 2. New Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-black text-gray-400 uppercase tracking-wide">New Assigned</span>
            <span className="text-[28px] font-black text-slate-900 leading-tight mt-1">{newRequestsCount}</span>
            <span className="text-[11.5px] text-emerald-600 font-extrabold mt-1.5 flex items-center gap-0.5">
              Awaiting Trip <span className="text-gray-400 font-normal">Start</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FilePlus2 className="w-5.5 h-5.5 text-emerald-500" />
          </div>
        </div>

        {/* 3. Active Rescues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-black text-gray-400 uppercase tracking-wide">Active Rescues</span>
            <span className="text-[28px] font-black text-slate-900 leading-tight mt-1">
              {activeRescuesCount}
            </span>
            <span className="text-[11.5px] text-amber-500 font-extrabold mt-1.5 flex items-center gap-0.5">
              In progress <span className="text-gray-400 font-normal">across fleet</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Truck className="w-5.5 h-5.5 text-amber-500 animate-pulse" />
          </div>
        </div>

        {/* 4. Completed Cases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-black text-gray-400 uppercase tracking-wide">Completed Cases</span>
            <span className="text-[28px] font-black text-slate-900 leading-tight mt-1">{completedCasesCount}</span>
            <span className="text-[11.5px] text-purple-650 font-extrabold mt-1.5 flex items-center gap-0.5">
              Successfully <span className="text-gray-400 font-normal">rescued</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5.5 h-5.5 text-purple-500" />
          </div>
        </div>

      </div>

      {/* ===== MIDDLE ROW (Live Telemetry Table & Dynamic Status Donut) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Left Side: Live Ambulance Fleet Telemetry Status (span 8) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-55 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-[14px] font-black text-slate-800">Live Ambulance Fleet Telemetry</h3>
            </div>
            <Link href="/admin/live-tracking" className="text-[11px] font-black text-blue-600 hover:underline flex items-center gap-1">
              <span>Full Fleet Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto w-full">
            {loadingGps && enrichedVehicles.length === 0 ? (
              <span className="text-gray-400 text-[12px] font-bold block py-12 text-center">Connecting GPS transponders...</span>
            ) : gpsError ? (
              <span className="text-rose-500 text-[12px] font-bold block py-12 text-center">{gpsError}</span>
            ) : (
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-slate-50/50">
                    <th className="py-2.5 px-3">Unit Name</th>
                    <th className="py-2.5 px-3">Assigned Driver</th>
                    <th className="py-2.5 px-3">Live Speed</th>
                    <th className="py-2.5 px-3">Ignition State</th>
                    <th className="py-2.5 px-3 text-right">Battery Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                  {enrichedVehicles.slice(0, 6).map((vehicle, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 font-black text-slate-850">
                        {vehicle.vehicleName || `Ambulance ${String(vehicle.num || idx + 1).padStart(2, '0')}`}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-extrabold">
                        {vehicle.driverName}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-mono">
                        {vehicle.speedDisplay}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${vehicle.isIgnitionOn
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                          {vehicle.isIgnitionOn ? "ON" : "OFF"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {vehicle.batteryDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Dynamic Active Rescues Donut + Dynamic Top Drivers (span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Card 1: Dynamic Rescues Status Donut */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between">
            <h3 className="text-[13px] font-black text-slate-800 mb-3 border-b border-slate-50 pb-2">Active Rescues Status</h3>

            <div className="flex items-center gap-5 justify-between">
              {/* Left: Dynamic Donut SVG */}
              <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                  
                  {/* Blue: En Route */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="11" 
                    strokeDasharray={`${enRouteDash} ${circum}`} strokeDashoffset="0" />
                  
                  {/* Emerald: Reached Location */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="11" 
                    strokeDasharray={`${reachedDash} ${circum}`} strokeDashoffset={`-${enRouteDash}`} />
                  
                  {/* Orange: Animal Picked */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f97316" strokeWidth="11" 
                    strokeDasharray={`${pickedDash} ${circum}`} strokeDashoffset={`-${enRouteDash + reachedDash}`} />
                  
                  {/* Purple: Hospital Reached */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" strokeWidth="11" 
                    strokeDasharray={`${hospitalDash} ${circum}`} strokeDashoffset={`-${enRouteDash + reachedDash + pickedDash}`} />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[16px] font-black text-slate-800 tracking-tight leading-none">{activeRescuesCount}</span>
                  <span className="text-[8px] text-gray-400 font-extrabold uppercase mt-0.5 leading-none">Active</span>
                </div>
              </div>

              {/* Right: Dynamic Legend Counts */}
              <div className="flex-1 flex flex-col gap-1 text-[10.5px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-slate-500 font-bold">En Route</span>
                  </div>
                  <span className="font-extrabold text-slate-800">{enRouteCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-500 font-bold">Reached</span>
                  </div>
                  <span className="font-extrabold text-slate-800">{reachedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span className="text-slate-500 font-bold">Picked</span>
                  </div>
                  <span className="font-extrabold text-slate-800">{pickedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span className="text-slate-500 font-bold">Hospital</span>
                  </div>
                  <span className="font-extrabold text-slate-800">{hospitalCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Dynamic Top Drivers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                <h3 className="text-[13px] font-black text-slate-800">Top Drivers</h3>
                <Link href="/admin/drivers" className="text-[10px] font-black text-blue-600 hover:underline">
                  View All
                </Link>
              </div>

              <div className="flex flex-col gap-2">
                {topDrivers.map((driver, idx) => (
                  <div key={driver.name} className="flex items-center justify-between text-[11.5px] border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-[10px] font-extrabold text-slate-500">
                        {idx + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-[9.5px]">
                        {driver.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-extrabold text-slate-700">{driver.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-extrabold">{driver.rescues} Rescues</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-[10.5px] text-slate-650 font-extrabold mt-3">
              <span>Fleet GPS Mileage:</span>
              <span className="text-slate-850 font-black">{totalGpsDistanceToday.toFixed(1)} km</span>
            </div>
          </div>

        </div>

      </div>

      {/* ===== BOTTOM TABLE ROW: Dynamic Latest Rescue Requests (SYNCED WITH TELECALLER & DRIVERS) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        <div className="lg:col-span-12 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-col w-full">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <div className="flex flex-col">
              <h3 className="text-[14px] font-black text-slate-800">Latest Rescue Requests</h3>
              <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Real-time rescue calls dispatch list logged by telecallers & updated by drivers.</p>
            </div>
            <Link href="/admin/cases" className="text-[12px] font-black text-blue-600 hover:underline">
              View All Cases
            </Link>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[12.5px] font-medium">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-slate-50/50">
                  <th className="py-3.5 px-3">Case ID</th>
                  <th className="py-3.5 px-3">Caller Name</th>
                  <th className="py-3.5 px-3">Animal Type</th>
                  <th className="py-3.5 px-3">Incident Location</th>
                  <th className="py-3.5 px-3">Status Milestone</th>
                  <th className="py-3.5 px-3">Assigned Crew</th>
                  <th className="py-3.5 px-3 text-right">Logged Time</th>
                  <th className="py-3.5 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-gray-400 font-bold text-[12px]">
                      {loadingCases ? "Loading live cases..." : "No rescue cases logged yet."}
                    </td>
                  </tr>
                ) : (
                  cases.slice(0, 8).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-slate-855">{c.id}</td>
                      <td className="py-3 px-3 text-slate-650 font-bold">
                        <div className="flex flex-col">
                          <span>{c.caller}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{c.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {c.animal}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate" title={c.location}>
                        {c.location}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-extrabold">
                        {c.driver || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-400 font-extrabold text-[11px]">
                        {c.time}
                      </td>
                      <td className="py-3 px-2 text-gray-400 hover:text-gray-700 cursor-pointer text-center">
                        <MoreVertical className="w-4 h-4 inline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

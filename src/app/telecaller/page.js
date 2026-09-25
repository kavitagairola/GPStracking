"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, MapPin, Users, Heart, AlertOctagon, 
  Clock, Plus, Search, ChevronRight, Phone, HeartHandshake, Eye
} from "lucide-react";
import Link from "next/link";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function TelecallerDashboard() {
  const [cases, setCases] = useState([]);
  const [gpsData, setGpsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch real-time GPS telemetry and persistent cases
  useEffect(() => {
    const fetchData = async () => {
      try {
        const gpsRes = await fetch("/api/gps?t=" + Date.now());
        const gpsJson = await gpsRes.json();
        if (gpsJson.success && gpsJson.data?.object) {
          setGpsData(gpsJson.data.object);
        }

        const casesRes = await fetch("/api/cases?t=" + Date.now());
        const casesJson = await casesRes.json();
        if (casesJson.success && casesJson.data) {
          setCases(casesJson.data);
        }
      } catch (err) {
        console.error("Data Fetch Error on Telecaller Dashboard:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Build the live lookup map for driver -> vehicle data using shared utils
  const driverLiveMap = {};
  gpsData.forEach((v) => {
    const enriched = enrichGpsVehicle(v);
    if (enriched) {
      driverLiveMap[enriched.driverName] = {
        ...enriched,
        location: enriched.address,
        speedKmh: enriched.speedDisplay,
      };
    }
  });

  const getPriorityStyle = (prio) => {
    switch (prio) {
      case "HIGH": return "bg-rose-50 text-rose-600 border border-rose-100";
      case "MEDIUM": return "bg-amber-50 text-amber-600 border border-amber-100";
      case "LOW": return "bg-gray-50 text-gray-500 border border-gray-150";
      default: return "bg-gray-50 text-gray-500";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Assigned": return "bg-blue-50 text-blue-600 border border-blue-100";
      case "En Route": return "bg-orange-50 text-orange-600 border border-orange-100";
      case "Reached Location": return "bg-teal-50 text-teal-600 border border-teal-100";
      case "Animal Picked": return "bg-violet-50 text-violet-600 border border-violet-100";
      case "Hospital Reached": return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      default: return "bg-slate-50 text-slate-600 border border-slate-150";
    }
  };

  const filteredCases = cases.filter(c => 
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.caller.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.animal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/60 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="flex flex-col">
            <span className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">Active Rescues</span>
            <span className="text-[24px] font-black text-gray-800 mt-1">{cases.length}</span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/60 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="flex flex-col">
            <span className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">Drivers On Duty</span>
            <span className="text-[24px] font-black text-gray-800 mt-1">
              {Object.values(driverLiveMap).filter(d => d.isIgnitionOn).length} / 16
            </span>
          </div>
          <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/60 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="flex flex-col">
            <span className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">Average Response</span>
            <span className="text-[24px] font-black text-gray-800 mt-1">18.5 Min</span>
          </div>
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/60 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="flex flex-col">
            <span className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">High Priority Cases</span>
            <span className="text-[24px] font-black text-gray-800 mt-1">
              {cases.filter(c => c.priority === "HIGH").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Full-width Active Cases Registry */}
      <div className="w-full bg-white border border-gray-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h3 className="text-[15.5px] font-black text-gray-800 leading-tight">Active Cases Registry</h3>
            <p className="text-[11.5px] text-gray-400 mt-1">Complete overview of real-time rescue cases currently handled by telecallers.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Search cases..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9.5 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <Link 
              href="/telecaller/new-call"
              className="h-9.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log New Call</span>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[450px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Case ID / Time</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Caller Contact</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Animal / Condition</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rescue Spot</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Driver</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rescue Stage</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-[12px] font-bold text-slate-400">
                    No active rescue cases found.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const liveData = driverLiveMap[c.driver];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-black text-slate-800 leading-tight">{c.id}</span>
                          <span className="text-[9.5px] text-gray-400 mt-1 font-bold">{c.time}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-bold text-slate-700 leading-tight">{c.caller}</span>
                          <a href={`tel:${c.phone}`} className="text-[10px] text-emerald-600 hover:text-emerald-700 mt-1 font-bold flex items-center gap-0.5">
                            <Phone className="w-3 h-3 text-slate-350" /> {c.phone}
                          </a>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-medium text-slate-700">{c.animal}</span>
                          <span className={`px-2 py-0.5 text-[9.5px] font-bold rounded-full ${getPriorityStyle(c.priority)}`}>
                            {c.priority}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-1 truncate max-w-[200px]" title={c.condition}>{c.condition}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[12px] text-slate-600 font-bold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          <span className="truncate max-w-[180px]" title={c.location}>{c.location}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-black text-slate-800 leading-tight">{c.driver}</span>
                          <span className="text-[10px] font-bold text-emerald-600 mt-1">
                            {liveData ? `Ambulance ${String(liveData.num).padStart(2, '0')} (${liveData.speedDisplay})` : "Ambulance --"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 text-[9.5px] font-black uppercase rounded-full inline-flex items-center gap-1 ${getStatusColor(c.status)}`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Link 
                          href="/telecaller/active-cases"
                          className="h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition active:scale-[0.97]"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>View Detail</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

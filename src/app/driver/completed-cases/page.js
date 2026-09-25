"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle, MapPin, Clock, Camera, Award, Activity, 
  AlertOctagon, TrendingUp, ChevronDown, ChevronUp, Search,
  Play, Package, Truck, CheckCircle2, User, Phone, Heart
} from "lucide-react";

function fmtTime(iso) {
  if (!iso) return null;
  if (typeof iso === "string" && !iso.includes("T") && !iso.includes("-")) {
    return iso;
  }
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch (e) {
    return iso;
  }
}

const STEPS = [
  { key: "assignedAt",        fallbackKey: "time",        label: "Assigned",      icon: CheckCircle  },
  { key: "tripStartedAt",     fallbackKey: null,          label: "Trip Started",   icon: Play         },
  { key: "reachedAt",         fallbackKey: null,          label: "Reached Spot",   icon: MapPin       },
  { key: "pickupConfirmedAt", fallbackKey: null,          label: "Animal Picked",  icon: Package      },
  { key: "hospitalReachedAt", fallbackKey: null,          label: "Hospital",       icon: Truck        },
  { key: "unloadCompletedAt", fallbackKey: "completedAt", label: "Completed",      icon: CheckCircle2 },
];

export default function CompletedCasesPage() {
  const [completedCases, setCompletedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCase, setExpandedCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [driverName, setDriverName] = useState("Raj Kumar");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(json => {
        if (json.user && json.user.name) {
          setDriverName(json.user.name);
        } else {
          const saved = localStorage.getItem("currentDriverName");
          if (saved) setDriverName(saved);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("currentDriverName");
        if (saved) setDriverName(saved);
      });
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/cases?t=" + Date.now());
        const json = await res.json();
        if (json.success && json.data) {
          const mine = json.data.filter(
            c => c.driver === driverName && c.status === "Completed"
          );
          setCompletedCases(mine);
        }
      } catch (err) {
        console.error("Failed to fetch completed cases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
    const interval = setInterval(fetch_, 15000);
    return () => clearInterval(interval);
  }, [driverName]);

  const getAnimalIcon = (animal) => {
    return <Heart className="w-4 h-4 text-orange-600" />;
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "HIGH": return "bg-rose-100 text-rose-700 border-rose-200";
      case "MEDIUM": return "bg-amber-100 text-amber-700 border-amber-200";
      case "LOW": return "bg-slate-100 text-slate-500 border-slate-200";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const filtered = completedCases.filter(c =>
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.caller?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.animal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCases = completedCases.length;
  const highPriority = completedCases.filter(c => c.priority === "HIGH").length;
  const withPhotos = completedCases.filter(c => c.photo).length;

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Resolved", value: totalCases, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
          { label: "High Priority", value: highPriority, color: "text-rose-600", bg: "bg-rose-50", icon: AlertOctagon },
          { label: "With Photos", value: withPhotos, color: "text-blue-600", bg: "bg-blue-50", icon: Camera },
          { label: "Success Rate", value: totalCases > 0 ? "100%" : "—", color: "text-orange-600", bg: "bg-orange-50", icon: TrendingUp },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-2xs flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className={`text-[20px] font-black ${color} mt-0.5 leading-tight`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Completed case list */}
      <div className="bg-white rounded-2xl border border-orange-100 shadow-2xs flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-orange-50">
          <div>
            <h3 className="text-[14.5px] font-bold text-gray-900">Completed Case Archive</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">All rescue missions you successfully resolved.</p>
          </div>
          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-4 bg-orange-50/50 border border-orange-100 rounded-xl text-[12px] placeholder-gray-400 focus:outline-none focus:bg-white transition-all w-56"
            />
          </div>
        </div>

        {/* Cases list */}
        <div className="flex flex-col divide-y divide-orange-50">
          {loading && (
            <div className="p-12 text-center text-gray-400 font-bold text-[12px]">
              Loading case history...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center">
                <Award className="w-7 h-7 text-orange-500" />
              </div>
              <p className="text-[12.5px] font-bold text-gray-500">No completed cases found.</p>
              <p className="text-[11px] text-gray-400">Complete a case in My Tasks to see it here.</p>
            </div>
          )}

          {filtered.map((c) => {
            const isExpanded = expandedCase === c.id;
            return (
              <div key={c.id} className="flex flex-col transition-all">
                
                {/* Summary row (always visible) */}
                <div
                  className="flex items-center gap-4 p-4 hover:bg-orange-50/30 transition cursor-pointer"
                  onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                >
                  {/* Animal Avatar */}
                  <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getAnimalIcon(c.animal)}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-black text-slate-800">{c.id}</span>
                      <span className={`px-2 py-[1px] text-[9px] font-bold border rounded-full ${getPriorityBadge(c.priority)}`}>
                        {c.priority} Priority
                      </span>
                      <span className="px-2 py-[1px] text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> Completed
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-500 font-medium mt-0.5 truncate">
                      {c.animal} • {c.caller} • <span className="text-orange-600">{c.location}</span>
                    </p>
                  </div>

                  {/* Photo thumbnail if available */}
                  {c.photo && (
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-orange-100 flex-shrink-0">
                      <img src={c.photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Date + Expand toggle */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-gray-400 font-medium">{c.completedAt || c.time}</span>
                    <div className="text-orange-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="bg-orange-50/30 border-t border-orange-100 p-5 flex flex-col gap-6">
                    
                    {/* Top Section: Metadata Grid + Photo */}
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* Left: Case Details */}
                      <div className="flex-1 flex flex-col gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: "Case ID", val: c.id },
                            { label: "Caller Name", val: c.caller },
                            { label: "Phone", val: c.phone || "N/A" },
                            { label: "Animal Species", val: c.animal },
                            { label: "Condition", val: c.condition },
                            { label: "Priority Level", val: c.priority },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex flex-col gap-0.5">
                              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                              <span className="text-[12px] font-semibold text-slate-800">{val}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-1 pt-1">
                          <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" /> Incident Rescue Location
                          </span>
                          <span className="text-[12.5px] font-bold text-slate-800">{c.location}</span>
                        </div>
                      </div>

                      {/* Right: Animal Photo */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-orange-500" /> Rescued Animal Photo
                        </span>
                        {c.photo ? (
                          <div className="w-[180px] h-[130px] rounded-xl overflow-hidden border border-orange-200 shadow-3xs">
                            <img
                              src={c.photo}
                              alt={`${c.animal} rescue photo`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-[180px] h-[130px] rounded-xl border border-dashed border-orange-200 bg-white flex flex-col items-center justify-center gap-2 text-gray-400">
                            <Camera className="w-6 h-6 text-orange-300" />
                            <span className="text-[10px] font-bold">No photo attached</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Full Horizontal Timeline Progression */}
                    <div className="bg-white border border-orange-100 rounded-2xl p-4 flex flex-col gap-3 shadow-3xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Complete Mission Progression Timeline
                      </span>
                      <div className="w-full overflow-x-auto pb-1">
                        <div className="min-w-[580px] flex items-center justify-between relative px-2 py-1">
                          {STEPS.map((step, idx) => {
                            const val = c[step.key] || (step.fallbackKey ? c[step.fallbackKey] : null);
                            const Icon = step.icon;
                            const isLast = idx === STEPS.length - 1;

                            return (
                              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                                {!isLast && (
                                  <div className="absolute top-4 left-[50%] w-full h-[2px] bg-emerald-500 -z-0" />
                                )}
                                <div className="w-7.5 h-7.5 rounded-full bg-emerald-500 text-white flex items-center justify-center z-10 shadow-xs ring-2 ring-emerald-100">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-800 mt-2 text-center leading-tight">
                                  {step.label}
                                </span>
                                <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md mt-1 whitespace-nowrap">
                                  {val ? fmtTime(val) : "--:--"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Banner */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                        <span className="text-[12px] font-bold text-emerald-800">
                          Rescue Operation Completed & Animal Delivered to Hospital.
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {c.completedAt || "Completed"}
                      </span>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

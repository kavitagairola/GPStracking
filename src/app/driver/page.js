"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle, Play, Navigation, MapPin, Phone,
  Camera, Upload, CheckCircle2, Clock, AlertTriangle,
  Package, Truck, Timer, ChevronRight, AlertCircle, X
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

// Format ISO timestamp to readable IST time
function fmtTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// Countdown hook — returns { mm, ss, expired } from a start ISO timestamp + durationSecs
function useCountdown(startIso, durationSecs = 900) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!startIso) { setRemaining(null); return; }
    const tick = () => {
      const elapsed = (Date.now() - new Date(startIso).getTime()) / 1000;
      const rem = Math.max(0, durationSecs - elapsed);
      setRemaining(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso, durationSecs]);

  if (remaining === null) return { mm: 15, ss: 0, expired: false, started: false };
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);
  return { mm, ss, expired: remaining === 0, started: true };
}

// The 6 timeline steps
const STEPS = [
  { key: "assignedAt",        label: "Case Assigned",      icon: CheckCircle  },
  { key: "tripStartedAt",     label: "Trip Started",       icon: Play         },
  { key: "reachedAt",         label: "Reached Spot",       icon: MapPin       },
  { key: "pickupConfirmedAt", label: "Animal Picked Up",   icon: Package      },
  { key: "hospitalReachedAt", label: "Hospital Reached",   icon: Truck        },
  { key: "unloadCompletedAt", label: "Unload Complete",    icon: CheckCircle2 },
];

// Single Case Card with horizontal timeline, confirmation modal & English labels
function CaseCard({ c, onUpdate }) {
  const [photoFiles, setPhotoFiles] = useState({});
  const [uploadError, setUploadError] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    newStatus: "",
    photoUrl: null,
  });

  const countdown = useCountdown(c.unloadStartedAt, 900); // 15 min = 900s

  const priorityColors = {
    HIGH:     "bg-rose-50 text-rose-600 border-rose-200",
    MEDIUM:   "bg-amber-50 text-amber-600 border-amber-200",
    LOW:      "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  const statusToStepIdx = {
    "Assigned":         0,
    "En Route":         1,
    "Reached Location": 2,
    "Animal Picked":    3,
    "Hospital Reached": 4,
    "Completed":        5,
  };

  const currentStepIdx = (() => {
    if (c.unloadCompletedAt) return 5;
    if (c.hospitalReachedAt) return 4;
    if (c.pickupConfirmedAt) return 3;
    if (c.reachedAt)         return 2;
    if (c.tripStartedAt)     return 1;
    return statusToStepIdx[c.status] ?? 0;
  })();

  const isHospitalReached = c.status === "Hospital Reached";
  const isCompleted       = c.status === "Completed";

  // Action button configuration per status
  const getActionConfig = () => {
    switch (c.status) {
      case "Assigned":
        return {
          label: "Start Trip",
          icon: Play,
          colorClass: "bg-blue-600 hover:bg-blue-700",
          onClick: () => {
            setConfirmModal({
              open: true,
              title: "Start Rescue Trip?",
              description: "Are you ready to navigate to the incident location?",
              newStatus: "En Route",
              photoUrl: null,
            });
          }
        };
      case "En Route":
        return {
          label: "Mark Reached Spot",
          icon: MapPin,
          colorClass: "bg-orange-500 hover:bg-orange-600",
          onClick: () => {
            setConfirmModal({
              open: true,
              title: "Confirm Arrival at Spot?",
              description: "Are you sure you have arrived at the rescue site?",
              newStatus: "Reached Location",
              photoUrl: null,
            });
          }
        };
      case "Reached Location":
        return {
          label: "Confirm Animal Picked Up",
          icon: CheckCircle,
          colorClass: "bg-violet-600 hover:bg-violet-700",
          onClick: () => {
            const photo = photoFiles[c.id];
            if (!photo) {
              setUploadError(prev => ({ ...prev, [c.id]: "Animal photo is mandatory before confirming pickup." }));
              return;
            }
            setConfirmModal({
              open: true,
              title: "Confirm Animal Pickup?",
              description: "Verify that the animal is safely secured inside the ambulance.",
              newStatus: "Animal Picked",
              photoUrl: photo,
            });
          }
        };
      case "Animal Picked":
        return {
          label: "Mark Hospital Reached",
          icon: Truck,
          colorClass: "bg-teal-600 hover:bg-teal-700",
          onClick: () => {
            setConfirmModal({
              open: true,
              title: "Confirm Arrival at Hospital?",
              description: "Have you arrived at the veterinary hospital?",
              newStatus: "Hospital Reached",
              photoUrl: null,
            });
          }
        };
      default:
        return null;
    }
  };

  const actionConfig = getActionConfig();

  const handleExecuteStatusUpdate = () => {
    onUpdate(c.id, confirmModal.newStatus, confirmModal.photoUrl);
    setConfirmModal({ open: false, title: "", description: "", newStatus: "", photoUrl: null });
  };

  return (
    <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs relative">
      
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-black text-slate-900">{c.id}</span>
              <span className={`px-2.5 py-0.5 text-[9.5px] font-black rounded-full border uppercase tracking-wide ${priorityColors[c.priority] || priorityColors.MEDIUM}`}>
                {c.priority} Priority
              </span>
            </div>
            <span className="text-[12px] text-slate-600 font-semibold">
              Reporter: {c.caller} · <a href={`tel:${c.phone}`} className="text-orange-600 font-bold hover:underline">+91 {c.phone}</a>
            </span>
          </div>
          <span className={`px-3 py-1 rounded-xl text-[10.5px] font-black border whitespace-nowrap ${
            isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            isHospitalReached ? "bg-teal-50 text-teal-700 border-teal-200" :
            "bg-orange-50 text-orange-700 border-orange-200"
          }`}>
            {c.status}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-start gap-1.5 text-[12.5px] text-slate-800 font-semibold">
            <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>{c.location}</span>
          </div>
          <div className="text-[12px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">Animal Species:</span> {c.animal} ({c.condition})
          </div>
        </div>
      </div>

      {/* HORIZONTAL TIMELINE */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/40">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
          Trip Progression Timeline
        </span>

        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[620px] flex items-center justify-between relative px-2">
            {STEPS.map((step, idx) => {
              const ts = c[step.key];
              const isDone = idx <= currentStepIdx && ts;
              const isCurrent = idx === currentStepIdx && !isCompleted;
              const Icon = step.icon;

              const isLast = idx === STEPS.length - 1;

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative group">
                  
                  {/* Connecting Line behind dots */}
                  {!isLast && (
                    <div 
                      className={`absolute top-4 left-[50%] w-full h-[2.5px] -z-0 transition-colors ${
                        idx < currentStepIdx ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}

                  {/* Step Dot Icon */}
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                      isDone
                        ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-100"
                        : isCurrent
                        ? "bg-orange-500 text-white shadow-md ring-4 ring-orange-100 animate-pulse"
                        : "bg-white border-2 border-slate-200 text-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Title */}
                  <span className={`text-[11px] font-bold mt-2 text-center leading-tight max-w-[90px] ${
                    isCurrent ? "text-orange-600 font-black" : isDone ? "text-slate-800" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>

                  {/* Timestamp Badge */}
                  <span className="text-[9.5px] font-semibold text-slate-500 mt-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-3xs whitespace-nowrap">
                    {ts ? fmtTime(ts) : "--:--"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 15-min Unload Countdown (Hospital Reached) */}
      {isHospitalReached && (
        <div className="p-5 border-b border-slate-100">
          <div className={`rounded-2xl p-4 flex flex-col gap-3 ${countdown.expired ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            <div className="flex items-center gap-2">
              <Timer className={`w-4.5 h-4.5 ${countdown.expired ? "text-emerald-600" : "text-amber-600"}`} />
              <span className={`text-[11.5px] font-black uppercase tracking-wide ${countdown.expired ? "text-emerald-700" : "text-amber-700"}`}>
                Animal Unloading Countdown
              </span>
            </div>

            {!countdown.expired ? (
              <div className="flex items-center gap-4">
                <div className="flex items-end gap-1.5">
                  <span className="text-[36px] font-black text-amber-700 leading-none tabular-nums">
                    {String(countdown.mm).padStart(2, "0")}
                  </span>
                  <span className="text-[20px] font-black text-amber-400 mb-0.5">:</span>
                  <span className="text-[36px] font-black text-amber-700 leading-none tabular-nums">
                    {String(countdown.ss).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11.5px] font-bold text-amber-700">Time Remaining</span>
                  <span className="text-[10.5px] text-amber-600 font-medium mt-0.5">Safely unload the animal and confirm completion below.</span>
                </div>
              </div>
            ) : (
              <div className="text-[12px] font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> 15 minutes window completed. Please confirm unloading.
              </div>
            )}

            <button
              onClick={() => {
                setConfirmModal({
                  open: true,
                  title: "Complete Rescue Case?",
                  description: "Are you sure animal unloading is finished and you want to close this case?",
                  newStatus: "Completed",
                  photoUrl: null,
                });
              }}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-[13px] rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer mt-1"
            >
              <CheckCircle2 className="w-4.5 h-4.5" />
              Complete Unloading & Close Case
            </button>
          </div>
        </div>
      )}

      {/* Photo Upload Section (At Reached Location step) */}
      {c.status === "Reached Location" && (
        <div className="p-5 border-b border-slate-100">
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-black text-orange-800 uppercase tracking-wide flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-orange-600" /> Mandatory Animal Photo Upload
              </span>
              {photoFiles[c.id] && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
                </span>
              )}
            </div>

            <p className="text-[11.5px] text-orange-700 font-medium leading-relaxed">
              Uploading a clear photograph of the rescued animal is mandatory before confirming pickup.
            </p>

            <div className="flex items-center gap-3">
              <label className="h-10 px-4 bg-white border border-orange-200 hover:bg-orange-100/50 text-orange-800 rounded-xl text-[12px] font-bold flex items-center gap-2 cursor-pointer transition shadow-3xs">
                <Upload className="w-4 h-4 text-orange-600" />
                Select Photo File
                <input
                  type="file" accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPhotoFiles(prev => ({ ...prev, [c.id]: reader.result }));
                      setUploadError(prev => ({ ...prev, [c.id]: null }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {uploadError[c.id] && (
              <span className="text-[11px] text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {uploadError[c.id]}
              </span>
            )}

            {photoFiles[c.id] && (
              <img src={photoFiles[c.id]} alt="Rescued animal preview" className="w-full max-h-40 object-cover rounded-xl border border-orange-200" />
            )}
          </div>
        </div>
      )}

      {/* Uploaded Animal Photo Preview */}
      {c.photo && c.status !== "Reached Location" && (
        <div className="px-5 pt-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rescued Animal Photo</span>
            <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-3xs">
              <img src={c.photo} alt="Rescued animal" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      {actionConfig && !isHospitalReached && (
        <div className="p-5 pt-3">
          <button
            onClick={actionConfig.onClick}
            className={`w-full h-11 text-white font-black text-[13px] rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm cursor-pointer ${actionConfig.colorClass}`}
          >
            <actionConfig.icon className="w-4.5 h-4.5" />
            {actionConfig.label}
          </button>
        </div>
      )}

      {/* Completed State Badge */}
      {isCompleted && (
        <div className="p-5 pt-3">
          <div className="w-full h-11 bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[13px] rounded-xl flex items-center justify-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600" /> Rescue Operation Completed
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="text-[15px] font-black text-slate-800">{confirmModal.title}</h4>
              </div>
              <button 
                onClick={() => setConfirmModal({ open: false, title: "", description: "", newStatus: "", photoUrl: null })}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, title: "", description: "", newStatus: "", photoUrl: null })}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[12.5px] font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteStatusUpdate}
                className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[12.5px] font-black transition cursor-pointer shadow-sm"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ------------------------------------------------------------------
// Main Driver Dashboard
// ------------------------------------------------------------------
export default function DriverDashboard() {
  const [myCases, setMyCases]       = useState([]);
  const [gpsData, setGpsData]       = useState(null);
  const [activeTab, setActiveTab]   = useState("PENDING");
  const [driverName, setDriverName] = useState("Raj Kumar");
  const [driverInfo, setDriverInfo] = useState(null);
  const [isOnDuty, setIsOnDuty]     = useState(true);
  const [togglingDuty, setTogglingDuty] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(json => {
        if (json.user?.name) setDriverName(json.user.name);
        else {
          const saved = localStorage.getItem("currentDriverName");
          if (saved) setDriverName(saved);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("currentDriverName");
        if (saved) setDriverName(saved);
      });
  }, []);

  const fetchDriverDutyStatus = async () => {
    try {
      const res = await fetch("/api/drivers");
      const json = await res.json();
      if (json.success && json.data) {
        const me = json.data.find(d => d.name === driverName);
        if (me) {
          setDriverInfo(me);
          setIsOnDuty(me.availability !== "Off Duty" && me.availability !== "On Leave");
        }
      }
    } catch (e) {
      console.error("Failed to fetch driver duty status:", e);
    }
  };

  useEffect(() => {
    if (driverName) fetchDriverDutyStatus();
  }, [driverName]);

  const handleToggleDuty = async () => {
    setTogglingDuty(true);
    const newStatus = isOnDuty ? "Off Duty" : "On Duty";
    try {
      const res = await fetch("/api/drivers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driverName, availability: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        setIsOnDuty(!isOnDuty);
        if (driverInfo) setDriverInfo({ ...driverInfo, availability: newStatus });
      }
    } catch (err) {
      console.error("Failed to toggle duty status:", err);
    } finally {
      setTogglingDuty(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gpsRes, casesRes] = await Promise.all([
          fetch("/api/gps?t=" + Date.now()),
          fetch("/api/cases?t=" + Date.now()),
        ]);
        const gpsJson   = await gpsRes.json();
        const casesJson = await casesRes.json();

        if (gpsJson.success && gpsJson.data?.object) {
          const all = gpsJson.data.object.map(o => enrichGpsVehicle(o)).filter(Boolean);
          const mine = all.find(v => v.driverName === driverName);
          if (mine) setGpsData(mine);
        }

        if (casesJson.success && casesJson.data) {
          setMyCases(casesJson.data.filter(c => c.driver === driverName));
        }
      } catch (err) {
        console.error("Driver Dashboard fetch error:", err);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [driverName]);

  const updateCaseStatus = async (caseId, newStatus, photoUrl = null) => {
    const nowIso = new Date().toISOString();

    // Instant Optimistic State Update for zero delay in UI & countdown timer
    setMyCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updated = { ...c, status: newStatus };
      if (photoUrl) updated.photo = photoUrl;
      if (newStatus === "En Route")          updated.tripStartedAt = c.tripStartedAt || nowIso;
      if (newStatus === "Reached Location")  updated.reachedAt = c.reachedAt || nowIso;
      if (newStatus === "Animal Picked")     updated.pickupConfirmedAt = c.pickupConfirmedAt || nowIso;
      if (newStatus === "Hospital Reached") {
        updated.hospitalReachedAt = c.hospitalReachedAt || nowIso;
        updated.unloadStartedAt   = c.unloadStartedAt || nowIso;
      }
      if (newStatus === "Completed") {
        updated.unloadCompletedAt = c.unloadCompletedAt || nowIso;
        updated.completedAt = new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
      }
      return updated;
    }));

    try {
      const body = { id: caseId, status: newStatus };
      if (photoUrl) body.photo = photoUrl;
      const res  = await fetch("/api/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMyCases(prev => prev.map(c => c.id === caseId ? json.data : c));
      }
    } catch (err) {
      console.error("Failed to update case:", err);
    }
  };

  const pendingCases   = myCases.filter(c => c.status !== "Completed");
  const completedCases = myCases.filter(c => c.status === "Completed");

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800">
      <PwaInstallPrompt />

      {/* Duty Status Switch Card */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        isOnDuty
          ? "bg-emerald-50/80 border-emerald-200"
          : "bg-rose-50/80 border-rose-200"
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0 ${
            isOnDuty ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}>
            {isOnDuty ? <CheckCircle2 className="w-6 h-6 text-white" /> : <AlertCircle className="w-6 h-6 text-white" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-black text-slate-900">
                Duty Shift Status: <span className={isOnDuty ? "text-emerald-700" : "text-rose-700"}>{isOnDuty ? "ON DUTY" : "OFF DUTY / ON LEAVE"}</span>
              </span>
            </div>
            <p className="text-[11.5px] text-slate-600 font-medium mt-0.5">
              {isOnDuty
                ? "You are active and ready to receive dispatch calls from telecallers."
                : "Off Duty mode enabled. Telecallers are notified that you are unavailable."}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleDuty}
          disabled={togglingDuty}
          className={`h-11 px-5 rounded-xl font-black text-[12.5px] transition active:scale-[0.98] shadow-3xs cursor-pointer flex items-center justify-center gap-2 flex-shrink-0 ${
            isOnDuty
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          <span>{togglingDuty ? "Updating..." : (isOnDuty ? "Go Off Duty" : "Go On Duty")}</span>
        </button>
      </div>

      {/* GPS Telemetry Bar */}
      {gpsData && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-orange-200 font-black uppercase tracking-widest">My Ambulance — Live Telemetry</span>
            <span className="text-[16px] font-black mt-0.5">{gpsData.plate} {gpsData.alias}</span>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { label: "Ignition", value: gpsData.isIgnitionOn ? "ON (Running)" : "OFF (Stopped)" },
              { label: "Today Distance", value: gpsData.todayDistDisplay },
              { label: "Battery", value: gpsData.batteryDisplay },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[9px] text-orange-200 font-black uppercase tracking-wider">{label}</span>
                <span className="text-[12.5px] font-black mt-0.5">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-100 gap-6">
        {[
          { key: "PENDING",   label: `Active Cases (${pendingCases.length})` },
          { key: "COMPLETED", label: `Completed (${completedCases.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-[12.5px] font-black uppercase tracking-wide border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Case Cards List */}
      <div className="flex flex-col gap-5">
        {(activeTab === "PENDING" ? pendingCases : completedCases).map(c => (
          <CaseCard key={c.id} c={c} onUpdate={updateCaseStatus} />
        ))}
        {(activeTab === "PENDING" ? pendingCases : completedCases).length === 0 && (
          <div className="text-center py-14 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[13px]">
            {activeTab === "PENDING" ? "No active rescue cases assigned." : "No completed cases found."}
          </div>
        )}
      </div>
    </div>
  );
}

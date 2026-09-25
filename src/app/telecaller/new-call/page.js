"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, AlertCircle, CheckCircle2, Navigation, Send } from "lucide-react";

export default function NewCallPage() {
  const router = useRouter();
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [animalType, setAnimalType] = useState("Cow");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [drivers, setDrivers] = useState([]);
  const [assignedDriver, setAssignedDriver] = useState("");
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [cases, setCases] = useState([]);
  const [showOffDutyConfirm, setShowOffDutyConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/drivers").then(res => res.json()),
      fetch("/api/cases?t=" + Date.now()).then(res => res.json())
    ])
      .then(([driversJson, casesJson]) => {
        if (driversJson.success && driversJson.data) {
          const fetchedDrivers = driversJson.data;
          setDrivers(fetchedDrivers);

          // Smart Auto-Select: Pick first ON-DUTY available driver
          const firstOnDuty = fetchedDrivers.find(
            d => d.availability !== "Off Duty" && d.availability !== "On Leave"
          );
          if (firstOnDuty) {
            setAssignedDriver(firstOnDuty.name);
          } else if (fetchedDrivers.length > 0) {
            setAssignedDriver(fetchedDrivers[0].name);
          }
        }
        if (casesJson.success && casesJson.data) {
          setCases(casesJson.data);
        }
      })
      .catch(err => console.error("Failed to load dispatch data:", err));
  }, []);

  const executeCaseDispatch = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller: callerName,
          phone: callerPhone,
          animal: animalType,
          condition: condition,
          location: location,
          priority: priority,
          driver: assignedDriver
        })
      });
      const json = await response.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          router.push("/telecaller");
        }, 1500);
      } else {
        setErrorMsg(json.error || "Failed to log case.");
      }
    } catch (err) {
      console.error("Failed to submit new case:", err);
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!callerName || !location || !condition) return;

    // Check if selected driver is Off Duty
    const selectedDrvObj = drivers.find(d => d.name === assignedDriver);
    if (selectedDrvObj && (selectedDrvObj.availability === "Off Duty" || selectedDrvObj.availability === "On Leave")) {
      setShowOffDutyConfirm(true);
      return;
    }

    await executeCaseDispatch();
  };

  return (
    <div className="w-full bg-white border border-gray-200/60 p-8 rounded-3xl shadow-3xs flex flex-col gap-6 mt-2">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
          <PhoneCall className="w-5.5 h-5.5" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[17px] font-black text-gray-800 leading-tight">Log Rescue Case</h2>
          <p className="text-[12px] text-gray-400 mt-1 font-medium">Record incident details and dispatch nearby ambulance.</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[12.5px] font-bold">Case Logged Successfully!</span>
            <span className="text-[11px] text-emerald-600 mt-0.5">Ambulance dispatched. Redirecting back to dashboard...</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[12.5px] font-bold">Failed to Log Case</span>
            <span className="text-[11px] text-rose-600 mt-0.5">{errorMsg}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Caller Full Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Ramesh Kumar" 
              value={callerName} 
              onChange={(e) => setCallerName(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Contact Number</label>
            <input 
              type="text" 
              placeholder="e.g. 9876543210" 
              value={callerPhone} 
              onChange={(e) => setCallerPhone(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Animal Species</label>
            <select 
              value={animalType} 
              onChange={(e) => setAnimalType(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] font-bold text-slate-700"
            >
              <option value="Cow">Cow</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Buffalo">Buffalo</option>
              <option value="Bird">Bird</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Severity Level / Priority</label>
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] font-bold text-slate-700"
            >
              <option value="LOW">Low Priority (Minor issue)</option>
              <option value="MEDIUM">Medium Priority (Stable wound)</option>
              <option value="HIGH">High Priority (Severe bleeding / fracture)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Incident Location Spot</label>
          <div className="relative flex items-center">
            <Navigation className="w-4 h-4 text-gray-400 absolute left-4" />
            <input 
              type="text" 
              required 
              placeholder="e.g. Near Sector 15 Metro Station, Noida" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Injury / Emergency Description</label>
          <textarea 
            required 
            placeholder="e.g. Stray dog hit by a bike, unable to walk, deep cut on right leg." 
            value={condition} 
            onChange={(e) => setCondition(e.target.value)}
            className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] transition-all resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Dispatch Ambulance / Driver</label>
          <select 
            value={assignedDriver} 
            onChange={(e) => setAssignedDriver(e.target.value)}
            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] font-bold text-slate-700"
          >
            {(() => {
              const sortedDrivers = [...drivers].sort((a, b) => {
                const aOff = a.availability === "Off Duty" || a.availability === "On Leave";
                const bOff = b.availability === "Off Duty" || b.availability === "On Leave";
                if (aOff && !bOff) return 1;
                if (!aOff && bOff) return -1;
                return 0;
              });

              return sortedDrivers.map(d => {
                const activeCount = cases.filter(c => c.driver === d.name && c.status !== "Completed").length;
                const isOffDuty = d.availability === "Off Duty" || d.availability === "On Leave";
                
                let statusTag = "";
                if (isOffDuty) {
                  statusTag = "[Off Duty]";
                } else if (activeCount === 0) {
                  statusTag = "[On Duty & Available]";
                } else {
                  statusTag = `[On Duty & Busy - ${activeCount} Active Case${activeCount > 1 ? "s" : ""}]`;
                }

                return (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.vehicle_name || d.ambulance || "Driver"}) — {statusTag}
                  </option>
                );
              });
            })()}
          </select>

          {(() => {
            const selectedDrvObj = drivers.find(d => d.name === assignedDriver);
            if (selectedDrvObj && (selectedDrvObj.availability === "Off Duty" || selectedDrvObj.availability === "On Leave")) {
              return (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11.5px] font-bold text-amber-800 flex items-center gap-2 mt-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Warning: {assignedDriver} is currently <strong>Off Duty</strong>. Proceeding will trigger an emergency call-in confirmation.</span>
                </div>
              );
            }
            return null;
          })()}
        </div>

        <button 
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer mt-3 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Dispatching..." : "Log Incident & Dispatch Fleet"}
        </button>
      </form>

      {/* Force Dispatch Confirmation Modal for Off-Duty Drivers */}
      {showOffDutyConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[460px] p-6 shadow-xl flex flex-col gap-4 border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-700 border-b border-amber-100 pb-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <h4 className="text-[15px] font-black">Driver Off Duty Warning</h4>
            </div>

            <p className="text-[12.5px] text-slate-700 leading-relaxed font-medium">
              <strong className="text-slate-900">{assignedDriver}</strong> is currently marked <strong className="text-rose-600">OFF DUTY / ON LEAVE</strong>.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11.5px] text-amber-900 font-semibold">
              Tip: An <strong>ON DUTY</strong> driver is recommended for faster incident response time.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOffDutyConfirm(false);
                  const firstAvailable = drivers.find(d => d.availability !== "Off Duty" && d.availability !== "On Leave");
                  if (firstAvailable) setAssignedDriver(firstAvailable.name);
                }}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[12px] font-bold transition cursor-pointer"
              >
                Change to On-Duty Driver
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowOffDutyConfirm(false);
                  await executeCaseDispatch();
                }}
                className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[12px] font-black transition cursor-pointer shadow-sm"
              >
                Force Emergency Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

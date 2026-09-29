"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, MapPin, Phone, MessageSquare, AlertTriangle, 
  CheckCircle2, AlertOctagon, Heart, Users, Clock, Edit, Trash2, X, RefreshCw, UserCheck
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function ActiveCasesPage() {
  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gpsData, setGpsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notes Modal state
  const [selectedCaseIdForNotes, setSelectedCaseIdForNotes] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [caseNotes, setCaseNotes] = useState({}); // caseId -> array of notes
  const [showNotesSuccess, setShowNotesSuccess] = useState(false);

  // Driver Reassignment Modal state
  const [drivers, setDrivers] = useState([]);
  const [reassignModal, setReassignModal] = useState({
    open: false,
    caseId: null,
    currentDriver: "",
    newDriver: "",
    reason: "Re-allocation",
  });
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState("");

  const fetchData = async () => {
    try {
      const [gpsRes, casesRes, driversRes] = await Promise.all([
        fetch("/api/gps?t=" + Date.now()),
        fetch("/api/cases?t=" + Date.now()),
        fetch("/api/drivers"),
      ]);
      const gpsJson   = await gpsRes.json();
      const casesJson = await casesRes.json();
      const driversJson = await driversRes.json();

      if (gpsJson.success && gpsJson.data?.object) {
        setGpsData(gpsJson.data.object);
      }
      if (casesJson.success && casesJson.data) {
        setCases(casesJson.data);
      }
      if (driversJson.success && driversJson.data) {
        setDrivers(driversJson.data);
      }
    } catch (err) {
      console.error("Data Fetch Error on Telecaller Active Cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteReassign = async (e) => {
    e.preventDefault();
    if (!reassignModal.newDriver || reassignModal.newDriver === reassignModal.currentDriver) return;

    setReassignLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reassignModal.caseId,
          driver: reassignModal.newDriver,
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCases(prev => prev.map(c => c.id === reassignModal.caseId ? json.data : c));
        setReassignSuccess(`Case successfully reassigned to ${reassignModal.newDriver}!`);
        setTimeout(() => {
          setReassignSuccess("");
          setReassignModal({ open: false, caseId: null, currentDriver: "", newDriver: "", reason: "Re-allocation" });
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to reassign case:", err);
    } finally {
      setReassignLoading(false);
    }
  };

  const driverLiveMap = {};
  gpsData.forEach((v) => {
    const enriched = enrichGpsVehicle(v);
    if (enriched) {
      driverLiveMap[enriched.driverName] = enriched;
    }
  });

  const getPriorityStyle = (prio) => {
    switch (prio) {
      case "HIGH": return "bg-rose-50 text-rose-600 border border-rose-100";
      case "MEDIUM": return "bg-amber-50 text-amber-600 border border-amber-100";
      case "LOW": return "bg-slate-50 text-slate-500 border border-slate-150";
      default: return "bg-slate-50 text-slate-500";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Assigned": return "text-blue-600 bg-blue-50 border border-blue-100";
      case "En Route": return "text-orange-600 bg-orange-50 border border-orange-100";
      case "Reached Location": return "text-teal-600 bg-teal-50 border border-teal-100";
      case "Animal Picked": return "text-violet-600 bg-violet-50 border border-violet-100";
      case "Hospital Reached": return "text-emerald-600 bg-emerald-50 border border-emerald-100";
      default: return "text-slate-600 bg-slate-50 border border-slate-150";
    }
  };

 

  const handleDeleteCase = async (id) => {
    if (!window.confirm("Are you sure you want to cancel/delete this rescue case?")) return;
    try {
      const res = await fetch(`/api/cases?id=${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        setCases(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete case:", err);
    }
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const timeString = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const newNote = {
      text: noteText,
      time: timeString
    };

    setCaseNotes(prev => ({
      ...prev,
      [selectedCaseIdForNotes]: [newNote, ...(prev[selectedCaseIdForNotes] || [])]
    }));

    setNoteText("");
    setShowNotesSuccess(true);
    setTimeout(() => setShowNotesSuccess(false), 2000);
  };

  const filteredCases = cases.filter(c => 
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.caller.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.animal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.driver.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex flex-col">
          <h3 className="text-[15.5px] font-black text-gray-800 leading-tight">All Active Rescue Cases</h3>
          <p className="text-[11.5px] text-gray-400 mt-1">Real-time status coordination, driver tracking, and live status adjustments.</p>
        </div>
        <div className="relative w-full sm:w-[280px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Search Caller, Driver, Spot, ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9.5 pl-9.5 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-[12px] font-bold text-gray-400">Loading active cases registry...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto min-h-[480px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Case ID / Time</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reporter Contact</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Animal Species & Condition</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rescue Spot / Location</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Driver & Telemetry</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rescue Stage / Status</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-20 text-[12.5px] font-bold text-slate-400">
                    No active rescue cases found.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const liveDriver = driverLiveMap[c.driver];
                  const notesCount = (caseNotes[c.id] || []).length;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      {/* Case ID */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-black text-slate-800 leading-tight">{c.id}</span>
                          <span className="text-[10px] text-gray-400 mt-1 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-300" /> {c.time}
                          </span>
                        </div>
                      </td>

                      {/* Caller Info */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-bold text-slate-700 leading-tight">{c.caller}</span>
                          <a 
                            href={`tel:${c.phone}`} 
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 mt-1 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-350" /> +91 {c.phone}
                          </a>
                        </div>
                      </td>

                      {/* Animal Species & Incident details */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-medium text-slate-700">{c.animal}</span>
                          <span className={`px-2 py-0.5 text-[9.5px] font-bold rounded-full ${getPriorityStyle(c.priority)}`}>
                            {c.priority}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-1.5 leading-snug font-medium max-w-[200px]" title={c.condition}>
                          {c.condition}
                        </p>
                      </td>

                      {/* Location Spot */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-1 text-[11.5px] text-slate-650 font-bold max-w-[180px]">
                          <span className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug" title={c.location}>{c.location}</span>
                          </span>
                        </div>
                      </td>

                      {/* Assigned Driver & Telemetry */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {c.driver.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-black text-slate-800 leading-tight truncate">{c.driver}</span>
                            {liveDriver ? (
                              <span className="text-[9px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${liveDriver.status !== "STOPPED" ? "animate-pulse" : ""}`} />
                                A{String(liveDriver.num).padStart(2, '0')} • {liveDriver.speedDisplay}
                              </span>
                            ) : (
                              <span className="text-[9.5px] text-slate-400 mt-1">Telemetry Offline</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Live Dropdown stage adjustment */}
                     {/* Live Rescue Stage / Status - Read Only */}
<td className="py-4 px-3">
  <div className="flex flex-col gap-1.5">
    <span
      className={`h-8 px-2.5 rounded-lg text-[10.5px] font-black uppercase inline-flex items-center justify-center ${getStatusColor(c.status)}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {c.status || "Unknown"}
    </span>

    <span className="text-[9px] text-slate-400 font-semibold">
      Live driver status
    </span>
  </div>
</td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setReassignModal({
                              open: true,
                              caseId: c.id,
                              currentDriver: c.driver,
                              newDriver: drivers.find(d => d.name !== c.driver)?.name || "",
                              reason: "Re-allocation",
                            })}
                            className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10.5px] font-black flex items-center gap-1 transition active:scale-[0.97] cursor-pointer"
                            title="Reassign Driver / Substitute Ambulance"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Reassign</span>
                          </button>
                          <button
                            onClick={() => setSelectedCaseIdForNotes(c.id)}
                            className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 text-[10.5px] font-bold flex items-center gap-1 transition active:scale-[0.97] cursor-pointer relative"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span>Notes</span>
                            {notesCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8.5px] font-bold">
                                {notesCount}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteCase(c.id)}
                            className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 flex items-center justify-center transition active:scale-[0.97] cursor-pointer"
                            title="Cancel / Delete Case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes / Coordination Logging Modal */}
      {selectedCaseIdForNotes && (
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[500px] p-6 shadow-xl flex flex-col gap-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-emerald-600" />
                <h4 className="text-[14.5px] font-black text-slate-800">Coordination Notes: {selectedCaseIdForNotes}</h4>
              </div>
              <button 
                onClick={() => setSelectedCaseIdForNotes(null)}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showNotesSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-xl text-[11.5px] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Note logged successfully!
              </div>
            )}

            {/* Note form */}
            <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
              <input 
                type="text"
                required
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type important update (e.g., driver reached hospital)..."
                className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[12.5px] transition-all"
              />
              <button 
                type="submit"
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12.5px] font-bold transition active:scale-[0.97]"
              >
                Add
              </button>
            </form>

            {/* Existing notes list */}
            <div className="flex flex-col gap-2 mt-2 max-h-[220px] overflow-y-auto pr-1">
              <h5 className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">Update Logs</h5>
              {(caseNotes[selectedCaseIdForNotes] || []).length === 0 ? (
                <span className="text-[11.5px] text-slate-400 italic py-4 text-center">No notes logged yet. Add one above.</span>
              ) : (
                (caseNotes[selectedCaseIdForNotes] || []).map((n, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col gap-1">
                    <p className="text-[12px] font-medium text-slate-700 leading-snug">{n.text}</p>
                    <span className="text-[9px] text-gray-400 font-bold self-end">{n.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Driver Reassignment Modal */}
      {reassignModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[480px] p-6 shadow-xl flex flex-col gap-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <h4 className="text-[15px] font-black text-slate-800">Reassign Rescue Case</h4>
              </div>
              <button 
                onClick={() => setReassignModal({ open: false, caseId: null, currentDriver: "", newDriver: "", reason: "Re-allocation" })}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reassignSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-[12px] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{reassignSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteReassign} className="flex flex-col gap-4 text-[12.5px]">
              <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Case</span>
                <span className="text-[14px] font-black text-slate-800">{reassignModal.caseId}</span>
                <span className="text-[11.5px] text-slate-600 font-semibold mt-0.5">Currently assigned to: <strong className="text-rose-600">{reassignModal.currentDriver}</strong></span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Select Replacement Driver</label>
                <select
                  value={reassignModal.newDriver}
                  onChange={(e) => setReassignModal(prev => ({ ...prev, newDriver: e.target.value }))}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[13px] font-bold text-slate-700 cursor-pointer"
                >
                  {drivers.map(d => {
                    const activeCount = cases.filter(c => c.driver === d.name && c.status !== "Completed").length;
                    const isOffDuty = d.availability === "Off Duty" || d.availability === "On Leave";
                    let tag = isOffDuty ? "[Off Duty]" : (activeCount === 0 ? "[Available]" : `[Busy - ${activeCount} Active Case]`);
                    return (
                      <option key={d.id} value={d.name} disabled={d.name === reassignModal.currentDriver}>
                        {d.name} ({d.vehicle_name || d.ambulance || "Ambulance"}) — {tag} {d.name === reassignModal.currentDriver ? "(Current)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Reason for Reassignment</label>
                <select
                  value={reassignModal.reason}
                  onChange={(e) => setReassignModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-none rounded-xl text-[12.5px] font-bold text-slate-700 cursor-pointer"
                >
                  <option value="Re-allocation">Optimal Location Re-allocation</option>
                  <option value="Driver Emergency">Driver Emergency / Unavailable</option>
                  <option value="Vehicle Breakdown">Vehicle Maintenance / Breakdown</option>
                  <option value="Shift End">Driver Shift End</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModal({ open: false, caseId: null, currentDriver: "", newDriver: "", reason: "Re-allocation" })}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[12.5px] font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignLoading || !reassignModal.newDriver || reassignModal.newDriver === reassignModal.currentDriver}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12.5px] font-black transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {reassignLoading ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

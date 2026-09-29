"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Plus, MapPin, Truck, AlertOctagon, HelpCircle, X, CheckSquare, 
  Clock, Phone, Trash2, Calendar, Eye, RefreshCw, Sliders, ChevronLeft, ChevronRight
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
 const [isModalOpen, setIsModalOpen] = useState(false);

// View Case Details
const [selectedCase, setSelectedCase] = useState(null);
const [isViewModalOpen, setIsViewModalOpen] = useState(false);

const [gpsData, setGpsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form states
  const [newCaller, setNewCaller] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAnimal, setNewAnimal] = useState("Cow");
  const [newCondition, setNewCondition] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [drivers, setDrivers] = useState([]);
  const [newDriver, setNewDriver] = useState("");

  const fetchData = async () => {
    try {
      const [gpsRes, casesRes, driversRes] = await Promise.all([
        fetch("/api/gps?t=" + Date.now()),
        fetch("/api/cases?t=" + Date.now()),
        fetch("/api/drivers"),
      ]);
      const gpsJson     = await gpsRes.json();
      const casesJson   = await casesRes.json();
      const driversJson = await driversRes.json();

      if (gpsJson.success && gpsJson.data?.object) {
        setGpsData(gpsJson.data.object);
      }
      if (casesJson.success && casesJson.data) {
        setCases(casesJson.data);
      }
      if (driversJson.success && driversJson.data) {
        const fetchedDrivers = driversJson.data;
        setDrivers(fetchedDrivers);

        // Smart auto-select first On-Duty driver
        const firstOnDuty = fetchedDrivers.find(d => d.availability !== "Off Duty" && d.availability !== "On Leave");
        if (firstOnDuty) {
          setNewDriver(prev => prev || firstOnDuty.name);
        } else if (fetchedDrivers.length > 0) {
          setNewDriver(prev => prev || fetchedDrivers[0].name);
        }
      }
    } catch (err) {
      console.error("Data Fetch Error on Admin Cases Page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const driverLiveMap = {};
  gpsData.forEach((v) => {
    const enriched = enrichGpsVehicle(v);
    if (enriched) {
      driverLiveMap[enriched.driverName] = enriched;
    }
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "HIGH": return "bg-rose-50 text-rose-600 border border-rose-100";
      case "MEDIUM": return "bg-amber-50 text-amber-600 border border-amber-100";
      case "LOW": return "bg-slate-50 text-slate-500 border border-slate-150";
      default: return "bg-slate-50 text-slate-500";
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Assigned": return "bg-blue-50 text-blue-600 border border-blue-100";
      case "En Route": return "bg-orange-50 text-orange-600 border border-orange-100";
      case "Reached Location": return "bg-teal-50 text-teal-600 border border-teal-100";
      case "Animal Picked": return "bg-violet-50 text-violet-600 border border-violet-100";
      case "Hospital Reached": return "bg-emerald-50 text-emerald-600 border border-emerald-100";
case "Completed": return "bg-teal-50 text-teal-600 border border-teal-100";
default: return "bg-slate-50 text-slate-500";
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller: newCaller,
          phone: newPhone || "N/A",
          animal: newAnimal,
          condition: newCondition,
          location: newLocation,
          priority: newPriority,
          driver: newDriver
        })
      });
      const json = await response.json();
      if (json.success && json.data) {
        setCases(prev => [json.data, ...prev]);
        setIsModalOpen(false);
        setNewCaller("");
        setNewPhone("");
        setNewCondition("");
        setNewLocation("");
      }
    } catch (err) {
      console.error("Failed to create case:", err);
    }
  };

  const handleViewCase = (caseItem) => {
  setSelectedCase(caseItem);
  setIsViewModalOpen(true);
};

  const handleDeleteCase = async (id) => {
    if (!window.confirm("Are you sure you want to delete this case permanently?")) return;
    try {
      const res = await fetch(`/api/cases?id=${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        setCases(prev => prev.filter(c => c.id !== id));
        setSelectedCaseIds(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      console.error("Failed to delete case:", err);
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the ${selectedCaseIds.length} selected cases?`)) return;
    try {
      for (const id of selectedCaseIds) {
        await fetch(`/api/cases?id=${id}`, { method: "DELETE" });
      }
      setCases(prev => prev.filter(c => !selectedCaseIds.includes(c.id)));
      setSelectedCaseIds([]);
    } catch (err) {
      console.error("Failed batch delete cases:", err);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCurrentPage(1);
    setSelectedCaseIds([]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCaseIds(paginatedCases.map(c => c.id));
    } else {
      setSelectedCaseIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedCaseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getAnimalEmoji = (animal) => {
    return "";
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = String(c.id ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(c.caller ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(c.animal ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(c.location ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(c.driver ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination
  const totalItems = filteredCases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedCases = filteredCases.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800 relative">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-black text-slate-900 tracking-tight">Rescue Cases Registry</h1>
          <p className="text-[12px] text-gray-400 mt-1 font-bold">Comprehensive central registry to track, log, and coordinate animal rescue operations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4.5 py-2.5 rounded-xl text-[12px] font-black flex items-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Case</span>
        </button>
      </div>

      {/* 4 Premium Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">Active Cases</span>
            <span className="text-[26px] font-black text-slate-900 mt-1 leading-none">{cases.length}</span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">Critical Alerts</span>
            <span className="text-[26px] font-black text-rose-600 mt-1 leading-none">
              {cases.filter(c => c.priority === "HIGH").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
            <AlertOctagon className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">En Route</span>
            <span className="text-[26px] font-black text-orange-500 mt-1 leading-none">
              {cases.filter(c => c.status === "En Route").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
            <Clock className="w-5.5 h-5.5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">Hospital Reached</span>
            <span className="text-[26px] font-black text-emerald-600 mt-1 leading-none">
              {cases.filter(c => c.status === "Hospital Reached").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <CheckSquare className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Filter and Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, caller, animal, or driver..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-slate-300 transition-all w-full"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-black text-slate-650 cursor-pointer min-w-[130px] outline-none focus:border-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="En Route">En Route</option>
            <option value="Reached Location">Reached Spot</option>
            <option value="Animal Picked">Animal Picked</option>
            <option value="Hospital Reached">Hospital Reached</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-black text-slate-650 cursor-pointer min-w-[130px] outline-none focus:border-slate-300"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2">
          {selectedCaseIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="h-10 px-4 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-[12px] font-black transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedCaseIds.length})</span>
            </button>
          )}

          <button
            onClick={handleResetFilters}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-[12.5px] font-black text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-3xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* High-density, professional registry table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-3xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-slate-50/50">
                <th className="py-3.5 px-4 w-[40px]">
                  <input 
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={paginatedCases.length > 0 && paginatedCases.every(c => selectedCaseIds.includes(c.id))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Caller details</th>
                <th className="py-3.5 px-4">Animal info</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Accident Location</th>
                <th className="py-3.5 px-4">Assigned Unit</th>
                <th className="py-3.5 px-4">Milestone</th>
                <th className="py-3.5 px-4">Logged Time</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[12.5px] text-slate-700 font-medium">
              {loading && paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-[12px] font-bold text-gray-400">
                    Connecting to central registry data...
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-[12.5px] font-bold text-slate-400">
                    No rescue records found matching current query filters.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((item) => {
                  const liveInfo = driverLiveMap[item.driver];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox" 
                          checked={selectedCaseIds.includes(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Case ID */}
                      <td className="py-3 px-4 font-black text-slate-800 leading-tight">
                        {item.id}
                      </td>

                      {/* Caller */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-700 leading-tight">{item.caller}</span>
                          <span className="text-[9.5px] text-slate-400 mt-1 font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-300" /> {item.phone || "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Animal Species & condition */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-[14px] shadow-3xs">
                            {getAnimalEmoji(item.animal)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800 leading-none">{item.animal}</span>
                            <span className="text-[10px] text-slate-450 mt-1 font-bold truncate max-w-[140px]" title={item.condition}>
                              {item.condition}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Severity Priority */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getPriorityStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>

                      {/* Accident Location Spot */}
                      <td className="py-3 px-4 min-w-[180px] max-w-[220px]">
                        <div className="flex items-start gap-1.5 w-full min-w-0" title={item.location}>
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-extrabold text-slate-800 text-[12px] truncate block">{item.location}</span>
                            {liveInfo && (
                              <span className="text-[9.5px] text-slate-400 font-semibold truncate block mt-0.5" title={liveInfo.address}>
                                Live: {liveInfo.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Assigned Driver & vehicle plate */}
                      <td className="py-3 px-4 min-w-[160px]">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[9.5px] font-black flex-shrink-0 border border-slate-200">
                              {item.driver.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="font-extrabold text-slate-800 text-[12px] truncate">{item.driver}</span>
                          </div>
                          {liveInfo && (
                            <div className="mt-1 font-bold text-[9.5px] text-slate-500 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.25 rounded bg-slate-100 border border-slate-200/80 font-black text-slate-700 text-[9px] whitespace-nowrap">
                                A{String(liveInfo.num).padStart(2, '0')}
                              </span>
                              <span className="font-bold text-slate-600 truncate">{liveInfo.plate}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Milestone Status */}
                      <td className="py-3 px-4 min-w-[130px]">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase border leading-normal whitespace-nowrap ${getStatusStyle(item.status)}`}>
                            {item.status}
                          </span>
                          {liveInfo && (
                            <span className={`text-[9.5px] font-black flex items-center gap-1 whitespace-nowrap ${
                              liveInfo.status === "RUNNING" ? "text-emerald-600" : "text-amber-600"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                liveInfo.status === "RUNNING" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                              }`} />
                              {liveInfo.speedDisplay}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Logged Time */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-extrabold">
                        {item.time}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {liveInfo && (
  <a
    href={`/admin/live-tracking?selected=${encodeURIComponent(liveInfo.plate)}`}
    className="h-8 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-black rounded-lg transition active:scale-[0.97] flex items-center gap-1 shadow-3xs"
    title="Track ambulance live"
  >
    <Truck className="w-3 h-3" />
    <span>Track</span>
  </a>
)}

{/* View completed/full case details */}
<button
  onClick={() => handleViewCase(item)}
  className="h-8 w-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 flex items-center justify-center transition active:scale-[0.97] cursor-pointer"
  title="View case details"
>
  <Eye className="w-3.5 h-3.5" />
</button>

{/* Existing Delete */}
<button
  onClick={() => handleDeleteCase(item.id)}
  className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 flex items-center justify-center transition active:scale-[0.97] cursor-pointer"
  title="Delete case permanently"
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

        {/* Table Pagination Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-white">
          <span className="text-[11.5px] font-bold text-gray-400">
            Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="w-7.5 h-7.5 rounded-lg border border-slate-200 flex items-center justify-center text-gray-550 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7.5 h-7.5 rounded-lg text-[11.5px] font-extrabold transition cursor-pointer ${
                    currentPage === page
                      ? "bg-blue-600 text-white shadow-3xs"
                      : "border border-slate-200 text-gray-650 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="w-7.5 h-7.5 rounded-lg border border-slate-200 flex items-center justify-center text-gray-550 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Case Modal popup overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[14.5px] font-black text-slate-800">Create New Rescue Case</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="flex flex-col gap-4 text-[12.5px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Caller Full Name</label>
                  <input
                    type="text"
                    required
                    value={newCaller}
                    onChange={(e) => setNewCaller(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Animal Classification</label>
                  <select
                    value={newAnimal}
                    onChange={(e) => setNewAnimal(e.target.value)}
                    className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer font-bold text-slate-700"
                  >
                    <option value="Cow">Cow</option>
                    <option value="Buffalo">Buffalo</option>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Call Severity Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer font-bold text-slate-700"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Injury Details / Symptoms</label>
                <input
                  type="text"
                  required
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="e.g. Bleeding neck laceration, leg injury"
                  className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Accident Spot Location</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Knowledge Park Sector 12, Noida"
                  className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-500 uppercase text-[10px] tracking-wide">Ambulance Driver Allocation</label>
                <select
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                  className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer font-bold text-slate-700"
                >
                  {(() => {
                    const sorted = [...drivers].sort((a, b) => {
                      const aOff = a.availability === "Off Duty" || a.availability === "On Leave";
                      const bOff = b.availability === "Off Duty" || b.availability === "On Leave";
                      if (aOff && !bOff) return 1;
                      if (!aOff && bOff) return -1;
                      return 0;
                    });
                    return sorted.map(d => {
                      const activeCount = cases.filter(c => c.driver === d.name && c.status !== "Completed").length;
                      const isOffDuty = d.availability === "Off Duty" || d.availability === "On Leave";
                      let tag = isOffDuty ? "[Off Duty]" : (activeCount === 0 ? "[On Duty & Available]" : `[Busy - ${activeCount} Active Case]`);
                      return (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.vehicle_name || d.ambulance || "Ambulance"}) — {tag}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl mt-3 transition active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                <span>Dispatch Crew & Log Case</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Case Details Modal */}
{isViewModalOpen && selectedCase && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4">
    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-100 shadow-2xl flex flex-col">

      {/* Modal Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <h3 className="text-[14px] sm:text-[15px] font-black text-slate-800 truncate">
                Rescue Case Details
              </h3>

              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold mt-0.5">
                Case ID: {selectedCase.id}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setIsViewModalOpen(false);
            setSelectedCase(null);
          }}
          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer flex-shrink-0"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="overflow-y-auto p-4 sm:p-6 space-y-5">

        {/* Status Header */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-black">
                Final Rescue Status
              </p>

              <span
                className={`inline-block mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(selectedCase.status)}`}
              >
                {selectedCase.status || "Unknown"}
              </span>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-black">
                Priority
              </p>

              <span
                className={`inline-block mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getPriorityStyle(selectedCase.priority)}`}
              >
                {selectedCase.priority || "N/A"}
              </span>
            </div>

          </div>
        </div>

        {/* Basic Case Information */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-5 rounded-full bg-blue-500" />
            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
              Case Information
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Case ID
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1 break-all">
                {selectedCase.id || "N/A"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Caller
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.caller || "N/A"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Contact
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.phone || "N/A"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Animal
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.animal || "N/A"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Condition
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.condition || "N/A"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Assigned Driver
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.driver || "Unassigned"}
              </p>
            </div>

          </div>
        </div>

        {/* Location */}
        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-rose-500 border border-rose-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-rose-400 font-black">
                Rescue Location
              </p>

              <p className="text-[12px] sm:text-[13px] font-black text-slate-800 mt-1 break-words">
                {selectedCase.location || "Location not available"}
              </p>
            </div>
          </div>
        </div>

        {/* Rescue Workflow */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
              Rescue Workflow
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Current Mission Step
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.missionStep || "N/A"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Completed At
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.completedAt || selectedCase.completed_at || "Not completed"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Logged Time
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.time || "N/A"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] uppercase text-gray-400 font-black">
                Last Updated
              </p>
              <p className="text-[12px] font-black text-slate-800 mt-1">
                {selectedCase.updatedAt || selectedCase.updated_at || "N/A"}
              </p>
            </div>

          </div>
        </div>

        {/* Stage Timeline */}
        {selectedCase.stageTimes && typeof selectedCase.stageTimes === "object" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-violet-500" />
              <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
                Rescue Stage Timeline
              </h4>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              {Object.entries(selectedCase.stageTimes).map(([stage, timestamp]) => (
                <div
                  key={stage}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3"
                >
                  <span className="text-[10.5px] font-black text-slate-700 uppercase">
                    {stage.replace(/([A-Z])/g, " $1")}
                  </span>

                  <span className="text-[10px] font-bold text-gray-400">
                    {timestamp || "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {(selectedCase.caseDetails || selectedCase.stopReason) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-amber-500" />
              <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
                Additional Details
              </h4>
            </div>

            <div className="space-y-3">

              {selectedCase.caseDetails && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-[9px] uppercase text-gray-400 font-black mb-1">
                    Case Details
                  </p>
                  <p className="text-[11.5px] text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap break-words">
                    {selectedCase.caseDetails}
                  </p>
                </div>
              )}

              {selectedCase.stopReason && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-[9px] uppercase text-amber-500 font-black mb-1">
                    Stop / Delay Reason
                  </p>
                  <p className="text-[11.5px] text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap break-words">
                    {selectedCase.stopReason}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Proof Images */}
        {Array.isArray(selectedCase.caseImages) && selectedCase.caseImages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-blue-500" />
              <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
                Rescue Proof / Images
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {selectedCase.caseImages.map((image, index) => {
                const imageSrc =
                  typeof image === "string"
                    ? image
                    : image?.url || image?.src || image?.path || "";

                if (!imageSrc) return null;

                return (
                  <a
                    key={index}
                    href={imageSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-square"
                  >
                    <img
                      src={imageSrc}
                      alt={`Rescue proof ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Modal Footer */}
      <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
        <button
          onClick={() => {
            setIsViewModalOpen(false);
            setSelectedCase(null);
          }}
          className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black transition cursor-pointer"
        >
          Close
        </button>
      </div>

    </div>
  </div>
)}

    </div>
  );
}

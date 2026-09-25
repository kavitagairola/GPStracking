"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Truck, Battery, Radio, Zap, Clock, Key, RefreshCw, 
  Compass, AlertCircle, CheckCircle, Navigation, Plus, Sliders, 
  ChevronLeft, ChevronRight, Eye, Edit3, MoreVertical, X, Save
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

// Inline SVG representing a premium side-view profile of an ambulance van
const AmbulanceVanIcon = () => (
  <svg viewBox="0 0 64 36" className="w-12 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 10h40v20H4z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M44 14h11l3 5v11H44z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M4 20h51v2.5H4z" fill="#00875A" />
    <path d="M46 16h5.5v3H46z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M30 13h8v4.5h-8z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M20 8h4v2h-4z" fill="#ef4444" />
    <circle cx="14" cy="30" r="4.5" fill="#334155" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="14" cy="30" r="1.5" fill="#ffffff" />
    <circle cx="48" cy="30" r="4.5" fill="#334155" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="48" cy="30" r="1.5" fill="#ffffff" />
    <path d="M12 14v4M10 16h4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function AmbulancesPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpsData, setGpsData] = useState([]);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ambulance_number: "", registration: "", type_name: "Force Traveller", driver_name: "", driver_phone: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [driverFilter, setDriverFilter] = useState("All Drivers");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [lastUpdated, setLastUpdated] = useState("");

  // Fetch ambulances from DB
  const fetchAmbulances = async () => {
    try {
      const res = await fetch("/api/ambulances");
      const json = await res.json();
      if (json.success) {
        setAmbulances(json.data);
        setError(null);
      } else {
        setError("Failed to load ambulances.");
      }
    } catch {
      setError("Network error loading ambulances.");
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString("en-IN"));
    }
  };

  // Fetch live GPS for overlay
  const fetchGps = async () => {
    try {
      const res = await fetch("/api/gps?t=" + Date.now());
      const json = await res.json();
      if (json.success && json.data?.object) {
        setGpsData(json.data.object);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAmbulances();
    fetchGps();
    const interval = setInterval(fetchGps, 8000);
    return () => clearInterval(interval);
  }, []);

  // Merge DB ambulances with live GPS data
  const gpsVehicles = gpsData.map(v => enrichGpsVehicle(v)).filter(Boolean);
  const gpsMap = {};
  gpsVehicles.forEach(v => { if (v.num) gpsMap[v.num] = v; });

  const enrichedAmbulances = ambulances.map(amb => {
    const num = amb.ambulance_number;
    const gps = gpsMap[num];
    return {
      id: amb.id,
      vehicleName: amb.vehicle_name,
      registration: gps ? gps.plate : amb.registration,
      typeName: amb.type_name,
      typeDesc: amb.type_desc || "Rescue Van",
      driverName: amb.driver_name || "Not Assigned",
      driverPhone: amb.driver_phone || "—",
      status: gps ? (gps.status === "RUNNING" ? "Running" : gps.status === "IDLE" ? "Idle" : "Active") : amb.status,
      battery: gps ? (gps.batteryPct ?? 100) : 100,
      ignition: gps ? gps.isIgnitionOn : false,
      coordinates: gps && gps.latitude ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}` : "Calculating...",
      gpsImei: gps ? gps.deviceUniqueId : "",
      gpsPlate: gps ? gps.plate : amb.registration,
      speedDisplay: gps ? gps.speedDisplay : "0.0 km/h",
      address: gps ? gps.address : "",
    };
  });

  // Filter logic
  const filteredAmbulances = enrichedAmbulances.filter(a => {
    const matchesSearch = 
      a.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.typeName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === "All Status" ? true : a.status === statusFilter;
      
    const matchesType = 
      typeFilter === "All Types" ? true : a.typeDesc === typeFilter || a.typeName === typeFilter;
      
    const matchesDriver = 
      driverFilter === "All Drivers" ? true : a.driverName === driverFilter;
      
    return matchesSearch && matchesStatus && matchesType && matchesDriver;
  });

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Status");
    setTypeFilter("All Types");
    setDriverFilter("All Drivers");
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalItems = filteredAmbulances.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedAmbulances = filteredAmbulances.slice(startIndex, startIndex + itemsPerPage);

  // Add ambulance
  const handleAddAmbulance = async (e) => {
    e.preventDefault();
    setAddLoading(true); setAddError("");
    try {
      const res = await fetch("/api/ambulances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setAddForm({ ambulance_number: "", registration: "", type_name: "Force Traveller", driver_name: "", driver_phone: "" });
        fetchAmbulances();
      } else {
        setAddError(json.error || "Failed to add ambulance");
      }
    } catch { setAddError("Network error"); }
    finally { setAddLoading(false); }
  };

  // Stats calculation
  const totalCount = enrichedAmbulances.length;
  const activeCount = enrichedAmbulances.filter(a => a.status === "Active" || a.status === "Running" || a.status === "Idle").length;
  const maintenanceCount = enrichedAmbulances.filter(a => a.status === "Maintenance").length;
  const inactiveCount = enrichedAmbulances.filter(a => a.status === "Inactive").length;

  return (
    <div className="flex flex-col gap-6 w-full text-[#1e293b] relative">
      
      {/* Title & Breadcrumbs + Add Ambulance Button */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-black text-slate-900 tracking-tight">Ambulances</h1>
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mt-1">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-gray-600">Ambulances</span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#00875A] hover:bg-[#00704a] text-white px-4 py-2.5 rounded-lg text-[12px] font-extrabold flex items-center gap-2 shadow-2xs transition active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Ambulance</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Ambulances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center flex-shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Total Ambulances</span>
            <span className="text-[25px] font-black text-slate-900 mt-0.5 leading-tight">{totalCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">All Registered</span>
          </div>
        </div>

        {/* Active Ambulances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Active Ambulances</span>
            <span className="text-[25px] font-black text-blue-600 mt-0.5 leading-tight">{activeCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Currently in Service</span>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Under Maintenance</span>
            <span className="text-[25px] font-black text-amber-500 mt-0.5 leading-tight">{maintenanceCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Not Available</span>
          </div>
        </div>

        {/* Inactive Ambulances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Inactive Ambulances</span>
            <span className="text-[25px] font-black text-purple-500 mt-0.5 leading-tight">{inactiveCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Not in Use</span>
          </div>
        </div>
      </div>

      {/* Filter Options Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ambulance number or name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-10 pl-10 pr-4 bg-gray-50 border border-slate-200 rounded-xl text-[12px] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-300 transition-all w-full"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-col">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 bg-gray-50 border border-slate-200 rounded-xl text-[12px] font-bold text-gray-650 focus:outline-none focus:bg-white focus:border-gray-300 transition-all cursor-pointer min-w-[120px]"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Type Dropdown */}
          <div className="flex flex-col">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 bg-gray-50 border border-slate-200 rounded-xl text-[12px] font-bold text-gray-650 focus:outline-none focus:bg-white focus:border-gray-300 transition-all cursor-pointer min-w-[120px]"
            >
              <option value="All Types">All Types</option>
              <option value="Tata Winger">Tata Winger</option>
              <option value="Force Traveller">Force Traveller</option>
              <option value="Maruti Eeco">Maruti Eeco</option>
            </select>
          </div>

          {/* Driver Dropdown */}
          <div className="flex flex-col">
            <select
              value={driverFilter}
              onChange={(e) => { setDriverFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 bg-gray-50 border border-slate-200 rounded-xl text-[12px] font-bold text-gray-650 focus:outline-none focus:bg-white focus:border-gray-300 transition-all cursor-pointer min-w-[150px]"
            >
              <option value="All Drivers">All Drivers</option>
              {[...new Set(enrichedAmbulances.map(a => a.driverName).filter(Boolean))].map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side Buttons group */}
        <div className="flex items-center gap-2">
          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-gray-650 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-3xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            <span>Reset</span>
          </button>

          {/* Additional Filter Button */}
          <button
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-gray-650 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-3xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-gray-400" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Ambulance Registry Table */}
      {loading && ambulances.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-xs font-semibold">Connecting ambulance registry...</div>
      ) : error ? (
        <div className="py-12 text-center text-rose-500 text-xs font-semibold">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto w-full bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-gray-450 bg-slate-50/50">
                  <th className="py-4 px-5">Ambulance Details</th>
                  <th className="py-4 px-5">Registration No.</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5">Assigned Driver</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[12.5px] text-slate-700 font-medium">
                {paginatedAmbulances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-semibold">No ambulance records found matching filters.</td>
                  </tr>
                ) : (
                  paginatedAmbulances.map(amb => {
                    const initials = amb.driverName !== "Not Assigned"
                      ? amb.driverName.split(" ").map(n => n[0]).join("")
                      : "";

                    return (
                      <tr key={amb.id} className="hover:bg-slate-50/30 transition-colors">
                        {/* Ambulance Details */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <AmbulanceVanIcon />
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 leading-tight">{amb.vehicleName}</span>
                              <span className="text-[10px] text-gray-400 mt-[3px] font-semibold flex items-center gap-1.5">
                                <span>{amb.typeDesc}</span>
                                {amb.gpsImei && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 text-emerald-600 font-extrabold bg-emerald-50 px-1 py-0.25 rounded text-[9px]">
                                      <Battery className="w-2.5 h-2.5 inline" /> {amb.battery}%
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Registration Number */}
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{amb.registration}</span>
                            {amb.gpsImei && (
                              <span className="text-[9px] text-gray-400 mt-[3px] font-semibold tracking-wide">
                                IMEI: {amb.gpsImei}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-850 leading-tight">{amb.typeName}</span>
                            {amb.gpsImei ? (
                              <span className="text-[9.5px] text-blue-600 font-extrabold mt-[2px] tracking-tight">
                                {amb.coordinates}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 mt-[2px] font-semibold">{amb.typeDesc}</span>
                            )}
                          </div>
                        </td>

                        {/* Assigned Driver */}
                        <td className="py-3.5 px-5">
                          {amb.driverName === "Not Assigned" ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-rose-500 text-[12px]">Not Assigned</span>
                              <span className="text-[10px] text-gray-455 mt-[2px] font-semibold">-</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-600 shadow-3xs flex-shrink-0">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-800 leading-tight">{amb.driverName}</span>
                                <span className="text-[10px] text-gray-455 mt-[3px] font-semibold">{amb.driverPhone}</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-md text-[10px] font-bold border ${
                              amb.status === "Active"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : amb.status === "Maintenance"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                amb.status === "Active"
                                  ? "bg-emerald-500"
                                  : amb.status === "Maintenance"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`} />
                              {amb.status}
                            </span>
                            {amb.gpsImei && (
                              <span className="text-[9px] text-slate-500 font-extrabold flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                <span className={`w-1 h-1 rounded-full ${amb.ignition ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                ENG: {amb.ignition ? "IGNITION ON" : "IGNITION OFF"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <a 
                              href={`/admin/live-tracking?selected=${encodeURIComponent(amb.gpsPlate || amb.registration)}`}
                              title="View Live Track"
                              className="w-7.5 h-7.5 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-gray-550 hover:bg-slate-50 hover:text-slate-800 shadow-3xs transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <button 
                              title="Edit Ambulance"
                              className="w-7.5 h-7.5 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-gray-550 hover:bg-slate-50 hover:text-slate-800 shadow-3xs transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              title="More Options"
                              className="w-7.5 h-7.5 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-gray-550 hover:bg-slate-50 hover:text-slate-800 shadow-3xs transition cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="h-[56px] border-t border-slate-100 px-6 flex items-center justify-between text-[11.5px] font-bold text-gray-400 bg-slate-50/20">
              <span>Showing {startIndex + 1} - {endIndex} of {totalItems} ambulances</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-slate-800 px-1">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}\n
      {/* Add Ambulance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-black text-slate-800">Add New Ambulance</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(""); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addError && <p className="text-rose-500 text-[12px] font-bold bg-rose-50 px-3 py-2 rounded-xl">{addError}</p>}
            <form onSubmit={handleAddAmbulance} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ambulance No. *</label>
                  <input required type="number" min="1" value={addForm.ambulance_number}
                    onChange={e => setAddForm(f => ({ ...f, ambulance_number: e.target.value }))}
                    placeholder="e.g. 41"
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration No.</label>
                  <input value={addForm.registration}
                    onChange={e => setAddForm(f => ({ ...f, registration: e.target.value }))}
                    placeholder="HR-55-1041"
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Type</label>
                  <select value={addForm.type_name} onChange={e => setAddForm(f => ({ ...f, type_name: e.target.value }))}
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] font-bold outline-none focus:border-emerald-500">
                    <option value="Force Traveller">Force Traveller</option>
                    <option value="Tata Winger">Tata Winger</option>
                    <option value="Maruti Eeco">Maruti Eeco</option>
                    <option value="Bolero Camper">Bolero Camper</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver Name</label>
                  <input value={addForm.driver_name}
                    onChange={e => setAddForm(f => ({ ...f, driver_name: e.target.value }))}
                    placeholder="e.g. Ramesh Kumar"
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver Phone</label>
                  <input value={addForm.driver_phone}
                    onChange={e => setAddForm(f => ({ ...f, driver_phone: e.target.value }))}
                    placeholder="9876543210"
                    className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <button type="submit" disabled={addLoading}
                className="h-10 bg-[#00875A] hover:bg-[#00704a] text-white rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50">
                <Save className="w-4 h-4" />
                {addLoading ? "Saving..." : "Save Ambulance"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

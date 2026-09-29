"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Truck, Battery, Zap, RefreshCw, Compass, AlertCircle,
  Sliders, ChevronLeft, ChevronRight, Eye, UserPlus, X, Save
} from "lucide-react";
import { formatBatteryPercent, knotsToKmh, computeVehicleStatus, parsePlateNumber } from "@/lib/gpsUtils";

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
  const [gpsData, setGpsData] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentTarget, setAssignmentTarget] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [actionError, setActionError] = useState("");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [driverFilter, setDriverFilter] = useState("All Drivers");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchGps = async () => {
    try {
      const res = await fetch("/api/gps?t=" + Date.now());
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data?.object)) {
        setGpsData(json.data.object);
        setGpsError(null);
      } else {
        setGpsData([]);
        setGpsError(json.error || "Live GPS data is currently unavailable.");
      }
    } catch {
      setGpsData([]);
      setGpsError("Unable to connect to the live GPS service.");
    } finally {
      setGpsLoading(false);
    }
  };

  const fetchDriversAndAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const [driversResponse, assignmentsResponse] = await Promise.all([
        fetch("/api/drivers"),
        fetch("/api/gps/assignments"),
      ]);
      const [driversJson, assignmentsJson] = await Promise.all([
        driversResponse.json(),
        assignmentsResponse.json(),
      ]);

      if (!driversResponse.ok || !driversJson.success || !Array.isArray(driversJson.data)) {
        throw new Error(driversJson.error || "Could not load saved drivers.");
      }
      if (!assignmentsResponse.ok || !assignmentsJson.success || !Array.isArray(assignmentsJson.data)) {
        throw new Error(assignmentsJson.error || "Could not load GPS driver assignments.");
      }

      setDrivers(driversJson.data);
      setAssignments(Object.fromEntries(assignmentsJson.data.map(assignment => [assignment.device_id, assignment])));
      setAssignmentError("");
      setActionError("");
    } catch (fetchError) {
      setActionError(fetchError.message || "Could not load GPS driver assignments.");
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchGps();
    fetchDriversAndAssignments();
    const interval = setInterval(fetchGps, 8000);
    return () => clearInterval(interval);
  }, []);

  // GPS is the fleet source of truth; DB details are attached only on exact matches.
  const uniqueGpsVehicles = [...new Map(
    gpsData
      .filter(vehicle => vehicle && (vehicle.deviceUniqueId || vehicle.id))
      .map(vehicle => [String(vehicle.deviceUniqueId || vehicle.id), vehicle])
  ).values()];
  const gpsVehicles = uniqueGpsVehicles.map(gps => {
    const registration = parsePlateNumber(gps.name);
    const gpsId = String(gps.deviceUniqueId || gps.id);
    const assignment = assignments[gpsId];
    const speedKmh = knotsToKmh(gps.speed);
    const latitude = Number(gps.latitude);
    const longitude = Number(gps.longitude);
    const hasCoordinates = gps.latitude != null && gps.longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0);
    const battery = formatBatteryPercent(gps.attributes?.batteryLevel);

    return {
      gpsId,
      vehicleName: String(gps.name || gps.deviceUniqueId || gps.id),
      registration: registration === "Unknown" ? String(gps.deviceUniqueId || "—") : registration,
      typeName: String(gps.attributes?.vehicleType || gps.attributes?.type || "—"),
      driverId: assignment?.driver_id || "",
      driverName: assignment?.driver_name || "Unassigned",
      driverPhone: assignment?.driver_phone || "",
      hasAssignment: Boolean(assignment),
      status: computeVehicleStatus(gps.attributes, speedKmh),
      battery: battery ?? "—",
      ignition: gps.attributes?.ignition === true,
      coordinates: hasCoordinates ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "Location unavailable",
      gpsImei: gps.deviceUniqueId || "",
      gpsPlate: registration,
      speedDisplay: `${speedKmh.toFixed(1)} km/h`,
      address: gps.address || "",
      rawGps: gps,
    };
  });

  // Filter logic
  const filteredAmbulances = gpsVehicles.filter(a => {
    const matchesSearch = 
      String(a.vehicleName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.registration ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.typeName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === "All Status" ? true : a.status === statusFilter;
      
      const matchesType = typeFilter === "All Types" || a.typeName === typeFilter;
      
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

  const openAssignment = (vehicle) => {
    setAssignmentTarget(vehicle);
    setSelectedDriverId(vehicle.driverId);
    setAssignmentError("");
  };

  const saveAssignment = async (event) => {
    event.preventDefault();
    if (!assignmentTarget || !selectedDriverId) return;
    setAssignmentLoading(true);
    setAssignmentError("");
    try {
      const response = await fetch("/api/gps/assignments", {
        method: assignmentTarget.hasAssignment ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceUniqueId: assignmentTarget.gpsId,
          deviceName: assignmentTarget.vehicleName,
          driverId: selectedDriverId,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setAssignmentError(json.error || "Could not save this driver assignment.");
        return;
      }
      await fetchDriversAndAssignments();
      setAssignmentTarget(null);
    } catch {
      setAssignmentError("Network error while saving driver assignment.");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const removeAssignment = async () => {
    if (!assignmentTarget || !assignmentTarget.hasAssignment) return;
    if (!window.confirm(`Unassign ${assignmentTarget.driverName} from this GPS vehicle?`)) return;
    setAssignmentLoading(true);
    setAssignmentError("");
    try {
      const response = await fetch(`/api/gps/assignments?deviceUniqueId=${encodeURIComponent(assignmentTarget.gpsId)}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setAssignmentError(json.error || "Could not remove this driver assignment.");
        return;
      }
      await fetchDriversAndAssignments();
      setAssignmentTarget(null);
    } catch {
      setAssignmentError("Network error while removing driver assignment.");
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Stats calculation
  const totalCount = gpsVehicles.length;
  const activeCount = gpsVehicles.filter(vehicle => vehicle.status === "RUNNING").length;
  const idleCount = gpsVehicles.filter(vehicle => vehicle.status === "IDLE").length;
  const inactiveCount = gpsVehicles.filter(vehicle => vehicle.status === "STOPPED").length;
  const maintenanceCount = idleCount;

  return (
    <div className="flex flex-col gap-6 w-full text-[#1e293b] relative">
      
      {/* Title & Breadcrumbs + saved driver count */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-black text-slate-900 tracking-tight">Ambulances</h1>
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mt-1">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-gray-600">Ambulances</span>
          </div>
        </div>
        <div className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl">
          {drivers.length} saved drivers available
        </div>
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
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Live GPS devices</span>
          </div>
        </div>

        {/* Active Ambulances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Running on GPS</span>
            <span className="text-[25px] font-black text-blue-600 mt-0.5 leading-tight">{activeCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Ignition and motion active</span>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Idle on GPS</span>
            <span className="text-[25px] font-black text-amber-500 mt-0.5 leading-tight">{maintenanceCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Ignition on, stationary</span>
          </div>
        </div>

        {/* Inactive Ambulances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Stopped on GPS</span>
            <span className="text-[25px] font-black text-purple-500 mt-0.5 leading-tight">{inactiveCount}</span>
            <span className="text-[10px] text-gray-455 font-semibold mt-1">Ignition off</span>
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
              <option value="RUNNING">Running</option>
              <option value="IDLE">Idle</option>
              <option value="STOPPED">Stopped</option>
            </select>
          </div>

          {/* Type Dropdown */}
          <div className="flex flex-col">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 bg-gray-50 border border-slate-200 rounded-xl text-[12px] font-bold text-gray-650 focus:outline-none focus:bg-white focus:border-gray-300 transition-all cursor-pointer min-w-[120px]"
            >
              <option value="All Types">All GPS Types</option>
              {[...new Set(gpsVehicles.map(vehicle => vehicle.typeName).filter(name => name && name !== "—"))].map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
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
              <option value="Unassigned">Unassigned</option>
              {[...new Set(gpsVehicles.map(a => a.driverName).filter(name => name && name !== "Unassigned"))].map(name => (
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
      {actionError && <p className="text-rose-600 text-[12px] font-bold bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl">{actionError}</p>}
      {assignmentsLoading && gpsLoading && gpsData.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-xs font-semibold">Connecting to live GPS...</div>
      ) : gpsError ? (
        <div className="py-12 text-center text-rose-500 text-xs font-semibold">{gpsError}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
          {assignmentError && <p className="text-rose-600 text-[12px] font-bold bg-rose-50 border-b border-rose-100 px-5 py-3">{assignmentError}</p>}
          <div className="overflow-x-auto w-full bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-gray-450 bg-slate-50/50">
                  <th className="py-4 px-5">Ambulance Details</th>
<th className="py-4 px-5">Registration No.</th>
<th className="py-4 px-5">Assigned Driver</th>
<th className="py-4 px-5">Status</th>
<th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[12.5px] text-slate-700 font-medium">
                {paginatedAmbulances.length === 0 ? (
                  <tr>
<td colSpan={5} className="py-8 text-center text-gray-400 font-semibold">
  No ambulance records found matching filters.
</td>
                  </tr>
                ) : (
                  paginatedAmbulances.map(amb => {
                    const initials = amb.hasAssignment
                      ? amb.driverName.split(" ").map(n => n[0]).join("")
                      : "";

                    return (
                      <tr key={amb.gpsId} className="hover:bg-slate-50/30 transition-colors">
                        {/* Ambulance Details */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <AmbulanceVanIcon />
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 leading-tight">{amb.vehicleName}</span>
                              <span className="text-[10px] text-gray-400 mt-[3px] font-semibold flex items-center gap-1.5">
                                <span>{amb.typeName !== "—" ? amb.typeName : "GPS device"}</span>
                                {amb.gpsImei && amb.battery !== "—" && (
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
                       

                        {/* Assigned Driver */}
                        <td className="py-3.5 px-5">
                          {!amb.hasAssignment ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-amber-600 text-[12px]">Unassigned</span>
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
                              amb.status === "RUNNING"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : amb.status === "IDLE"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                amb.status === "RUNNING"
                                  ? "bg-emerald-500"
                                  : amb.status === "IDLE"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
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
                              onClick={() => openAssignment(amb)}
                              title={amb.hasAssignment ? "Change assigned driver" : "Assign driver"}
                              aria-label={`${amb.hasAssignment ? "Change" : "Assign"} driver for ${amb.vehicleName}`}
                              disabled={assignmentsLoading || drivers.length === 0}
                              className="w-7.5 h-7.5 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-gray-550 hover:bg-blue-50 hover:text-blue-600 shadow-3xs transition cursor-pointer disabled:opacity-50"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
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
      {assignmentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-[16px] font-black text-slate-800">{assignmentTarget.hasAssignment ? "Change Assigned Driver" : "Assign Driver"}</h2>
                <span className="text-[11px] text-slate-500 mt-1">{assignmentTarget.vehicleName}</span>
              </div>
              <button onClick={() => setAssignmentTarget(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close driver assignment">
                <X className="w-5 h-5" />
              </button>
            </div>
            {assignmentError && <p className="text-rose-600 text-[12px] font-bold bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl">{assignmentError}</p>}
            <form onSubmit={saveAssignment} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Saved Driver
                <select required value={selectedDriverId} onChange={event => setSelectedDriverId(event.target.value)} disabled={assignmentsLoading || assignmentLoading} className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] font-bold normal-case focus:outline-none focus:border-emerald-500 disabled:opacity-50">
                  <option value="">Select a driver</option>
                  {drivers.map(driver => {
                    const assignedDevice = Object.values(assignments).find(assignment => assignment.driver_id === driver.id)?.device_id;
                    const alreadyAssigned = assignedDevice && assignedDevice !== assignmentTarget.gpsId;
                    return <option key={driver.id} value={driver.id} disabled={alreadyAssigned}>{driver.name}{alreadyAssigned ? " (already assigned)" : ""}</option>;
                  })}
                </select>
              </label>
              <button type="submit" disabled={!selectedDriverId || assignmentLoading || assignmentsLoading} className="h-10 bg-[#00875A] hover:bg-[#00704a] text-white rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50">
                <Save className="w-4 h-4" />{assignmentLoading ? "Saving..." : assignmentTarget.hasAssignment ? "Save Driver Change" : "Assign Driver"}
              </button>
              {assignmentTarget.hasAssignment && (
                <button type="button" onClick={removeAssignment} disabled={assignmentLoading} className="h-10 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[12px] font-bold transition cursor-pointer disabled:opacity-50">
                  Unassign Driver
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Phone, CreditCard, ShieldCheck, Users, Compass, 
  AlertCircle, CheckCircle, RefreshCw, Plus, 
  ChevronLeft, ChevronRight, Eye, Edit3, MoreVertical, Truck, X, Save
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpsMap, setGpsMap] = useState({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [lastUpdated, setLastUpdated] = useState("");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", license: "", ambulance_number: "", plate: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [editDriver, setEditDriver] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch drivers from DB
  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/drivers");
      const json = await res.json();
      if (json.success) {
        setDrivers(json.data);
        setError(null);
      } else {
        setError("Failed to load drivers from database.");
      }
    } catch (err) {
      setError("Network error loading drivers.");
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString("en-IN"));
    }
  };

  // Fetch live GPS to overlay live status
  const fetchGps = async () => {
    try {
      const res = await fetch("/api/gps?t=" + Date.now());
      const json = await res.json();
      if (json.success && json.data?.object) {
        const map = {};
        json.data.object.forEach(v => {
          const enriched = enrichGpsVehicle(v);
          if (enriched) map[enriched.driverName] = enriched;
        });
        setGpsMap(map);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDrivers();
    fetchGps();
    const gpsInterval = setInterval(fetchGps, 8000);
    return () => clearInterval(gpsInterval);
  }, []);

  // Merge DB drivers with live GPS overlay
  const enrichedDrivers = drivers.map(driver => {
    const gps = gpsMap[driver.name];
    return {
      ...driver,
      availability: gps ? (gps.isIgnitionOn ? "On Duty" : "Available") : driver.availability,
      speed: gps?.speedDisplay || null,
      todayDistance: gps?.todayDistDisplay || null,
      gpsPlate: gps?.plate || driver.plate,
    };
  });

  const handleResetFilters = () => {
    setSearchQuery(""); setStatusFilter("All Status");
    setAvailabilityFilter("All"); setCurrentPage(1);
  };

  // Filter logic
  const filteredDrivers = enrichedDrivers.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = d.name.toLowerCase().includes(q) || d.phone.includes(q) ||
      (d.license || "").toLowerCase().includes(q) || (d.email || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All Status" ? true : d.status === statusFilter;
    const matchesAvailability = availabilityFilter === "All" ? true : d.availability === availabilityFilter;
    return matchesSearch && matchesStatus && matchesAvailability;
  });

  // Pagination
  const totalItems = filteredDrivers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedDrivers = filteredDrivers.slice(startIndex, startIndex + itemsPerPage);

  // Add new driver
  const handleAddDriver = async (e) => {
    e.preventDefault();
    setAddLoading(true); setAddError("");
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setAddForm({ name: "", phone: "", email: "", license: "", ambulance_number: "", plate: "" });
        fetchDrivers();
      } else {
        setAddError(json.error || "Failed to add driver");
      }
    } catch { setAddError("Network error"); }
    finally { setAddLoading(false); }
  };

  // Update driver status
  const handleUpdateStatus = async (driver, newStatus) => {
    try {
      await fetch("/api/drivers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driver.id, status: newStatus }),
      });
      fetchDrivers();
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800 relative">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-black text-slate-900 tracking-tight">Drivers Registry</h1>
          <p className="text-[12px] text-gray-400 mt-1 font-bold">Manage on-duty ambulance drivers, credential records, and daily rescue counts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-450 font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            Last Sync: <span className="text-slate-800">{lastUpdated || "Syncing..."}</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[12px] font-extrabold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">Total Drivers</span>
            <span className="text-[26px] font-black text-slate-900 mt-1 leading-none">{drivers.length}</span>
          </div>
          <div className="w-11 h-11 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
            <Users className="w-5.5 h-5.5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">Active</span>
            <span className="text-[26px] font-black text-blue-600 mt-1 leading-none">
              {enrichedDrivers.filter(d => d.status === "Active").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">On Duty</span>
            <span className="text-[26px] font-black text-amber-600 mt-1 leading-none">
              {enrichedDrivers.filter(d => d.availability === "On Duty").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Compass className="w-5.5 h-5.5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-black text-gray-400 uppercase tracking-wide">Available</span>
            <span className="text-[26px] font-black text-emerald-600 mt-1 leading-none">
              {enrichedDrivers.filter(d => d.availability === "Available").length}
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-3xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or license..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-slate-300 transition-all w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-black text-slate-650 cursor-pointer min-w-[130px] outline-none"
          >
            <option value="All Status">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={availabilityFilter}
            onChange={(e) => { setAvailabilityFilter(e.target.value); setCurrentPage(1); }}
            className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-black text-slate-650 cursor-pointer min-w-[130px] outline-none"
          >
            <option value="All">All Availability</option>
            <option value="On Duty">On Duty</option>
            <option value="Available">Available</option>
          </select>
        </div>
        <button
          onClick={handleResetFilters}
          className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-[12.5px] font-black text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-3xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset</span>
        </button>
      </div>

      {/* Registry Table */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 font-bold">Loading drivers from database...</div>
      ) : error ? (
        <div className="p-12 text-center text-rose-500 font-bold border border-rose-100 rounded-2xl bg-rose-50/50">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto w-full bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-slate-50/50">
                  <th className="py-3.5 px-5">Driver Details</th>
                  <th className="py-3.5 px-5">Phone Number</th>
                  <th className="py-3.5 px-5">License No.</th>
                  <th className="py-3.5 px-5">Assigned Ambulance</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Availability</th>
                  <th className="py-3.5 px-5">Total Rescues</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[12.5px] text-slate-700 font-medium">
                {paginatedDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400 font-bold">No driver records matched current query.</td>
                  </tr>
                ) : (
                  paginatedDrivers.map((driver) => {
                    const initials = driver.name.split(" ").map(n => n[0]).join("").toUpperCase();
                    return (
                      <tr key={driver.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-black text-[12px] text-blue-700 flex-shrink-0">
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-800 leading-tight">{driver.name}</span>
                              <span className="text-[10px] text-slate-400 mt-1 font-bold">{driver.email || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <a href={`tel:${driver.phone}`} className="font-bold text-slate-750 flex items-center gap-1.5 hover:text-blue-600 transition">
                            <Phone className="w-3.5 h-3.5 text-slate-300" />
                            +91 {driver.phone}
                          </a>
                        </td>
                        <td className="py-3 px-5 font-mono font-black text-slate-800 text-[11px]">
                          {driver.license || "—"}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-start gap-2">
                            <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-700 leading-tight">{driver.vehicle_name}</span>
                              <span className="text-[9.5px] text-gray-400 mt-1 font-bold">• {driver.plate}</span>
                              {driver.speed && (
                                <span className="text-[9px] text-emerald-600 font-bold mt-0.5">● {driver.speed}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            driver.status === "Active"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {driver.status}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <button
                            onClick={async () => {
                              const newAvail = driver.availability === "On Duty" ? "Off Duty" : "On Duty";
                              try {
                                await fetch("/api/drivers", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: driver.id, availability: newAvail }),
                                });
                                fetchDrivers();
                              } catch (e) {
                                console.error("Failed to toggle duty in admin table:", e);
                              }
                            }}
                            className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase border cursor-pointer transition hover:scale-105 ${
                              driver.availability === "Off Duty" || driver.availability === "On Leave"
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-emerald-50 text-emerald-600 border-emerald-200"
                            }`}
                            title="Click to toggle On Duty / Off Duty"
                          >
                            {driver.availability === "Off Duty" || driver.availability === "On Leave" ? "Off Duty" : "On Duty"}
                          </button>
                        </td>
                        <td className="py-3 px-5 font-black text-slate-800">
                          {driver.total_rescues}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <a
                              href={`/admin/live-tracking?selected=${encodeURIComponent(driver.gpsPlate || driver.plate)}`}
                              title="View Live Track"
                              className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-850 shadow-3xs transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleUpdateStatus(driver, driver.status === "Active" ? "Inactive" : "Active")}
                              title="Toggle Status"
                              className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-850 shadow-3xs transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
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

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-white">
            <span className="text-[11.5px] font-bold text-gray-400">
              Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="w-7.5 h-7.5 rounded-lg border border-slate-200 flex items-center justify-center text-gray-550 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7.5 h-7.5 rounded-lg text-[11.5px] font-extrabold transition cursor-pointer ${
                      currentPage === page ? "bg-blue-600 text-white shadow-3xs" : "border border-slate-200 text-gray-650 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="w-7.5 h-7.5 rounded-lg border border-slate-200 flex items-center justify-center text-gray-550 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-black text-slate-800">Add New Driver</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(""); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addError && <p className="text-rose-500 text-[12px] font-bold bg-rose-50 px-3 py-2 rounded-xl">{addError}</p>}
            <form onSubmit={handleAddDriver} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                  <input required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Rahul Singh" className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone *</label>
                  <input required value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="9876543210" className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ambulance No. *</label>
                  <input required type="number" min="1" max="40" value={addForm.ambulance_number} onChange={e => setAddForm(f => ({ ...f, ambulance_number: e.target.value }))}
                    placeholder="e.g. 17" className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">License No.</label>
                  <input value={addForm.license} onChange={e => setAddForm(f => ({ ...f, license: e.target.value }))}
                    placeholder="DL-17A-1017" className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="driver@resqtrack.org" className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <button type="submit" disabled={addLoading}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50">
                <Save className="w-4 h-4" />
                {addLoading ? "Saving..." : "Save Driver"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

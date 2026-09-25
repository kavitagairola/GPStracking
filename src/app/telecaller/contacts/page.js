"use client";

import React, { useState, useEffect } from "react";
import { Search, Phone, ShieldCheck, MapPin, Radio, Copy, Check, Battery, Compass } from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [gpsData, setGpsData] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, gpsRes] = await Promise.all([
          fetch("/api/drivers"),
          fetch("/api/gps?t=" + Date.now())
        ]);
        const driversJson = await driversRes.json();
        const gpsJson = await gpsRes.json();

        if (driversJson.success && driversJson.data) {
          setDrivers(driversJson.data);
        }
        if (gpsJson.success && gpsJson.data?.object) {
          setGpsData(gpsJson.data.object);
        }
      } catch (err) {
        console.error("Fetch error on Contacts Page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyNumber = (phone, index) => {
    navigator.clipboard.writeText(phone);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Process and map live GPS data to each driver in our database
  const mappedContacts = drivers.map((driver, index) => {
    const ambulanceNum = driver.ambulance || `Ambulance ${String(index + 1).padStart(2, "0")}`;
    
    // Find live vehicle matching this driver name
    const matchingGps = gpsData.map(v => enrichGpsVehicle(v)).find(
      v => v && v.driverName === driver.name
    );

    return {
      name: driver.name,
      phone: driver.phone,
      ambulanceNum: ambulanceNum,
      plate: matchingGps ? matchingGps.plate : "HR-XX-XXXX",
      alias: matchingGps ? matchingGps.alias : `A-${index + 1}`,
      isLive: !!matchingGps,
      status: matchingGps ? matchingGps.status : (driver.status || "OFFLINE"),
      battery: matchingGps ? matchingGps.batteryDisplay : "N/A",
      speed: matchingGps ? matchingGps.speedDisplay : "0.0 km/h",
      location: matchingGps ? matchingGps.address : "Off Duty / Garage",
    };
  });

  const filteredContacts = mappedContacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.ambulanceNum.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "RUNNING":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "IDLE":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      default:
        return "bg-slate-50 text-slate-500 border border-slate-150";
    }
  };

  const getStatusBulletColor = (status) => {
    switch (status) {
      case "RUNNING":
        return "bg-emerald-500";
      case "IDLE":
        return "bg-amber-500";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="bg-white border border-gray-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex flex-col">
          <h3 className="text-[15.5px] font-black text-gray-800 leading-tight">Quick Contacts Directory</h3>
          <p className="text-[11.5px] text-gray-400 mt-1">Direct tele-communication directory mapping drivers, ambulance units, and live locations.</p>
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Search Driver Name, Unit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9.5 pl-9.5 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-[12px] font-bold text-gray-400">Loading directory telemetry...</span>
        </div>
      ) : (
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Driver Profile</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Ambulance</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Number</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duty Status</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Telemetry</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Location</th>
                <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-[12.5px] font-bold text-slate-400">
                    No contacts found matching the search.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c, index) => {
                  return (
                    <tr key={index} className="hover:bg-slate-50/50 transition">
                      {/* Profile */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-black text-[10.5px]">
                            {c.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="text-[12.5px] font-bold text-slate-800">{c.name}</span>
                        </div>
                      </td>

                      {/* Mapped Ambulance */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-black text-slate-700 leading-tight">{c.ambulanceNum}</span>
                          <span className="text-[9.5px] text-gray-400 mt-1 font-bold">{c.plate} {c.alias}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3">
                        <a 
                          href={`tel:${c.phone}`} 
                          className="text-[12px] text-slate-700 hover:text-emerald-600 transition font-bold flex items-center gap-1 leading-tight"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-350" />
                          +91 {c.phone}
                        </a>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full inline-flex items-center gap-1 ${getStatusColor(c.status)}`}>
                          <span className={`w-1 h-1 rounded-full ${getStatusBulletColor(c.status)} ${c.status !== "OFFLINE" && c.status !== "STOPPED" ? "animate-pulse" : ""}`} />
                          {c.status}
                        </span>
                      </td>

                      {/* Telemetry info */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[11.5px] text-slate-700 font-bold flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5 text-emerald-500" /> {c.battery}
                          </span>
                          <span className="text-[9.5px] text-gray-400 mt-1 font-medium">{c.speed}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 text-[11.5px] text-slate-600 font-bold max-w-[200px]" title={c.location}>
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate">{c.location}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a 
                            href={`tel:${c.phone}`} 
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-3xs active:scale-[0.97]"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                          <button
                            onClick={() => handleCopyNumber(c.phone, index)}
                            className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition active:scale-[0.97] cursor-pointer"
                            title="Copy Phone Number"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
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
    </div>
  );
}

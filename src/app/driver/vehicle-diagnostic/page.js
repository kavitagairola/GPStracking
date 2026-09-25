"use client";

import React, { useState, useEffect } from "react";
import { Battery, Zap, Activity, ShieldCheck, Compass, Radio } from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function VehicleDiagnosticPage() {
  const [gpsData, setGpsData] = useState(null);

  const [driverName, setDriverName] = useState("Raj Kumar");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDriver = localStorage.getItem("currentDriverName");
      if (savedDriver) {
        setDriverName(savedDriver);
      }
    }
  }, []);

  useEffect(() => {
    const fetchGps = async () => {
      try {
        const res = await fetch("/api/gps?t=" + Date.now());
        const json = await res.json();
        if (json.success && json.data?.object) {
          // Find vehicle mapped to current driver name
          const allEnriched = json.data.object.map(o => enrichGpsVehicle(o)).filter(Boolean);
          const vehicle = allEnriched.find(v => v.driverName === driverName);
          if (vehicle) {
            setGpsData(vehicle);
          }
        }
      } catch (err) {
        console.error("GPS Fetch Error:", err);
      }
    };
    fetchGps();
    const interval = setInterval(fetchGps, 4000);
    return () => clearInterval(interval);
  }, [driverName]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px] mx-auto mt-2">
      {gpsData ? (
        <div className="flex flex-col gap-6">
          {/* Main Card */}
          <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-3xs flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15.5px] font-black text-gray-800 leading-tight">Ambulance Health Overview</h3>
                <p className="text-[12px] text-gray-400 mt-1 font-medium">Real-time status markers retrieved from the vehicle track OBD nodes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="border border-slate-100 p-4 rounded-2xl flex flex-col gap-1.5">
                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider">Device Model</span>
                <span className="text-[13.5px] font-black text-slate-800">Millitrack OBD II GPS</span>
              </div>
              <div className="border border-slate-100 p-4 rounded-2xl flex flex-col gap-1.5">
                <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider">Active IMEI</span>
                <span className="text-[13.5px] font-black text-slate-800">{gpsData.deviceUniqueId}</span>
              </div>
            </div>

            {/* Diagnostic Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-slate-100 p-5 rounded-2xl flex flex-col items-center text-center gap-2">
                <Battery className="w-8 h-8 text-emerald-500" />
                <span className="text-[16px] font-black text-slate-800 mt-1">{gpsData.batteryDisplay}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Battery Volt Percent</span>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl flex flex-col items-center text-center gap-2">
                <Zap className="w-8 h-8 text-orange-500" />
                <span className="text-[16px] font-black text-slate-800 mt-1">
                  {gpsData.isCharging ? "Charging" : "Discharging"}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Alternator State</span>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl flex flex-col items-center text-center gap-2">
                <Compass className="w-8 h-8 text-sky-500" />
                <span className="text-[16px] font-black text-slate-800 mt-1">{gpsData.course}°</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Compass Course Heading</span>
              </div>
            </div>

            <div className="border-t border-slate-50 pt-4 flex items-center justify-between text-[11.5px] text-slate-400 font-bold px-2">
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-500" /> GPS Connection Status: OK
              </span>
              <span>Updated: {gpsData.lastUpdate}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-12 bg-white border border-orange-100 rounded-3xl text-gray-450 font-bold">
          Loading diagnostic parameters...
        </div>
      )}
    </div>
  );
}

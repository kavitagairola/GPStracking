"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Search, MapPin, Radio, Battery, Compass, CheckCircle, 
  Phone, Navigation, Plus, Minus, ShieldCheck, 
  Clock, X, AlertOctagon, Heart, Users, ExternalLink,
  Wifi, WifiOff
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";
import { connectGpsStream, createAnimatedMarker } from "@/lib/markerAnimation";

// ─── Build ambulance SVG icon HTML (shared between driver-status & live-tracking) ─
function buildAmbulanceIconHtml(carColor, courseRotation, pingColor, isSelected, plate, alias) {
  return `
    <div class="relative w-12 h-12 flex items-center justify-center">
      ${isSelected ? `<div class="absolute w-[56px] h-[56px] rounded-full border-2 ${pingColor} animate-ping opacity-30 z-0"></div>` : ""}
      <div class="relative w-12 h-12 z-10 flex items-center justify-center">
        <svg viewBox="0 0 100 100" class="w-full h-full" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.3));">
          <rect x="25" y="22" width="8"  height="16" rx="2" fill="#1e293b" />
          <rect x="67" y="22" width="8"  height="16" rx="2" fill="#1e293b" />
          <rect x="24" y="66" width="9"  height="18" rx="2" fill="#1e293b" />
          <rect x="67" y="66" width="9"  height="18" rx="2" fill="#1e293b" />
          <rect x="33" y="86" width="34" height="4"  rx="1.5" fill="#475569" />
          <path d="M 50,12 C 40,12 32,16 32,26 L 32,38 C 30,40 30,42 30,45 L 30,82 C 30,86 34,88 38,88 L 62,88 C 66,88 70,86 70,82 L 70,45 C 70,42 70,40 68,38 L 68,26 C 68,16 60,12 50,12 Z" fill="${carColor}" stroke="#1e293b" stroke-width="1.5" />
          <path d="M 38,24 C 44,22 56,22 62,24" fill="none" stroke="#1e293b" stroke-width="1" opacity="0.4" />
          <path d="M 36,29 C 36,27 38,26 50,26 C 62,26 64,27 64,29 L 66,36 C 66,37 65,38 64,38 L 36,38 C 35,38 34,37 34,36 Z" fill="#0f172a" />
          <path d="M 38,29 L 46,29 L 42,35 L 36,35 Z" fill="#ffffff" opacity="0.25" />
          <path d="M 27,33 C 25,33 25,36 27,37 L 30,37 L 30,33 Z" fill="#334155" stroke="#1e293b" stroke-width="0.8" />
          <path d="M 73,33 C 75,33 75,36 73,37 L 70,37 L 70,33 Z" fill="#334155" stroke="#1e293b" stroke-width="0.8" />
          <line x1="30" y1="45" x2="70" y2="45" stroke="#1e293b" stroke-width="1" opacity="0.3" />
          <path d="M 32,41 L 32,49 L 33.5,48 L 33.5,41.5 Z" fill="#0f172a" opacity="0.9" />
          <path d="M 68,41 L 68,49 L 66.5,48 L 66.5,41.5 Z" fill="#0f172a" opacity="0.9" />
          <path d="M 31.5,53 L 31.5,72 L 33,71 L 33,54 Z"   fill="#0f172a" opacity="0.9" />
          <path d="M 68.5,53 L 68.5,72 L 67,71 L 67,54 Z"   fill="#0f172a" opacity="0.9" />
          <path d="M 38,85 L 62,85 L 61,87 L 39,87 Z"       fill="#0f172a" />
          <rect x="36" y="38" width="28" height="4" rx="1" fill="#1e293b" />
          <rect x="37" y="37.5" width="11" height="5" rx="1" fill="#3b82f6" />
          <circle cx="42.5" cy="40" r="3" fill="#60a5fa" opacity="0.8" />
          <rect x="52" y="37.5" width="11" height="5" rx="1" fill="#ef4444" />
          <circle cx="57.5" cy="40" r="3" fill="#f87171" opacity="0.8" />
          <rect x="48" y="38" width="4" height="4" fill="#f59e0b" />
          <circle cx="50" cy="62" r="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8" />
          <path d="M 50,56 L 50,68 M 44,62 L 56,62" stroke="#dc2626" stroke-width="3" stroke-linecap="square" />
        </svg>
      </div>
      <div class="absolute bottom-[56px] left-1/2 -translate-x-1/2 bg-white border ${isSelected ? "border-slate-800 font-extrabold text-blue-700 shadow-md scale-105" : "border-slate-200 font-semibold text-slate-700"} px-2.5 py-0.5 rounded-lg whitespace-nowrap text-[9px] z-50 leading-tight shadow-sm">
        ${plate}${alias}
      </div>
      <div class="absolute bottom-[48px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r ${isSelected ? "border-slate-800" : "border-slate-200"} rotate-45 z-40"></div>
    </div>
  `;
}

export default function DriverStatusPage() {
  const [gpsData, setGpsData]                   = useState([]);
  const [cases, setCases]                       = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [connected, setConnected]               = useState(false);  // SSE state
  const [searchQuery, setSearchQuery]           = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [viewMode, setViewMode]                 = useState("Map");
  const [lastUpdated, setLastUpdated]           = useState("");
  const [pushCount, setPushCount]               = useState(0);      // how many SSE pushes received

  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const animMarkersRef  = useRef({});   // deviceId → AnimatedMarker
  const tileLayerRef    = useRef(null);
  const isInitialFetch  = useRef(true);
  const [mapReady, setMapReady] = useState(false);

  // Keep selectedVehicleId in a ref to avoid stale closures in SSE callbacks
  const selectedVehicleIdRef = useRef(selectedVehicleId);
  useEffect(() => { selectedVehicleIdRef.current = selectedVehicleId; }, [selectedVehicleId]);

  // ── Enriched data ──────────────────────────────────────────────────────────
  const enrichedDrivers = gpsData.map(v => enrichGpsVehicle(v)).filter(Boolean);

  const filteredDrivers = enrichedDrivers.filter(d =>
    d.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.num && `Ambulance ${d.num}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── SSE connection — replaces setInterval fetch ────────────────────────────
  useEffect(() => {
    const cleanup = connectGpsStream(
      (objects, isSimulated) => {
        // Sort by ambulance number
        const sorted = [...objects].sort((a, b) => {
          const nA = parseInt(a.name?.replace(/\D/g, "") || "0") || 0;
          const nB = parseInt(b.name?.replace(/\D/g, "") || "0") || 0;
          return nA - nB;
        });

        setGpsData(sorted);
        setConnected(true);
        setLoading(false);
        setLastUpdated(new Date().toLocaleTimeString("en-IN"));
        setPushCount(c => c + 1);

        // Auto-select first vehicle
        if (sorted.length > 0 && selectedVehicleIdRef.current === null) {
          setSelectedVehicleId(sorted[0].deviceUniqueId);
        }
      },
      () => {
        setConnected(false); // SSE disconnected — show warning badge
      }
    );

    return cleanup; // closes SSE on unmount
  }, []);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch("/api/cases?t=" + Date.now());
        const json = await res.json();
        if (json.success && json.data) {
          setCases(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch cases for driver status:", err);
      }
    };
    fetchCases();
    const interval = setInterval(fetchCases, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Initialize Leaflet map ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initMap = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id   = "leaflet-css";
        link.rel  = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const L = (await import("leaflet")).default;
      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [28.6083, 76.6542],
        zoom: 10,
        zoomControl: false,
      });

      tileLayerRef.current = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "Google Maps",
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 500);
    };

    initMap();

    return () => {
      // Cleanup animated markers before removing map
      Object.values(animMarkersRef.current).forEach(m => m.remove());
      animMarkersRef.current = {};
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // ── Tile layer switch (Map / Satellite) ────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then(({ default: L }) => {
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const url = viewMode === "Satellite"
        ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
      tileLayerRef.current = L.tileLayer(url, { attribution: "Google Maps" }).addTo(map);
    });
  }, [viewMode]);

  // ── Fit map to all vehicles on first load ──────────────────────────────────
  useEffect(() => {
    if (isInitialFetch.current && gpsData.length > 0 && mapInstanceRef.current) {
      import("leaflet").then(({ default: L }) => {
        const valid = gpsData.filter(v => v.latitude && v.longitude).map(v => L.latLng(v.latitude, v.longitude));
        if (valid.length > 0) {
          mapInstanceRef.current.fitBounds(L.latLngBounds(valid), { padding: [50, 50] });
          isInitialFetch.current = false;
        }
      });
    }
  }, [gpsData, mapReady]);

  // ── Smooth animated marker updates ────────────────────────────────────────
  // This runs every time we receive a new GPS push from SSE.
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    import("leaflet").then(({ default: L }) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const locationCounts = {};

      filteredDrivers.forEach(driver => {
        if (!driver.latitude || !driver.longitude) return;

        // Slight offset for vehicles at exact same location (parking lot)
        const locKey = `${driver.latitude.toFixed(4)}_${driver.longitude.toFixed(4)}`;
        const count  = locationCounts[locKey] || 0;
        locationCounts[locKey] = count + 1;

        let drawLat = driver.latitude;
        let drawLng = driver.longitude;
        if (count > 0) {
          const angle  = count * (Math.PI / 4);
          const radius = 0.00018 * Math.ceil(count / 8);
          drawLat += radius * Math.cos(angle);
          drawLng += radius * Math.sin(angle) * 1.2;
        }

        const devKey    = String(driver.deviceUniqueId || driver.id);
        const isSelected = String(selectedVehicleId) === devKey;
        const isIgnitionOn = driver.isIgnitionOn;
        const isMoving     = driver.speedKmh > 0 || driver.attributes?.motion === true;

        const carColor     = !isIgnitionOn ? "#ef4444" : (isMoving ? "#10b981" : "#f59e0b");
        const pingColor    = !isIgnitionOn ? "border-red-500" : (isMoving ? "border-emerald-500" : "border-amber-500");
        const courseRotation = driver.course || 0;

        const iconHtml = buildAmbulanceIconHtml(carColor, courseRotation, pingColor, isSelected, driver.plate, driver.alias);

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: iconHtml,
          iconSize:   [48, 48],
          iconAnchor: [24, 24],
        });

        if (animMarkersRef.current[devKey]) {
          // ★ Smooth animation to new position — only moves if position actually changed
          animMarkersRef.current[devKey].animateTo(
            [drawLat, drawLng],
            courseRotation,
            1600
          );
          animMarkersRef.current[devKey].setIcon(customIcon);
        } else {
          // First time: create animated marker at current position
          const anim = createAnimatedMarker(
            L,
            [drawLat, drawLng],
            customIcon,
            map,
            () => setSelectedVehicleId(devKey)
          );
          animMarkersRef.current[devKey] = anim;
        }
      });

      // Remove markers for vehicles that are no longer in the filtered list
      Object.keys(animMarkersRef.current).forEach(id => {
        if (!filteredDrivers.some(d => String(d.deviceUniqueId || d.id) === id)) {
          animMarkersRef.current[id].remove();
          delete animMarkersRef.current[id];
        }
      });
    });
  }, [gpsData, searchQuery, selectedVehicleId, mapReady, pushCount]);

  // ── Center map on selected vehicle ────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicleId) return;
    const sel = gpsData.find(v => v.deviceUniqueId === selectedVehicleId);
    if (sel?.latitude && sel?.longitude) {
      mapInstanceRef.current.setView([sel.latitude, sel.longitude], 14, { animate: true, duration: 0.8 });
    }
  }, [selectedVehicleId]);

  // ── Status helpers ─────────────────────────────────────────────────────────
  const getStatusStyle = s => ({
    RUNNING: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    IDLE:    "bg-amber-50 text-amber-600 border border-amber-100",
  }[s] || "bg-rose-50 text-rose-600 border border-rose-100");

  const getStatusBulletColor = s => ({
    RUNNING: "bg-emerald-500",
    IDLE:    "bg-amber-500",
  }[s] || "bg-rose-500");

  // ── Map controls ───────────────────────────────────────────────────────────
  const handleZoomIn  = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (selectedVehicleId) {
      const sel = gpsData.find(v => v.deviceUniqueId === selectedVehicleId);
      if (sel?.latitude && sel?.longitude) {
        mapInstanceRef.current.setView([sel.latitude, sel.longitude], 14, { animate: true });
        return;
      }
    }
    const valid = gpsData.filter(v => v.latitude && v.longitude).map(v => [v.latitude, v.longitude]);
    if (valid.length) mapInstanceRef.current.fitBounds(valid, { padding: [50, 50] });
  };

  const selectedDriver = enrichedDrivers.find(d => d.deviceUniqueId === selectedVehicleId) || null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">

      {/* Left: Roster Table */}
      <div className="flex-1 bg-white border border-gray-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h3 className="text-[15px] font-black text-gray-800 leading-tight">Driver &amp; Ambulance Live Roster</h3>
            <p className="text-[11.5px] text-gray-400 mt-1">Real-time status tracking from the live GPS tracker networks.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* SSE connection badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
              connected
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-rose-50 text-rose-500 border-rose-100"
            }`}>
              {connected
                ? <><Wifi className="w-3 h-3" /> Live Stream</>
                : <><WifiOff className="w-3 h-3" /> Reconnecting...</>
              }
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                {lastUpdated}
              </span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Driver / Vehicle..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9.5 pl-9.5 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-9 h-9 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
            <span className="text-[12px] font-bold text-gray-400">Connecting to live GPS stream...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto min-h-[400px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit / Plate</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Driver Info</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">GPS Status</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rescue Workload</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Speed &amp; Dist</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Battery &amp; Sync</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDrivers.map(driver => {
                  const isSelected = selectedVehicleId === driver.deviceUniqueId;
                  const activeDriverCases = cases.filter(c => c.driver === driver.driverName && c.status !== "Completed");
                  const activeCount = activeDriverCases.length;
                  return (
                    <tr
                      key={driver.deviceUniqueId}
                      className={`hover:bg-slate-50/50 transition cursor-pointer ${isSelected ? "bg-emerald-50/20 hover:bg-emerald-50/30" : ""}`}
                      onClick={() => setSelectedVehicleId(driver.deviceUniqueId)}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            {driver.num ? `A${driver.num}` : "V"}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12.5px] font-black text-slate-800 leading-tight">
                              {driver.num ? `Ambulance ${String(driver.num).padStart(2, "0")}` : (driver.plate || driver.name || "Vehicle")}
                            </span>
                            <span className="text-[9.5px] text-gray-400 font-bold mt-0.5">{driver.plate}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-bold text-slate-700 leading-tight">{driver.driverName}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-bold">
                            <Phone className="w-3 h-3 text-slate-300" /> +91 {driver.driverPhone}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full inline-flex items-center gap-1.5 ${getStatusStyle(driver.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusBulletColor(driver.status)} ${driver.status !== "STOPPED" ? "animate-pulse" : ""}`} />
                          {driver.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {activeCount === 0 ? (
                          <span className="px-2.5 py-0.5 text-[9.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Available (Free)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[9.5px] font-black bg-amber-50 text-amber-700 border border-amber-200 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Busy ({activeCount} Active Case)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-slate-700 leading-tight">{driver.speedDisplay}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">Today: {driver.todayDistDisplay}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-[11.5px] font-bold text-slate-600 flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5 text-emerald-500" /> {driver.batteryDisplay}
                          </span>
                          <span className="text-[9.5px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                            <Radio className="w-3 h-3 text-sky-400" /> {driver.lastUpdate}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedVehicleId(driver.deviceUniqueId)}
                          className={`h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 mx-auto transition-all active:scale-[0.97] cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <Compass className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-400 animate-spin" : "text-slate-400"}`} />
                          <span>Track</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right: Map Panel */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 flex-shrink-0">
        <div className="bg-white border border-gray-200/60 p-4 rounded-3xl shadow-3xs relative overflow-hidden flex flex-col gap-3 h-[420px]">
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0 rounded-3xl" />

          {/* Map/Satellite toggle */}
          <div className="absolute top-4 left-4 bg-white p-1 rounded-xl shadow-xs border border-slate-150 flex items-center gap-1 z-[1000]">
            {["Map", "Satellite"].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold cursor-pointer transition ${
                  viewMode === mode ? "bg-slate-900 text-white shadow-2xs" : "text-gray-400 hover:text-slate-800"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* SSE live indicator on map */}
          <div className="absolute top-4 right-4 z-[1000]">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold ${
              connected ? "bg-emerald-500 text-white" : "bg-rose-400 text-white"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white ${connected ? "animate-pulse" : ""}`} />
              {connected ? "LIVE" : "OFFLINE"}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-[1000]">
            <button onClick={handleZoomIn}  className="w-8 h-8 bg-white border border-slate-150 rounded-lg flex items-center justify-center shadow-3xs cursor-pointer text-gray-600 hover:bg-gray-50 active:scale-[0.95]">
              <Plus  className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} className="w-8 h-8 bg-white border border-slate-150 rounded-lg flex items-center justify-center shadow-3xs cursor-pointer text-gray-600 hover:bg-gray-50 active:scale-[0.95]">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={handleRecenter} className="w-8 h-8 bg-white border border-slate-150 rounded-lg flex items-center justify-center shadow-3xs cursor-pointer text-gray-600 hover:bg-gray-50 active:scale-[0.95]">
              <Compass className="w-4 h-4 text-blue-500" />
            </button>
          </div>
        </div>

        {/* Selected Driver Details Widget */}
        {selectedDriver && (
          <div className="bg-white border border-gray-200/60 p-5 rounded-3xl shadow-3xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-[11px]">
                  {selectedDriver.num ? `A${selectedDriver.num}` : "V"}
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-black text-slate-800 leading-tight">
                    {selectedDriver.plate} {selectedDriver.alias}
                  </span>
                  <span className="text-[9.5px] text-gray-450 font-bold mt-0.5">Selected Unit</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicleId(null)}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Current Address
              </span>
              <p className="text-[11.5px] font-bold text-slate-700 leading-snug bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {selectedDriver.address}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col items-center">
                <span className="text-[11.5px] font-black text-slate-900 leading-tight">{selectedDriver.speedDisplay}</span>
                <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Speed</span>
              </div>
              <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col items-center">
                <span className="text-[11.5px] font-black text-slate-900 leading-tight">{selectedDriver.todayDistDisplay}</span>
                <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Distance</span>
              </div>
              <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col items-center">
                <span className="text-[11.5px] font-black text-slate-900 leading-tight">{selectedDriver.batteryDisplay}</span>
                <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Battery</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                {selectedDriver.driverName.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-[12.5px] font-black text-slate-800 leading-tight truncate">Driver: {selectedDriver.driverName}</span>
                <a
                  href={`tel:${selectedDriver.driverPhone}`}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 mt-0.5 flex items-center gap-1 font-bold no-underline cursor-pointer"
                >
                  <Phone className="w-3 h-3" /> +91 {selectedDriver.driverPhone}
                </a>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedDriver.latitude},${selectedDriver.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center shadow-3xs cursor-pointer"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

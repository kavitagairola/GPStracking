"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, 
  Battery, 
  Zap, 
  MapPin, 
  Compass, 
  Activity, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Truck, 
  Navigation,
  Globe,
  Search,
  ChevronRight,
  ShieldCheck,
  Map,
  Clock,
  Phone,
  CheckCircle,
  X,
  Plus,
  Minus,
  Calendar
} from "lucide-react";
import {
  enrichGpsVehicle,
  formatBatteryPercent,
  knotsToKmh,
  metersToKm,
  computeVehicleStatus,
  formatAddress,
  timeAgo,
  parseAmbulanceNumber,
  parsePlateNumber,
  parseAlias,
  getDriverForVehicleIndex
} from "@/lib/gpsUtils";
import { connectGpsStream, createAnimatedMarker } from "@/lib/markerAnimation";

export default function LiveTrackingPage() {
  const [gpsData, setGpsData] = useState([]);
  const [maxSpeeds, setMaxSpeeds] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);   // SSE live indicator
  const [pushCount, setPushCount] = useState(0);        // increments each SSE push → triggers marker update
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, RUNNING, IDLE, STOPPED
  const [viewMode, setViewMode] = useState("Map"); // Map or Satellite

  const [mapReady, setMapReady] = useState(false);
  const isInitialFetch = useRef(true);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const animMarkersRef = useRef({});   // deviceId → AnimatedMarker (replaces markersRef)
  const tileLayerRef = useRef(null);

  // Keep a mutable ref of selectedVehicleId to avoid stale closures
  const selectedVehicleIdRef = useRef(selectedVehicleId);
  useEffect(() => {
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);

  // ── SSE connection — replaces old setInterval polling ──────────────────────
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");

    const cleanup = connectGpsStream(
      (objects) => {
        const sorted = [...objects].sort((a, b) => {
          const nA = parseInt(a.name?.replace(/\D/g, "") || "0") || 0;
          const nB = parseInt(b.name?.replace(/\D/g, "") || "0") || 0;
          return nA - nB;
        });

        // Track max speeds
        setMaxSpeeds(prev => {
          const updated = { ...prev };
          let changed = false;
          sorted.forEach(v => {
            const speedKmh = knotsToKmh(v.speed);
            const storageKey = `maxSpeed_${v.deviceUniqueId}_${todayStr}`;
            let currentMax = updated[v.deviceUniqueId];
            if (currentMax === undefined) {
              const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
              currentMax = stored ? parseFloat(stored) : 0;
            }
            if (speedKmh > currentMax) {
              updated[v.deviceUniqueId] = speedKmh;
              changed = true;
              if (typeof window !== "undefined") localStorage.setItem(storageKey, String(speedKmh));
            } else {
              updated[v.deviceUniqueId] = currentMax;
            }
          });
          return changed ? updated : prev;
        });

        setGpsData(sorted);
        setConnected(true);
        setLoading(false);
        setLastUpdated(new Date().toLocaleTimeString("en-IN"));
        setPushCount(c => c + 1);

        if (sorted.length > 0 && selectedVehicleIdRef.current === null) {
          setSelectedVehicleId(sorted[0].deviceUniqueId);
        }
      },
      () => setConnected(false)
    );

    return cleanup;
  }, []);

  // Initialize Map
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === "undefined") return;

      // Add Leaflet CSS dynamically to head if not present
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const L = (await import("leaflet")).default;
      if (mapInstanceRef.current) return;

      // Default center: India (20.5937, 78.9629)
      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
      });

      tileLayerRef.current = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "Google Maps",
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      // Invalidate map size after small delay for correct rendering in flex parent
      setTimeout(() => {
        map.invalidateSize();
      }, 500);
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

  // Update map view mode (Standard / Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      const tileUrl = viewMode === "Satellite"
        ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

      tileLayerRef.current = L.tileLayer(tileUrl, {
        attribution: "Google Maps",
      }).addTo(map);
    });
  }, [viewMode]);

  // Combine raw GPS values with our plate/driver registry metadata
  const getVehicleCombinedData = (gpsItem) => {
    if (!gpsItem) return null;
    const enriched = enrichGpsVehicle(gpsItem);
    if (!enriched) return null;

    const serverDate = new Date(gpsItem.serverTime || gpsItem.timestamp || Date.now());
    const now = new Date();
    const hoursSinceUpdate = Math.max(0, (now - serverDate) / 3600000);
    
    const ignOffHrs = Math.floor(hoursSinceUpdate);
    const ignOffMins = Math.floor((hoursSinceUpdate - ignOffHrs) * 60);
    const ignOffStr = `${String(ignOffHrs).padStart(2, '0')}h:${String(ignOffMins).padStart(2, '0')}m`;

    const maxSpeedVal = maxSpeeds[gpsItem.deviceUniqueId] || 0;
    const maxSpeedDisplay = maxSpeedVal > 0 ? `${maxSpeedVal.toFixed(1)} km/h` : "0.0 km/h";

    const speedVal = enriched.speedKmh || 0;
    let eta = "--";
    if (enriched.status === "RUNNING") {
      const etaMins = Math.max(5, Math.round(120 / (speedVal / 10 + 1)));
      eta = `${etaMins} mins`;
    } else if (enriched.status === "IDLE") {
      eta = "Standby";
    }

    const distFromLastStop = enriched.status === "RUNNING"
      ? (parseFloat(enriched.todayDistKm) * 0.35).toFixed(2) + " km"
      : "0.00 km";

    return {
      ...enriched,
      driver: enriched.driverName,
      phone: enriched.driverPhone,
      location: enriched.address,
      battery: enriched.batteryDisplay,
      totalDistanceKm: enriched.totalDistDisplay,
      todayDistanceKm: enriched.todayDistDisplay,
      time: enriched.formattedTime,
      speedKmh: enriched.speedDisplay,
      maxSpeed: maxSpeedDisplay,
      eta,
      distFromLastStop,
      todayRunning: enriched.status === "RUNNING" ? "Active" : "--",
      todayStopped: enriched.status === "STOPPED" ? ignOffStr : "--",
      todayIdle: enriched.status === "IDLE" ? "Active" : "--",
      ignitionOffSince: enriched.isIgnitionOn ? "--" : ignOffStr,
    };
  };

  // Count by status
  const runningCount = gpsData.filter(v => v.attributes?.ignition === true && (v.speed > 0 || v.attributes?.motion === true)).length;
  const idleCount = gpsData.filter(v => v.attributes?.ignition === true && (v.speed === 0 && !v.attributes?.motion)).length;
  const stoppedCount = gpsData.filter(v => !v.attributes?.ignition).length;

  const filteredVehicles = gpsData.filter(v => {
    const isIgnitionOn = v.attributes?.ignition === true;
    const isMoving = v.speed > 0 || v.attributes?.motion === true;
    const status = !isIgnitionOn ? "STOPPED" : (isMoving ? "RUNNING" : "IDLE");

    const matchesStatus = statusFilter === "ALL" || status === statusFilter;
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.deviceUniqueId.includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  // ── Smooth animated marker updates (SSE push → Uber-style animation) ────────
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    import("leaflet").then(({ default: L }) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      filteredVehicles.forEach((v) => {
        const details = getVehicleCombinedData(v);
        if (!v.latitude || !v.longitude) return;

        const devKey = String(v.deviceUniqueId || v.id);
        const isSelected = selectedVehicleId === v.deviceUniqueId;
        const isIgnitionOn = v.attributes?.ignition === true;
        const isMoving = v.speed > 0 || v.attributes?.motion === true;
        const speedKmh = knotsToKmh(v.speed);

        const carColor  = !isIgnitionOn ? "#ef4444" : (isMoving ? "#10b981" : "#f59e0b");
        const pingColor = !isIgnitionOn ? "border-red-500" : (isMoving ? "border-emerald-500" : "border-amber-500");
        const courseRotation = v.course || 0;

        const iconHtml = `
          <div class="relative w-12 h-12 flex items-center justify-center">
            ${isSelected ? `<div class="absolute w-[56px] h-[56px] rounded-full border-2 ${pingColor} animate-ping opacity-30 z-0"></div>` : ""}
            <div class="relative w-12 h-12 z-10 flex items-center justify-center" style="transform: rotate(${courseRotation}deg); transition: transform 1.2s ease-in-out;">
              <svg viewBox="0 0 100 100" class="w-full h-full" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.3));">
                <rect x="25" y="22" width="8"  height="16" rx="2" fill="#1e293b" />
                <rect x="67" y="22" width="8"  height="16" rx="2" fill="#1e293b" />
                <rect x="24" y="66" width="9"  height="18" rx="2" fill="#1e293b" />
                <rect x="67" y="66" width="9"  height="18" rx="2" fill="#1e293b" />
                <rect x="33" y="86" width="34" height="4"  rx="1.5" fill="#475569" />
                <path d="M 50,12 C 40,12 32,16 32,26 L 32,38 C 30,40 30,42 30,45 L 30,82 C 30,86 34,88 38,88 L 62,88 C 66,88 70,86 70,82 L 70,45 C 70,42 70,40 68,38 L 68,26 C 68,16 60,12 50,12 Z" fill="${carColor}" stroke="#1e293b" stroke-width="1.5" />
                <path d="M 36,29 C 36,27 38,26 50,26 C 62,26 64,27 64,29 L 66,36 C 66,37 65,38 64,38 L 36,38 C 35,38 34,37 34,36 Z" fill="#0f172a" />
                <path d="M 38,29 L 46,29 L 42,35 L 36,35 Z" fill="#ffffff" opacity="0.25" />
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
              ${details.plate}${details.alias}
            </div>
            <div class="absolute bottom-[48px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r ${isSelected ? "border-slate-800" : "border-slate-200"} rotate-45 z-40"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: iconHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });

        if (animMarkersRef.current[devKey]) {
          // ★ Smooth animation — only moves if GPS position actually changed
          animMarkersRef.current[devKey].animateTo(
            [v.latitude, v.longitude],
            courseRotation,
            1600
          );
          animMarkersRef.current[devKey].setIcon(customIcon);
        } else {
          const anim = createAnimatedMarker(
            L,
            [v.latitude, v.longitude],
            customIcon,
            map,
            () => setSelectedVehicleId(devKey)
          );
          animMarkersRef.current[devKey] = anim;
        }
      });

      // Remove markers for vehicles no longer in filtered list
      Object.keys(animMarkersRef.current).forEach((id) => {
        if (!filteredVehicles.some((v) => String(v.deviceUniqueId || v.id) === id)) {
          animMarkersRef.current[id].remove();
          delete animMarkersRef.current[id];
        }
      });
    });
  }, [filteredVehicles, selectedVehicleId, mapReady, pushCount]);

  // Center map on selected vehicle
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicleId) return;
    const selected = gpsData.find(v => v.deviceUniqueId === selectedVehicleId);
    if (selected && selected.latitude && selected.longitude) {
      mapInstanceRef.current.setView([selected.latitude, selected.longitude], 13);
    }
  }, [selectedVehicleId]);

  // Handle URL Query Selection — only once on first data load
  const urlSelectionApplied = useRef(false);
  useEffect(() => {
    if (urlSelectionApplied.current) return;
    if (typeof window !== "undefined" && gpsData.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const selectVehicleName = params.get("selected");
      if (selectVehicleName) {
        const found = gpsData.find(v => v.name === selectVehicleName || v.name.includes(selectVehicleName));
        if (found) {
          setSelectedVehicleId(found.deviceUniqueId);
          urlSelectionApplied.current = true;
        }
      }
    }
  }, [gpsData]);

  // (Polling removed — SSE stream above handles all updates)

  // Find currently selected vehicle object from state array
  const selectedGpsVehicle = gpsData.find(v => v.deviceUniqueId === selectedVehicleId) || null;
  
  const selectedVehicleDetails = getVehicleCombinedData(selectedGpsVehicle);

  // Dynamic Fleet KPIs
  const totalFleetDistanceMeters = gpsData.reduce((acc, v) => acc + (parseFloat(v.attributes?.todayDistance) || 0), 0);
  const totalFleetDistanceKm = metersToKm(totalFleetDistanceMeters);

  const activeCount = gpsData.filter(v => v.speed > 0 || v.attributes?.motion === true).length;
  const avgResponseMins = Math.max(12, 24 - activeCount);
  const avgResponseSecs = 15 + (gpsData.length % 45);
  const avgResponseTimeStr = `${avgResponseMins}m ${avgResponseSecs}s`;

  const getStatusColorClass = (status) => {
    switch (status) {
      case "RUNNING":
      case "MOVING": return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "IDLE": return "bg-amber-50 text-amber-600 border border-amber-100";
      case "STOPPED": return "bg-rose-50 text-rose-600 border border-rose-100";
      default: return "bg-slate-50 text-slate-500 border border-slate-200";
    }
  };

  const getStatusBulletColor = (status) => {
    switch (status) {
      case "RUNNING":
      case "MOVING": return "bg-emerald-500";
      case "IDLE": return "bg-amber-500";
      case "STOPPED": return "bg-rose-500";
      default: return "bg-slate-400";
    }
  };

  // Zoom Map controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (selectedVehicleId) {
      const selected = gpsData.find(v => v.deviceUniqueId === selectedVehicleId);
      if (selected && selected.latitude && selected.longitude) {
        mapInstanceRef.current.setView([selected.latitude, selected.longitude], 13);
        return;
      }
    }
    const validCoords = gpsData
      .filter(v => v.latitude && v.longitude)
      .map(v => [v.latitude, v.longitude]);
    if (validCoords.length > 0) {
      mapInstanceRef.current.fitBounds(validCoords, { padding: [50, 50] });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full text-[#1e293b] font-sans">
      
      {/* Page Breadcrumb Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-col">
          <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Live Tracking</h2>
          <span className="text-[11px] text-gray-400 font-bold mt-[3px] flex items-center gap-1">
            <span>Dashboard</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-slate-500">Live Tracking</span>
          </span>
        </div>

        {/* Status Filter & Vehicle Select Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter Dropdown */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3.5 bg-white border border-slate-200 rounded-xl text-[11.5px] font-extrabold text-slate-700 focus:outline-none shadow-3xs cursor-pointer hover:border-slate-300 transition"
          >
            <option value="ALL">All Status ({gpsData.length})</option>
            <option value="RUNNING">Running ({runningCount})</option>
            <option value="IDLE">Idle ({idleCount})</option>
            <option value="STOPPED">Stopped ({stoppedCount})</option>
          </select>

          {/* Vehicle Selector Dropdown */}
          <select
            value={selectedVehicleId || ""}
            onChange={(e) => {
              if (e.target.value) setSelectedVehicleId(e.target.value);
            }}
            className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-[11.5px] font-bold text-slate-700 focus:outline-none shadow-3xs cursor-pointer max-w-[200px] hover:border-slate-300 transition"
          >
            <option value="">All Vehicles ({filteredVehicles.length})</option>
            {filteredVehicles.map(v => {
              const details = getVehicleCombinedData(v);
              return (
                <option key={v.deviceUniqueId} value={v.deviceUniqueId}>
                  {details.plate} {details.alias}
                </option>
              );
            })}
          </select>

          <div className="h-9 px-3.5 bg-white border border-slate-200 rounded-xl text-[11.5px] font-bold text-gray-650 flex items-center gap-2 shadow-3xs">
            <Calendar className="w-3.5 h-3.5 text-gray-450" />
            <span>02 Jun, 2026</span>
          </div>
        </div>
      </div>

      {/* Row 1: KPI Counter Cards (Clean 1:1 mockup matching attached style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Vehicles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Active Vehicles</span>
            <span className="text-[25px] font-black text-slate-900 mt-1">{gpsData.length}</span>
            <span className="text-[10px] text-gray-450 mt-1">View on map</span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <Truck className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Distance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Total Distance</span>
            <span className="text-[25px] font-black text-slate-900 mt-1">{totalFleetDistanceKm} km</span>
            <span className="text-[10px] text-gray-450 mt-1">Today</span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <Navigation className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Average Response Time</span>
            <span className="text-[25px] font-black text-slate-900 mt-1">{avgResponseTimeStr}</span>
            <span className="text-[10px] text-gray-450 mt-1">Today</span>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Clock className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Live Updates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Live Updates</span>
            <span className="text-[25px] font-black text-slate-900 mt-1">{gpsData.length}</span>
            <span className="text-[10px] text-gray-450 mt-1">Vehicles Online</span>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
            <Radio className="w-5.5 h-5.5" />
          </div>
        </div>

      </div>

      {/* Row 2: Map Visual + Floating Right Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Map Visual (Real Leaflet Map centered on active GPS locations) */}
        <div className="flex-1 bg-[#f4f7f6] border border-slate-100 rounded-2xl min-h-[500px] relative overflow-hidden shadow-xs flex items-center justify-center">
          
          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" style={{ minHeight: "500px" }} />

          {/* Top-Left Map / Satellite toggle */}
          <div className="absolute top-4 left-4 bg-white p-1 rounded-xl shadow-xs border border-slate-150 flex items-center gap-1 z-[1000]">
            {["Map", "Satellite"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition ${
                  viewMode === mode 
                    ? "bg-slate-900 text-white shadow-2xs" 
                    : "text-gray-450 hover:text-slate-800"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Bottom-Left Status legend panel */}
          <div className="absolute bottom-4 left-4 bg-white p-4.5 rounded-xl shadow-xs border border-slate-150 flex flex-col gap-2 max-w-[150px] z-[1000]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vehicle Status</span>
            <div className="flex flex-col gap-2 text-[11px] text-gray-650 font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Running</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Idle</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Stopped</span>
              </div>
            </div>
          </div>

          {/* Bottom-Right Zoom + Target buttons */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-[1000]">
            <button 
              onClick={handleZoomIn}
              className="w-9.5 h-9.5 bg-white border border-slate-150 rounded-xl flex items-center justify-center shadow-3xs cursor-pointer text-gray-600 hover:bg-gray-50 active:scale-[0.95] transition"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={handleZoomOut}
              className="w-9.5 h-9.5 bg-white border border-slate-150 rounded-xl flex items-center justify-center shadow-3xs cursor-pointer text-gray-600 hover:bg-gray-50 active:scale-[0.95] transition"
            >
              <Minus className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={handleRecenter}
              className="w-9.5 h-9.5 bg-white border border-slate-150 rounded-xl flex items-center justify-center shadow-3xs cursor-pointer text-gray-600 hover:bg-gray-50 active:scale-[0.95] transition"
            >
              <Compass className="w-4.5 h-4.5 text-blue-500" />
            </button>
          </div>

        </div>

        {/* Right Sidebar: Selected Vehicle Details overlay block (1:1 with user's telemetry screenshot) */}
        {selectedVehicleDetails && (
          <div className="w-full lg:w-[360px] bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between shadow-xs max-h-[600px] overflow-y-auto scrollbar-none">
            
            {/* Header info */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6.5 h-6.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                      </svg>
                    </div>
                    <span className="text-[13.5px] font-black text-slate-900 leading-tight">
                      {selectedVehicleDetails.plate} {selectedVehicleDetails.alias}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVehicleId(null)}
                  className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time and location subtitle */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Current Location
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-[2.5px] bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-bold">
                    <Clock className="w-2.5 h-2.5" /> {selectedVehicleDetails.time}
                  </span>
                </div>
                <span className="text-[11.5px] font-extrabold text-slate-800 leading-tight bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                  {selectedVehicleDetails.location}
                </span>
              </div>

              {/* Stats Grid 1: 3-column Speed, Distance, Battery */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col items-center text-center">
                  <div className="w-6.5 h-6.5 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mb-1 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <span className="text-[11.5px] font-black text-slate-900 leading-none">{selectedVehicleDetails.speedKmh}</span>
                  <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Speed</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col items-center text-center">
                  <div className="w-6.5 h-6.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-1 flex-shrink-0">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] font-black text-slate-900 leading-none">{selectedVehicleDetails.todayDistanceKm}</span>
                  <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Distance</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col items-center text-center">
                  <div className="w-6.5 h-6.5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-1 flex-shrink-0">
                    <Battery className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] font-black text-slate-900 leading-none">{selectedVehicleDetails.battery}</span>
                  <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Battery</span>
                </div>
              </div>

              {/* Stats Grid 2: 2-column Total Distance & Distance from last stop */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Total Distance</span>
                  <span className="text-[12px] font-black text-slate-800 mt-0.5">{selectedVehicleDetails.totalDistanceKm}</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Dist from last stop</span>
                  <span className="text-[12px] font-black text-slate-800 mt-0.5">{selectedVehicleDetails.distFromLastStop}</span>
                </div>
              </div>

              {/* Stats Grid 3: today running, stopped, idle */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col text-center">
                  <span className="text-[10px] font-black text-slate-800">{selectedVehicleDetails.todayRunning}</span>
                  <span className="text-[7.5px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">Today Running</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col text-center">
                  <span className="text-[10px] font-black text-slate-800">{selectedVehicleDetails.todayStopped}</span>
                  <span className="text-[7.5px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">Today Stopped</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col text-center">
                  <span className="text-[10px] font-black text-slate-800">{selectedVehicleDetails.todayIdle}</span>
                  <span className="text-[7.5px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">Today Idle</span>
                </div>
              </div>

              {/* Stats Grid 4: Current Status & Max Speed */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col justify-center">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Current Status</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black mt-1 uppercase ${
                    selectedVehicleDetails.status === "RUNNING"
                      ? "text-emerald-600"
                      : selectedVehicleDetails.status === "IDLE"
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      selectedVehicleDetails.status === "RUNNING"
                        ? "bg-emerald-500 animate-pulse"
                        : selectedVehicleDetails.status === "IDLE"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-rose-500"
                    }`} />
                    {selectedVehicleDetails.status}
                  </span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Today Max Speed</span>
                  <span className="text-[12px] font-black text-slate-800 mt-0.5">{selectedVehicleDetails.maxSpeed}</span>
                </div>
              </div>

              {/* Stats Grid 5: Today Ignition on/off times */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col text-center">
                  <span className="text-[9.5px] font-black text-slate-800">{selectedVehicleDetails.todayRunning}</span>
                  <span className="text-[7.5px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">Ignition On</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col text-center">
                  <span className="text-[9.5px] font-black text-slate-800">{selectedVehicleDetails.todayStopped}</span>
                  <span className="text-[7.5px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">Ignition Off</span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2 rounded-xl flex flex-col text-center">
                  <span className="text-[9.5px] font-black text-slate-800">{selectedVehicleDetails.ignitionOffSince}</span>
                  <span className="text-[7.5px] text-gray-400 mt-0.5 font-bold uppercase tracking-tight">Ignition Off Since</span>
                </div>
              </div>

              {/* Stats Grid 6: AC Status — API returns null, show actual status */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">AC Status</span>
                  <span className="text-[10px] font-black text-slate-800 mt-0.5">
                    {selectedVehicleDetails.attributes?.ac === true ? "ON" : selectedVehicleDetails.attributes?.ac === false ? "OFF" : "N/A"}
                  </span>
                </div>
                <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Charging</span>
                  <span className={`text-[10px] font-black mt-0.5 ${selectedVehicleDetails.isCharging ? "text-emerald-600" : "text-slate-800"}`}>
                    {selectedVehicleDetails.isCharging ? "Yes (Connected)" : "No"}
                  </span>
                </div>
              </div>

              {/* Driver Assignment Block */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl mt-1">
                <div className="w-8.5 h-8.5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  {selectedVehicleDetails.driver.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-black text-slate-850 leading-tight">Driver: {selectedVehicleDetails.driver}</span>
                  <span className="text-[9.5px] text-gray-450 mt-1 flex items-center gap-1 font-bold">
                    <Phone className="w-3 h-3 text-gray-400" /> +91 {selectedVehicleDetails.phone}
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom case details link */}
            <a 
              href="/admin/cases"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl flex items-center justify-between mt-4 transition text-[12px] shadow-sm cursor-pointer group active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
                <span>Dispatch Center Cases</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </a>

          </div>
        )}

      </div>

      {/* Row 3: Active Vehicles Grid Table (Exactly matching user layout) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs flex flex-col w-full">
        <h3 className="text-[15.5px] font-black text-slate-900 pb-4 border-b border-slate-50 mb-5">Active Vehicles</h3>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="pb-3.5 px-3">Vehicle No.</th>
                <th className="pb-3.5 px-3">Driver Name</th>
                <th className="pb-3.5 px-3">Status</th>
                <th className="pb-3.5 px-3">Current Location</th>
                <th className="pb-3.5 px-3">Speed</th>
                <th className="pb-3.5 px-3">Last Update</th>
                <th className="pb-3.5 px-3">ETA</th>
                <th className="pb-3.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[12px] text-slate-700">
              {filteredVehicles.map((v) => {
                const details = getVehicleCombinedData(v);
                if (!details) return null;
                const isSelected = selectedVehicleId === v.deviceUniqueId;

                return (
                  <tr 
                    key={v.deviceUniqueId}
                    onClick={() => setSelectedVehicleId(v.deviceUniqueId)}
                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/30 font-semibold" : ""
                    }`}
                  >
                    <td className="py-4 px-3 font-extrabold text-slate-900">{details.plate}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {details.driver.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="font-semibold text-slate-800">{details.driver}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <span className={`inline-block px-2.5 py-[3px] rounded-md text-[9.5px] font-bold tracking-wide uppercase ${getStatusColorClass(details.status)}`}>
                        {details.status}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-gray-500 font-normal">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{details.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 font-bold text-slate-850">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-gray-400" />
                        <span>{details.speedKmh}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-gray-450 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{details.time}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 font-semibold text-slate-800">{details.eta}</td>
                    <td className="py-4 px-3 text-right">
                      <button 
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                          isSelected ? "bg-blue-600 border-blue-600 text-white shadow-3xs" : "bg-white border-slate-200 text-gray-400 hover:text-slate-700"
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-50 text-center">
          <span className="text-[11.5px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer">View All Vehicles</span>
        </div>
      </div>

    </div>
  );
}

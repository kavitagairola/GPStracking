"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar, 
  Truck, 
  Compass, 
  Activity, 
  Clock, 
  Navigation, 
  MapPin, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Info,
  CheckCircle
} from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

// Helper to generate a realistic route of coordinates for playback
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

const processHistoryPoints = (points) => {
  if (!points || points.length === 0) {
    return {
      route: [],
      milestones: [],
      summaryStats: {
        distance: "0.0 km",
        duration: "0m",
        maxSpeed: "0 km/h",
        avgSpeed: "0 km/h"
      }
    };
  }

  // Calculate stats
  let totalDist = 0;
  let maxSpd = 0;
  let totalSpd = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    maxSpd = Math.max(maxSpd, pt.speed || 0);
    totalSpd += pt.speed || 0;

    if (i > 0) {
      const prev = points[i - 1];
      totalDist += getHaversineDistance(prev.latitude, prev.longitude, pt.latitude, pt.longitude);
    }
  }

  const avgSpd = points.length > 0 ? Math.round(totalSpd / points.length) : 0;
  const distanceStr = totalDist.toFixed(1) + " km";
  const durationStr = `${points.length} mins`;

  // Format addresses and times
  const formattedRoute = points.map((pt, idx) => {
    const timeStr = pt.timestamp 
      ? new Date(pt.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : `${9 + Math.floor(idx/60)}:${String(idx%60).padStart(2, "0")} AM`;

    const address = pt.address || `Lat: ${pt.latitude.toFixed(5)}, Lng: ${pt.longitude.toFixed(5)}`;

    return {
      index: idx,
      latitude: pt.latitude,
      longitude: pt.longitude,
      speed: pt.speed || 0,
      course: pt.course || 0,
      ignition: pt.ignition === true,
      time: timeStr,
      address: address,
      battery: pt.battery || 75
    };
  });

  // Generate milestones dynamically
  const milestones = [];
  if (formattedRoute.length > 0) {
    milestones.push({
      time: formattedRoute[0].time,
      event: "Trip Started & Ignition ON",
      icon: Play,
      address: formattedRoute[0].address,
      type: "START",
      index: 0
    });

    // Find the max speed index
    let maxSpeedIdx = 0;
    let maxSpeedVal = 0;
    formattedRoute.forEach((pt, idx) => {
      if (pt.speed > maxSpeedVal) {
        maxSpeedVal = pt.speed;
        maxSpeedIdx = idx;
      }
    });

    if (maxSpeedIdx > 0 && maxSpeedIdx < formattedRoute.length - 1) {
      milestones.push({
        time: formattedRoute[maxSpeedIdx].time,
        event: `Max Cruise Speed (${maxSpeedVal} km/h)`,
        icon: TrendingUp,
        address: formattedRoute[maxSpeedIdx].address,
        type: "CRUISE",
        index: maxSpeedIdx
      });
    }

    // Find a stop index in the middle
    let stopIdx = -1;
    for (let i = 5; i < formattedRoute.length - 5; i++) {
      if (!formattedRoute[i].speed || formattedRoute[i].speed === 0) {
        stopIdx = i;
        break;
      }
    }

    if (stopIdx !== -1) {
      milestones.push({
        time: formattedRoute[stopIdx].time,
        event: "Stopped at Traffic / Signal",
        icon: AlertTriangle,
        address: formattedRoute[stopIdx].address,
        type: "STOP",
        index: stopIdx
      });
    }

    // Arrived at destination
    const endIdx = formattedRoute.length - 1;
    milestones.push({
      time: formattedRoute[endIdx].time,
      event: "Destination Reached (Shelter / Base)",
      icon: CheckCircle,
      address: formattedRoute[endIdx].address,
      type: "END",
      index: endIdx
    });
  }

  milestones.sort((a, b) => a.index - b.index);

  return {
    route: formattedRoute,
    milestones,
    summaryStats: {
      distance: distanceStr,
      duration: durationStr,
      maxSpeed: maxSpd + " km/h",
      avgSpeed: avgSpd + " km/h"
    }
  };
};

export default function GpsHistoryPage() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [routeData, setRouteData] = useState([]);
  const [milestones, setMilestones] = useState([]);
const [summaryStats, setSummaryStats] = useState({
  distance: "0.0 km",
  duration: "0m",
  maxSpeed: "0 km/h",
  avgSpeed: "0 km/h"
});
  const [loading, setLoading] = useState(true);

  const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");
const [historySource, setHistorySource] = useState("");

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2); // 1x, 2x, 5x, 10x
  const [currentIndex, setCurrentIndex] = useState(0);

  // Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const movingMarkerRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  // Fetch all vehicles from live API or fallback to pre-fill selector
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/gps?t=" + Date.now());
        const json = await res.json();
        if (json.success && json.data?.object) {
          const enriched = json.data.object.map(o => enrichGpsVehicle(o)).filter(Boolean);
          setVehicles(enriched);
          if (enriched.length > 0) {
            setSelectedVehicleId(enriched[0].deviceUniqueId);
          }
        }
      } catch (err) {
        console.error("Failed to load vehicle list for GPS history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Update route data when vehicle or date changes
 useEffect(() => {
  if (!selectedVehicleId) return;

  setIsPlaying(false);
  setCurrentIndex(0);
  setHistoryError("");
  setHistorySource("");
  setHistoryLoading(true);

  const loadHistory = async () => {
    try {
      const res = await fetch(
        `/api/gps/history?deviceUniqueId=${encodeURIComponent(
          selectedVehicleId
        )}&date=${encodeURIComponent(
          selectedDate
        )}&t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error || "GPS history could not be loaded."
        );
      }

      const points = Array.isArray(json.data)
        ? json.data
        : [];

      const {
        route,
        milestones,
        summaryStats,
      } = processHistoryPoints(points);

      setRouteData(route);
      setMilestones(milestones);
      setSummaryStats(summaryStats);
      setHistorySource(json.source || "");

      if (points.length === 0) {
        setHistoryError(
          "No GPS history found for this vehicle on the selected date."
        );
      }
    } catch (err) {
      console.error(
        "Failed to load vehicle history:",
        err
      );

      setRouteData([]);
      setMilestones([]);

      setSummaryStats({
        distance: "0.0 km",
        duration: "0m",
        maxSpeed: "0 km/h",
        avgSpeed: "0 km/h",
      });

      setHistoryError(
        err?.message ||
          "Unable to load GPS history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  loadHistory();
}, [selectedVehicleId, selectedDate]);

  // Leaflet Map Initialization
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      // Add Leaflet CSS dynamically if not present
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const L = (await import("leaflet")).default;
      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [28.6289, 77.3794],
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "Google Maps",
      }).addTo(map);

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync polyline path and marker position
  useEffect(() => {
    if (!mapInstanceRef.current || routeData.length === 0) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      const coordinates = routeData.map(p => L.latLng(p.latitude, p.longitude));

      // Remove existing polyline if any
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      // Draw polyline representing historical route path
      polylineRef.current = L.polyline(coordinates, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.8,
        dashArray: "10, 10"
      }).addTo(map);

      // Fit map bounds to show complete path
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });

      // Handle marker
      const activePoint = routeData[currentIndex] || routeData[0];
      if (movingMarkerRef.current) {
        movingMarkerRef.current.setLatLng([activePoint.latitude, activePoint.longitude]);
      } else {
        const customIcon = L.divIcon({
          className: "custom-gps-moving-icon",
          html: `
            <div class="relative w-10 h-10 flex items-center justify-center">
              <div class="absolute w-[44px] h-[44px] rounded-full border-2 border-blue-500 animate-ping opacity-25 z-0"></div>
              <div class="w-8 h-8 bg-blue-600 border border-white rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" class="animate-pulse">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        movingMarkerRef.current = L.marker([activePoint.latitude, activePoint.longitude], {
          icon: customIcon
        }).addTo(map);
      }
    });
  }, [routeData]);

  // Handle Marker Position Updates when currentIndex changes
  useEffect(() => {
    if (!movingMarkerRef.current || routeData.length === 0) return;
    const activePoint = routeData[currentIndex];
    if (activePoint) {
      movingMarkerRef.current.setLatLng([activePoint.latitude, activePoint.longitude]);
      
      // Keep center of the map aligned to marker if playing
      if (isPlaying && mapInstanceRef.current) {
        mapInstanceRef.current.panTo([activePoint.latitude, activePoint.longitude], { animate: true });
      }
    }
  }, [currentIndex, isPlaying]);

  // Playback timer interval
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, 1000 / playbackSpeed);
      playbackIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= routeData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, routeData]);

  const activePoint = routeData[currentIndex] || {
    speed: 0,
    course: 0,
    time: "--:--",
    address: "N/A",
    battery: 100,
    ignition: false
  };

  const selectedVehicle = vehicles.find(v => v.deviceUniqueId === selectedVehicleId);
  const vehicleNameDisplay = selectedVehicle ? selectedVehicle.name : "Ambulance";
  const driverNameDisplay = selectedVehicle ? selectedVehicle.driverName : "Unassigned";

  // Pre-calculated stats for UI metrics panel
  const totalDistanceKm = summaryStats.distance;
  const maxSpeedKmh = summaryStats.maxSpeed;
  const avgSpeedKmh = summaryStats.avgSpeed;
  const activeDuration = summaryStats.duration;

  return (
    <div className="flex flex-col gap-6 w-full text-[#1e293b] relative h-[calc(100vh-132px)]">
      
      {/* Top Filter and Select Rota Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col">
          <h3 className="text-[15.5px] font-bold text-gray-900 leading-tight">Historical Playback Console</h3>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">Reconstruct ambulance dispatches, routes, and speed data for auditing.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-bold text-gray-450 uppercase tracking-wide">Vehicle Selector</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="h-10 px-3.5 bg-gray-50 border border-slate-200 rounded-xl text-[12.5px] font-bold focus:outline-none focus:bg-white focus:border-blue-500 transition-all w-52"
            >
              {loading ? (
                <option>Loading fleet...</option>
              ) : (
                vehicles.map(v => (
                  <option key={v.deviceUniqueId} value={v.deviceUniqueId}>
                    {v.name} ({v.driverName})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-bold text-gray-450 uppercase tracking-wide">Historical Date</span>
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 pl-9 pr-4 bg-gray-50 border border-slate-200 rounded-xl text-[12.5px] font-bold focus:outline-none focus:bg-white focus:border-blue-500 transition-all w-44"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Map & Playback Controls on Left, Timeline panel on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Left Column (3/4 width): Map + Playback control bar */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-full min-h-0">
          
          {/* Leaflet Map Frame */}
          <div className="flex-1 rounded-2xl border border-slate-100 overflow-hidden relative shadow-2xs bg-slate-50 min-h-0">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Speed Floating HUD badge */}
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col gap-3 min-w-[200px]">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" /> Dispatch Telemetry HUD
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[9.5px] text-gray-450 font-bold uppercase">GPS Speed</span>
                  <span className="text-[17px] font-black text-slate-900">{activePoint.speed} km/h</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9.5px] text-gray-450 font-bold uppercase">Ignition</span>
                  <span className="text-[13px] font-extrabold mt-0.5 text-slate-800">
                    {activePoint.ignition ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2 flex flex-col">
                <span className="text-[9.5px] text-gray-450 font-bold uppercase">Current Spot</span>
                <span className="text-[11px] font-bold text-slate-700 truncate mt-0.5">{activePoint.address}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Playback controls bar */}
          <div className="bg-white px-6 py-4.5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center gap-4">
              
              {/* Play / Pause button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer active:scale-95 transition ${
                  isPlaying ? "bg-slate-800 hover:bg-slate-900" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Reset playback */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(0);
                }}
                className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition cursor-pointer"
                title="Reset to Start"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
              </button>

              {/* Current time stamp */}
              <div className="bg-slate-50 px-3.5 h-10 border border-slate-150 rounded-xl flex items-center justify-center text-[12px] font-extrabold text-slate-700">
                {activePoint.time}
              </div>

              {/* Timeline scrubber slider */}
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, routeData.length - 1)}
                  value={currentIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentIndex(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              {/* Speed selector pills */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl">
                {[1, 2, 5, 10].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                      playbackSpeed === speed
                        ? "bg-white text-slate-900 shadow-xs border border-slate-250/30"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/4 width): Historical stats & Event Timeline */}
        <div className="flex flex-col gap-6 h-full min-h-0">
          
          {/* Trip Summary statistics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-4">
            <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Trip Summary Stats</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-450 font-bold uppercase">Total Distance</span>
                <span className="text-[14.5px] font-black text-slate-800">{totalDistanceKm}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-450 font-bold uppercase">Active Run</span>
                <span className="text-[14.5px] font-black text-slate-800">{activeDuration}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-450 font-bold uppercase">Max Speed</span>
                <span className="text-[14.5px] font-black text-rose-600">{maxSpeedKmh}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-450 font-bold uppercase">Avg Speed</span>
                <span className="text-[14.5px] font-black text-slate-800">{avgSpeedKmh}</span>
              </div>
            </div>
            <div className="border-t border-slate-50 pt-3 flex flex-col gap-1">
              <span className="text-[10px] text-gray-450 font-bold uppercase">Assigned Crew</span>
              <span className="text-[12px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <div className="w-5 h-5 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-[9px] font-bold">
                  {driverNameDisplay.split(" ").map(n => n[0]).join("")}
                </div>
                {driverNameDisplay}
              </span>
            </div>
          </div>

          {/* Milestone timeline events list */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
            <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Milestones Timeline</h4>
            <div className="relative flex-1 flex flex-col gap-6 pl-1.5 mt-2">
              
              {/* Vertical line indicator */}
              <div className="absolute top-2 bottom-2 left-4.5 w-0.5 bg-slate-100 z-0"></div>

              {milestones.map((item, idx) => {
                const Icon = item.icon;
                const isActive = currentIndex >= item.index;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentIndex(item.index);
                    }}
                    className={`flex items-start gap-4.5 relative z-10 cursor-pointer group transition`}
                  >
                    <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center border transition-all ${
                      isActive 
                        ? "bg-blue-50 text-blue-600 border-blue-200 scale-105" 
                        : "bg-white text-gray-400 border-slate-150 group-hover:border-slate-350"
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className={`text-[11px] font-black transition-colors ${
                        isActive ? "text-slate-800" : "text-gray-400"
                      }`}>
                        {item.event}
                      </span>
                      <span className="text-[9.5px] text-gray-400 font-bold">{item.time}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">{item.address}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

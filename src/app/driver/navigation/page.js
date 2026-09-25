"use client";

import React, { useState, useEffect, useRef } from "react";
import { Compass, MapPin, Navigation, Phone, Heart, Clock, AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { enrichGpsVehicle } from "@/lib/gpsUtils";

export default function NavigationPage() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ driver: null, caseSpot: null });
  const tileLayerRef = useRef(null);

  const [driverName, setDriverName] = useState("Raj Kumar");
  const [driverCoords, setDriverCoords] = useState([28.58293, 77.32598]); // Noida default
  const [activeCase, setActiveCase] = useState(null);
  const [gpsData, setGpsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current logged in driver name
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDriver = localStorage.getItem("currentDriverName");
      if (savedDriver) {
        setDriverName(savedDriver);
      }
    }
  }, []);

  // Poll GPS telemetry and assigned cases
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch GPS
        const gpsRes = await fetch("/api/gps?t=" + Date.now());
        const gpsJson = await gpsRes.json();
        if (gpsJson.success && gpsJson.data?.object) {
          const allEnriched = gpsJson.data.object.map(o => enrichGpsVehicle(o)).filter(Boolean);
          const vehicle = allEnriched.find(v => v.driverName === driverName);
          if (vehicle) {
            setGpsData(vehicle);
            if (vehicle.latitude && vehicle.longitude) {
              setDriverCoords([vehicle.latitude, vehicle.longitude]);
            }
          }
        }

        // Fetch Cases to find active assigned case
        const casesRes = await fetch("/api/cases?t=" + Date.now());
        const casesJson = await casesRes.json();
        if (casesJson.success && casesJson.data) {
          const activeAssigned = casesJson.data.find(
            c => c.driver === driverName && c.status !== "Completed"
          );
          setActiveCase(activeAssigned || null);
        }
      } catch (err) {
        console.error("Navigation Poll Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [driverName]);

  // Initialize Map
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
        center: driverCoords,
        zoom: 14,
        zoomControl: false,
      });

      tileLayerRef.current = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "Google Maps",
      }).addTo(map);

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 500);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle map centering and markers update dynamically without map reconstruction
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;

      // 1. Driver Marker Update
      const isIgnitionOn = gpsData?.isIgnitionOn ?? true;
      const isMoving = (gpsData?.speedKmh ?? 0) > 0;
      const carColor = !isIgnitionOn ? "#ef4444" : (isMoving ? "#10b981" : "#f59e0b");
      const rotation = gpsData?.course ?? 0;

      const ambulanceIconHtml = `
        <div class="relative w-12 h-12 flex items-center justify-center">
          <div class="absolute w-[56px] h-[56px] rounded-full border-2 ${!isIgnitionOn ? "border-red-500" : (isMoving ? "border-emerald-500" : "border-amber-500")} animate-ping opacity-25"></div>
          
          <div class="relative w-11 h-11 transition-all duration-300">
            <svg viewBox="0 0 100 100" class="w-full h-full" style="transform: rotate(${rotation}deg); filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">
              <rect x="25" y="22" width="8" height="16" rx="2" fill="#1e293b" />
              <rect x="67" y="22" width="8" height="16" rx="2" fill="#1e293b" />
              <rect x="24" y="66" width="9" height="18" rx="2" fill="#1e293b" />
              <rect x="67" y="66" width="9" height="18" rx="2" fill="#1e293b" />
              <path d="M 50,12 C 40,12 32,16 32,26 L 32,38 L 30,45 L 30,82 C 30,86 34,88 38,88 L 62,88 C 66,88 70,86 70,82 L 70,45 L 68,38 L 68,26 C 68,16 60,12 50,12 Z" fill="${carColor}" stroke="#1e293b" stroke-width="1.5" />
              <path d="M 36,29 C 36,27 38,26 50,26 C 62,26 64,27 64,29 L 66,36 L 34,36 Z" fill="#0f172a" />
              <!-- Beacon -->
              <rect x="36" y="38" width="28" height="4" rx="1" fill="#1e293b" />
              <rect x="37" y="37.5" width="11" height="5" rx="1" fill="#3b82f6" />
              <rect x="52" y="37.5" width="11" height="5" rx="1" fill="#ef4444" />
              <!-- Cross Decal -->
              <circle cx="50" cy="62" r="10" fill="#ffffff" />
              <path d="M 50,56 L 50,68 M 44,62 L 56,62" stroke="#dc2626" stroke-width="3" />
            </svg>
          </div>
          <div class="absolute bottom-[44px] bg-slate-900 text-white font-extrabold px-1.5 py-0.5 rounded text-[8.5px] border border-slate-700 whitespace-nowrap shadow-sm">
            YOU
          </div>
        </div>
      `;

      const driverIcon = L.divIcon({
        className: "driver-nav-marker",
        html: ambulanceIconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng(driverCoords);
        markersRef.current.driver.setIcon(driverIcon);
      } else {
        markersRef.current.driver = L.marker(driverCoords, { icon: driverIcon }).addTo(map);
      }

      // 2. Case Spot Marker Update
      if (activeCase) {
        // Mock a coordinates location for case spot (slightly offset North-East for visual route simulation if not real)
        const caseLatLng = [driverCoords[0] + 0.008, driverCoords[1] + 0.009];

        const caseIconHtml = `
          <div class="relative w-9 h-9 flex items-center justify-center">
            <div class="absolute w-[44px] h-[44px] rounded-full border-2 border-rose-500 animate-ping opacity-35"></div>
            <div class="w-9 h-9 bg-rose-600 border border-white text-white rounded-full flex items-center justify-center shadow-lg font-black text-[12px] z-10 animate-bounce">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          </div>
        `;

        const caseIcon = L.divIcon({
          className: "case-nav-marker",
          html: caseIconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        if (markersRef.current.caseSpot) {
          markersRef.current.caseSpot.setLatLng(caseLatLng);
          markersRef.current.caseSpot.setIcon(caseIcon);
        } else {
          markersRef.current.caseSpot = L.marker(caseLatLng, { icon: caseIcon })
            .addTo(map)
            .bindPopup(`<b>Rescue Case:</b> ${activeCase.id}<br/><b>Animal:</b> ${activeCase.animal}<br/><b>Spot:</b> ${activeCase.location}`);
        }

        // Fit map bounds to show both driver and rescue spot
        const bounds = L.latLngBounds([driverCoords, caseLatLng]);
        map.fitBounds(bounds, { padding: [60, 60] });
      } else {
        // If no active case, remove case spot marker if exists
        if (markersRef.current.caseSpot) {
          map.removeLayer(markersRef.current.caseSpot);
          markersRef.current.caseSpot = null;
        }
        map.setView(driverCoords, 14);
      }
    });
  }, [driverCoords, activeCase, gpsData]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-190px)] min-h-[500px]">
      {/* Route & Case Details Panel */}
      <div className="w-full lg:w-[360px] bg-white border border-slate-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-5 overflow-y-auto flex-shrink-0">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[14.5px] font-black text-gray-800 leading-tight">Live Route Navigation</h3>
            <p className="text-[11.5px] text-gray-400 mt-1 font-bold">Real-time driver location stream</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-7 h-7 border-3 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
            <span className="text-[11.5px] font-bold text-gray-400">Loading Navigation System...</span>
          </div>
        ) : activeCase ? (
          <div className="flex flex-col gap-4">
            {/* Active Case Info */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-black text-orange-700 uppercase tracking-wide">Target Rescue Mission</span>
                <span className="px-2 py-0.5 text-[8.5px] font-black uppercase bg-orange-600 text-white rounded-full">
                  {activeCase.status}
                </span>
              </div>
              <h4 className="text-[13px] font-black text-slate-800 leading-none mt-1">{activeCase.id}</h4>
              <p className="text-[12px] font-bold text-slate-700 leading-tight flex items-start gap-1 mt-1">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>Spot: {activeCase.location}</span>
              </p>
              <div className="text-[11.5px] text-slate-500 font-medium leading-relaxed bg-white border border-slate-100 p-2.5 rounded-xl mt-1">
                <span className="font-bold text-slate-700">{activeCase.animal}: </span> {activeCase.condition}
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-1 pt-1.5 border-t border-orange-100/50">
                <span>Reporter: {activeCase.caller}</span>
                <a href={`tel:${activeCase.phone}`} className="text-orange-600 flex items-center gap-1 font-black">
                  <Phone className="w-3 h-3" /> Call
                </a>
              </div>
            </div>

            {/* Navigation Turns */}
            <div className="flex flex-col gap-3">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Turn-by-turn guidance</h5>
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10.5px] text-slate-500 flex-shrink-0">1</div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700">Proceed East toward {activeCase.location.split(",")[0]}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">850 m • Straight</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10.5px] text-slate-500 flex-shrink-0">2</div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700">Turn left exit for nearest bypass expressway</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">1.4 km • In 3 minutes</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10.5px] text-slate-500 flex-shrink-0">3</div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700">Reach animal spot: {activeCase.location}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Destination on the left</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Shield className="w-10 h-10 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-700">No active rescue tasks</span>
              <span className="text-[11px] text-gray-400 mt-1 max-w-[200px]">You are currently standby. Wait for dispatch assignment from telecallers.</span>
            </div>
          </div>
        )}
      </div>

      {/* Map View */}
      <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-3xs relative min-h-[350px]">
        <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-0" />
      </div>
    </div>
  );
}

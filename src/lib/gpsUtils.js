// Shared GPS telemetry utilities used across all CRM pages
// This module provides a single source of truth for:
// - Driver-to-vehicle mapping
// - Battery voltage → percentage conversion
// - Speed unit conversion (knots → km/h)
// - Distance formatting (meters → km)
// - Dynamic status computation from GPS attributes

// Master driver registry — index maps to ambulance number (A-1 = index 1, etc.)
export const DRIVERS_LIST = [
  { name: "Raj Kumar", phone: "9876543210" },       // A-1
  { name: "Manoj Yadav", phone: "9876543211" },      // A-2
  { name: "Pawan Singh", phone: "9876543212" },      // A-3
  { name: "Amit Verma", phone: "9876543213" },       // A-4
  { name: "Suresh Pal", phone: "9876543214" },       // A-5
  { name: "Deepak Tyagi", phone: "9876543215" },     // A-6
  { name: "Mohit Sharma", phone: "9876543217" },     // A-7
  { name: "Vikash Chaudhary", phone: "9876543216" }, // A-8
  { name: "Karan Singh", phone: "9876543218" },      // A-9
  { name: "Jatin Sharma", phone: "9876543219" },     // A-10
  { name: "Rohan Gupta", phone: "9876543220" },      // A-11
  { name: "Sanjay Dutta", phone: "9876543221" },     // A-12
  { name: "Aman Preet", phone: "9876543222" },       // A-13
  { name: "Vijay Kumar", phone: "9876543223" },      // A-14
  { name: "Rahul Verma", phone: "9876543224" },      // A-15
  { name: "Abhishek Pal", phone: "9876543225" },     // A-16
];

export function getDriverForVehicleIndex(idx) {
  if (!idx || idx < 1) return { name: "Raj Kumar", phone: "9876543210" };
  const adjustedIdx = (idx - 1) % DRIVERS_LIST.length;
  return DRIVERS_LIST[adjustedIdx] || { name: "Raj Kumar", phone: "9876543210" };
}

/**
 * Parse ambulance number from GPS device name.
 * Handles formats like:
 *   "HR55AK7159 (A-9)" → 9
 *   "HR63E0663 (A-10)" → 10
 *   "HR63E8418 ( A-11)" → 11  (space before A)
 *   "HR63F5749 (G-8)" → 8   (Gokul Dham naming)
 *   "HR63F9657 (G-12)" → 12  (Gokul Dham naming)
 *   "VEHICLE NUMBER 5" → 5
 */
export function parseAmbulanceNumber(gpsName) {
  if (!gpsName) return null;
  // Try to find (A-N) or (A - N) pattern first
  const aMatch = gpsName.match(/\([A-Z]\s*-\s*(\d+)\)/i);
  if (aMatch) return parseInt(aMatch[1], 10);
  // Fallback for "VEHICLE NUMBER N"
  const vMatch = gpsName.match(/VEHICLE\s+NUMBER\s+(\d+)/i);
  if (vMatch) return parseInt(vMatch[1], 10);
  // Last resort: last number in the string
  const nums = gpsName.match(/\d+/g);
  if (nums && nums.length > 0) return parseInt(nums[nums.length - 1], 10);
  return null;
}

/**
 * Extract the plate number from GPS name (everything before the parenthesis).
 * "HR55AK7159 (A-9)" → "HR55AK7159"
 * "HR63F5749 (G-8)" → "HR63F5749"
 */
export function parsePlateNumber(gpsName) {
  if (!gpsName) return "Unknown";
  if (gpsName.includes("(")) {
    return gpsName.split("(")[0].trim();
  }
  return gpsName.trim();
}

/**
 * Extract the alias string like "(A-9)" or "(G-8)" from GPS name.
 */
export function parseAlias(gpsName) {
  if (!gpsName) return "";
  const match = gpsName.match(/\([A-Z]\s*-\s*\d+\)/i);
  return match ? match[0] : "";
}

/**
 * Convert GPS batteryLevel to display percentage.
 * API returns millivolts for most devices (e.g. 4000 = 4.0V = full).
 * Some devices report actual percentage (0-100 range).
 * 
 * For mV values: 3500mV = 0%, 4200mV = 100% (LiPo battery curve)
 */
export function formatBatteryPercent(batteryLevel) {
  if (batteryLevel === null || batteryLevel === undefined) return null;
  
  // If value is already a sane percentage (0-100), return as-is
  if (batteryLevel >= 0 && batteryLevel <= 100) {
    return Math.round(batteryLevel);
  }
  
  // millivolts → percentage conversion (LiPo: 3500mV empty, 4200mV full)
  const minMv = 3500;
  const maxMv = 4200;
  const pct = ((batteryLevel - minMv) / (maxMv - minMv)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/**
 * Convert speed from knots to km/h (1 knot = 1.852 km/h).
 * Handles raw speed numbers safely.
 */
export function knotsToKmh(speed) {
  if (!speed || speed <= 0) return 0;
  // Millitrack / Traccar API returns speed in knots (1 knot = 1.852 km/h)
  // If speed is already > 100, assume it's already in km/h or m/s
  const kmh = speed > 100 ? speed : speed * 1.852;
  return parseFloat(kmh.toFixed(1));
}

/**
 * Convert meters to km, formatted with 2 decimal places.
 */
export function metersToKm(meters) {
  if (!meters || meters <= 0) return "0.00";
  return (meters / 1000).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Compute vehicle status from ignition and motion attributes.
 * Returns: "RUNNING" | "IDLE" | "STOPPED"
 */
export function computeVehicleStatus(attributes, speed) {
  const isIgnitionOn = attributes?.ignition === true;
  const isMoving = speed > 0 || attributes?.motion === true;
  if (!isIgnitionOn) return "STOPPED";
  return isMoving ? "RUNNING" : "IDLE";
}

/**
 * Format GPS address — use the API-provided address if available,
 * otherwise use a minimal coordinate-based fallback.
 */
export function formatAddress(gpsItem) {
  // The API provides an `address` field for some devices
  if (gpsItem.address && gpsItem.address.trim() && gpsItem.address !== "null") {
    return gpsItem.address;
  }
  if (!gpsItem.latitude || !gpsItem.longitude) return "Location unavailable";
  return `${gpsItem.latitude.toFixed(5)}, ${gpsItem.longitude.toFixed(5)}`;
}

/**
 * Calculate "time ago" from a server timestamp.
 */
export function timeAgo(serverTime) {
  if (!serverTime) return "N/A";
  const diff = Date.now() - new Date(serverTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Build a fully enriched vehicle object from a raw GPS API item.
 * This is the single transformation used across ALL pages.
 */
export function enrichGpsVehicle(gpsItem) {
  if (!gpsItem) return null;

  const num = parseAmbulanceNumber(gpsItem.name);
  // For display: use parsed num if available, else use device id as fallback index
  const displayNum = num || (gpsItem.id ? (gpsItem.id % 100) : null);
  const plate = parsePlateNumber(gpsItem.name);
  const alias = parseAlias(gpsItem.name);
  // Assign driver by parsed number; if no number, use device id-based assignment
  const driverIdx = num || (gpsItem.id ? (gpsItem.id % DRIVERS_LIST.length) + 1 : null);
  const driver = driverIdx ? getDriverForVehicleIndex(driverIdx) : { name: "Unassigned", phone: "-" };
  const isIgnitionOn = gpsItem.attributes?.ignition === true;

  // Extract raw speed (top-level or from attributes)
  let rawSpeed = gpsItem.speed !== undefined && gpsItem.speed !== null 
    ? gpsItem.speed 
    : (gpsItem.attributes?.speed || 0);


  const speedKmh = knotsToKmh(rawSpeed);
  const status = computeVehicleStatus(gpsItem.attributes, speedKmh);
  const batteryPct = formatBatteryPercent(gpsItem.attributes?.batteryLevel);
  const totalDistKm = metersToKm(gpsItem.attributes?.totalDistance);
  const todayDistKm = metersToKm(gpsItem.attributes?.todayDistance);
  const address = formatAddress(gpsItem);
  const lastUpdate = timeAgo(gpsItem.serverTime);

  const formattedTime = gpsItem.serverTime
    ? new Date(gpsItem.serverTime).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) +
      ", " +
      new Date(gpsItem.serverTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "N/A";

  return {
    // Raw GPS fields preserved
    ...gpsItem,
    // Enriched fields
    num: displayNum,
    plate,
    alias,
    driverName: driver.name,
    driverPhone: driver.phone,
    status,
    speedKmh,
    speedDisplay: speedKmh > 0 ? `${speedKmh.toFixed(1)} km/h` : "0.0 km/h",
    batteryPct,
    batteryDisplay: batteryPct !== null ? batteryPct + "%" : "N/A",
    totalDistKm,
    totalDistDisplay: totalDistKm + " km",
    todayDistKm,
    todayDistDisplay: todayDistKm + " km",
    address,
    lastUpdate,
    formattedTime,
    isIgnitionOn,
    isCharging: gpsItem.attributes?.charge === true,
    course: gpsItem.course || 0,
  };
}

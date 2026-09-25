// Test diverse stat generation for all 8 real vehicles from Millitrack
const vehicles = [
  { name: "HR63E0663 (A-10)", deviceUniqueId: "356218601492919", latitude: 28.712842, longitude: 77.002565 },
  { name: "HR63E8418 ( A-11)", deviceUniqueId: "356218601493206", latitude: 28.665733, longitude: 76.781608 },
  { name: "HR63E2063 (A-12)", deviceUniqueId: "869727071505265", latitude: 28.583062, longitude: 76.675434 },
  { name: "HR63E7203 (A-7)",  deviceUniqueId: "865167042495300", latitude: 28.583043, longitude: 76.675447 },
  { name: "HR63E7962 (A-3)",  deviceUniqueId: "356218600789588", latitude: 29.720690, longitude: 76.490111 },
  { name: "HR63D3359 (A-1)",  deviceUniqueId: "356218600789653", latitude: 28.582298, longitude: 76.676351 },
  { name: "HR63E1145 (A-4)",  deviceUniqueId: "356218600789703", latitude: 28.312533, longitude: 78.928473 },
  { name: "HR55AK7159 (A-9)", deviceUniqueId: "356218600789562", latitude: 28.879228, longitude: 76.899863 },
];

console.log("\n=== EXPECTED DIVERSE STATS PER VEHICLE ===\n");

vehicles.forEach(v => {
  const digits = v.deviceUniqueId.replace(/\D/g, "");
  const lastDigit = parseInt(digits.slice(-1), 10);
  const secondLastDigit = digits.length > 1 ? parseInt(digits.slice(-2, -1), 10) : 3;
  
  const pointsCount = 30 + (lastDigit * 6) + (secondLastDigit * 2); // trip minutes
  const scaleFactor = 0.03 + (lastDigit * 0.01) + (secondLastDigit * 0.005);
  const maxCruiseSpeed = 35 + (lastDigit * 4) + (secondLastDigit * 2);
  const shapeType = (lastDigit + secondLastDigit) % 4;
  const shapeNames = ["S-Curve", "L-Shape", "Circular Arc", "Linear Diagonal"];

  // Rough distance estimate from scale factor
  const distKm = (scaleFactor * 111).toFixed(1); // 1 degree lat ≈ 111 km

  console.log(`${v.name} (${v.deviceUniqueId})`);
  console.log(`  Trip Duration : ~${pointsCount} mins`);
  console.log(`  Route Scale   : ${scaleFactor.toFixed(3)} degrees ≈ ${distKm} km range`);
  console.log(`  Max Speed     : ${maxCruiseSpeed} km/h`);
  console.log(`  Trajectory    : ${shapeNames[shapeType]}`);
  console.log(`  Start Coords  : ${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}`);
  console.log();
});

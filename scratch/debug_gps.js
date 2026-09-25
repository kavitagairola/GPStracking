async function debugGps() {
  const res = await fetch("http://localhost:3000/api/gps");
  const json = await res.json();
  const objects = json.data?.object || [];
  console.log("Total objects:", objects.length);
  
  const validCoords = objects.filter(o => o.latitude && o.longitude && o.latitude !== 0 && o.longitude !== 0);
  console.log("Objects with non-zero lat/lng:", validCoords.length);
  
  const zeroCoords = objects.filter(o => !o.latitude || !o.longitude || o.latitude === 0 || o.longitude === 0);
  console.log("Objects with 0 lat/lng:", zeroCoords.length);
  
  if (validCoords.length > 0) {
    console.log("Sample valid object:", validCoords[0]);
  }
  if (zeroCoords.length > 0) {
    console.log("Sample zero object:", zeroCoords[0].name);
  }
}

debugGps();

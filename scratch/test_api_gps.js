async function testApiGps() {
  const res = await fetch("http://localhost:3000/api/gps");
  const json = await res.json();
  console.log("API Success:", json.success);
  console.log("Simulated?:", json.simulated || false);
  console.log("Total objects returned:", json.data?.object?.length);
  if (json.data?.object?.length > 0) {
    console.log("Sample 3 objects:", json.data.object.slice(0, 3).map(o => ({
      name: o.name,
      lat: o.latitude,
      lng: o.longitude,
      speed: o.speed
    })));
  }
}

testApiGps();

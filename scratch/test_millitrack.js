async function testRealPositions() {
  const authHeader = "Basic " + Buffer.from("gokulk01:123456").toString("base64");
  const headers = { "Authorization": authHeader };

  const [devRes, posRes] = await Promise.all([
    fetch("http://track2.millitrack.com/api/devices", { headers }),
    fetch("http://track2.millitrack.com/api/positions", { headers })
  ]);

  const devices = await devRes.json();
  const positions = await posRes.json();

  console.log("Devices count:", devices.length);
  console.log("Positions count:", positions.length);

  const samplePositions = positions.slice(0, 5);
  console.log("Sample positions:", samplePositions.map(p => ({
    deviceId: p.deviceId,
    lat: p.latitude,
    lng: p.longitude,
    speed: p.speed,
    ignition: p.attributes?.ignition
  })));
}

testRealPositions();

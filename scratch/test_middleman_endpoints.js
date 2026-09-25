const http = require('http');

const accessToken = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnpkV0lpT2lJek16WTVNU0lzSW1semN5STZJbWR3Y3kxMGNtRmphMlZ5SWl3aWFXRjBJam94Tnpnd05qVTJPREF6ZlEuLWhqVzNXNFZuRHZNUXBaaXRwMGoyVzk2dFNWTWctb1o0V0VHRmNvb1JwZw==";
const deviceUniqueId = "356218600789562";

const endpoints = [
  "getHistoryData",
  "getDeviceHistoryData",
  "getDeviceTrack",
  "getTrack",
  "getTrip",
  "getTrips",
  "getDeviceTrips",
  "getReports",
  "getReport",
  "getPlayback",
  "getDevicePlayback",
  "getLocations",
  "getRoutes",
  "getPositionHistory",
  "getDevicePositions"
];

async function probe() {
  for (const endpoint of endpoints) {
    const url = `http://track2.millitrack.com/api/middleMan/${endpoint}?accessToken=${accessToken}&deviceUniqueId=${deviceUniqueId}&from=2026-07-15T00:00:00.000Z&to=2026-07-16T23:59:59.000Z`;
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(url, (response) => {
          let body = '';
          response.on('data', (chunk) => body += chunk);
          response.on('end', () => resolve({ statusCode: response.statusCode, body }));
        }).on('error', reject);
      });
      console.log(`Endpoint: ${endpoint} | Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log(`FOUND! Response:`, res.body.substring(0, 300));
      }
    } catch (e) {
      console.log(`Error ${endpoint}:`, e.message);
    }
  }
}

probe();

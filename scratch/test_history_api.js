const http = require('http');

const accessToken = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnpkV0lpT2lJek16WTVNU0lzSW1semN5STZJbWR3Y3kxMGNtRmphMlZ5SWl3aWFXRjBJam94Tnpnd05qVTJPREF6ZlEuLWhqVzNXNFZuRHZNUXBaaXRwMGoyVzk2dFNWTWctb1o0V0VHRmNvb1JwZw==";

const testEndpoints = [
  "getDeviceHistory",
  "getDeviceRoute",
  "getRoute",
  "getHistory",
  "getRouteHistory",
  "getPositions",
  "getTelemetryHistory"
];

// Let's try testing with a specific deviceUniqueId
const deviceUniqueId = "356218600789701"; // Ambulance 1 UniqueId
const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
const to = new Date().toISOString();

async function test() {
  for (const endpoint of testEndpoints) {
    const url = `http://track2.millitrack.com/api/middleMan/${endpoint}?accessToken=${accessToken}&deviceUniqueId=${deviceUniqueId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    console.log(`Testing: ${url}`);
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(url, (response) => {
          let body = '';
          response.on('data', (chunk) => body += chunk);
          response.on('end', () => resolve({ statusCode: response.statusCode, body }));
        }).on('error', reject);
      });
      console.log(`Endpoint: ${endpoint} | Status: ${res.statusCode} | Length: ${res.body.length}`);
      if (res.statusCode === 200) {
        console.log(`Response snippet for ${endpoint}:`, res.body.substring(0, 500));
      }
    } catch (err) {
      console.error(`Error testing ${endpoint}:`, err.message);
    }
  }
}

test();

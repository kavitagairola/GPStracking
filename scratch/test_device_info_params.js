const http = require('http');

const accessToken = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnpkV0lpT2lJek16WTVNU0lzSW1semN5STZJbWR3Y3kxMGNtRmphMlZ5SWl3aWFXRjBJam94Tnpnd05qVTJPREF6ZlEuLWhqVzNXNFZuRHZNUXBaaXRwMGoyVzk2dFNWTWctb1o0V0VHRmNvb1JwZw==";
const deviceUniqueId = "356218600789562"; // Vehicle A-9 (active/ignition true)

// Try different history-related parameters on getDeviceInfo
const testCases = [
  { deviceUniqueId },
  { deviceUniqueId, from: "2026-07-15T00:00:00.000Z", to: "2026-07-16T23:59:59.000Z" },
  { deviceUniqueId, startTime: "2026-07-15 00:00:00", endTime: "2026-07-16 23:59:59" },
  { deviceUniqueId, date: "2026-07-16" },
  { deviceUniqueId, limit: 100 }
];

async function run() {
  for (let i = 0; i < testCases.length; i++) {
    const params = testCases[i];
    const queryStr = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    
    const url = `http://track2.millitrack.com/api/middleMan/getDeviceInfo?accessToken=${accessToken}&${queryStr}`;
    console.log(`Test Case ${i + 1}: ${url}`);

    try {
      const res = await new Promise((resolve, reject) => {
        http.get(url, (response) => {
          let body = '';
          response.on('data', (chunk) => body += chunk);
          response.on('end', () => resolve({ statusCode: response.statusCode, body }));
        }).on('error', reject);
      });

      console.log(`Status: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(res.body);
        console.log(`Is Array? ${Array.isArray(parsed.object)} | Keys: ${Object.keys(parsed)}`);
        if (Array.isArray(parsed.object)) {
          console.log(`Array length: ${parsed.object.length}`);
          if (parsed.object.length > 0) {
            console.log(`Sample object keys:`, Object.keys(parsed.object[0]));
          }
        } else if (parsed.object) {
          console.log(`Single object keys:`, Object.keys(parsed.object));
          // Check if object has multiple points or track
          if (parsed.object.points || parsed.object.history || parsed.object.positions) {
            console.log(`Found points/history/positions!`);
          }
        }
      } catch (e) {
        console.log("Response is not JSON. Snippet:", res.body.substring(0, 200));
      }
      console.log("-".repeat(50));
    } catch (err) {
      console.error("Error:", err.message);
    }
  }
}

run();

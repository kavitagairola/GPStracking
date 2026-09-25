const http = require('http');

const token = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnpkV0lpT2lJek16WTVNU0lzSW1semN5STZJbWR3Y3kxMGNtRmphMlZ5SWl3aWFXRjBJam94Tnpnd05qVTJPREF6ZlEuLWhqVzNXNFZuRHZNUXBaaXRwMGoyVzk2dFNWTWctb1o0V0VHRmNvb1JwZw==";

const testCases = [
  // 1. Bearer token headers
  { path: "/api/devices", headers: { "Authorization": `Bearer ${token}` } },
  { path: "/api/positions", headers: { "Authorization": `Bearer ${token}` } },
  { path: "/api/reports/route?deviceId=33691&from=2026-07-15T00:00:00Z&to=2026-07-16T23:59:59Z", headers: { "Authorization": `Bearer ${token}` } },
  
  // 2. Query param token
  { path: `/api/devices?token=${token}`, headers: {} },
  { path: `/api/positions?token=${token}`, headers: {} },
  { path: `/api/reports/route?token=${token}&deviceId=33691&from=2026-07-15T00:00:00Z&to=2026-07-16T23:59:59Z`, headers: {} },
  
  // 3. Middleman getDeviceInfo with deviceUniqueId
  { path: `/api/middleMan/getDeviceInfo?accessToken=${token}&deviceUniqueId=356218600789562`, headers: {} }
];

async function run() {
  for (const tc of testCases) {
    const options = {
      hostname: "track2.millitrack.com",
      path: tc.path,
      headers: {
        "Accept": "application/json",
        ...tc.headers
      }
    };
    
    console.log(`Testing path: ${tc.path} | Headers: ${JSON.stringify(tc.headers)}`);
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(options, (response) => {
          let body = '';
          response.on('data', (chunk) => body += chunk);
          response.on('end', () => resolve({ statusCode: response.statusCode, body }));
        }).on('error', reject);
      });

      console.log(`Status: ${res.statusCode} | Length: ${res.body.length}`);
      if (res.statusCode === 200) {
        console.log(`Snippet:`, res.body.substring(0, 300));
      }
      console.log("-".repeat(50));
    } catch (err) {
      console.error("Error:", err.message);
    }
  }
}

run();

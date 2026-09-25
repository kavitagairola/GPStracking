const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'gps_history.json');
if (fs.existsSync(filePath)) {
  fs.unlinkSync(filePath);
  console.log("Cleared old gps_history.json to enforce diverse trajectory generation!");
} else {
  console.log("gps_history.json did not exist, no action needed.");
}

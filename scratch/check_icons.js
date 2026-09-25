const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
  });
  return results;
}

const files = walk('./src');
let errors = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.includes('lucide-react')) return;
  const match = content.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/s);
  if (!match) return;
  const imported = match[1].split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  
  // Find components used in JSX
  const matches = content.matchAll(/<([A-Z][a-zA-Z0-9]+)\b/g);
  for (const m of matches) {
    const name = m[1];
    const ignoreList = ['React', 'Fragment', 'PwaInstallPrompt', 'CaseCard', 'Link', 'Image', 'ReportsPage', 'DriverDashboard', 'CompletedCasesPage'];
    if (!imported.includes(name) && !ignoreList.includes(name)) {
      errors.push({ file: f, missing: name });
    }
  }
});
console.log('SCAN RESULT:', JSON.stringify(errors, null, 2));

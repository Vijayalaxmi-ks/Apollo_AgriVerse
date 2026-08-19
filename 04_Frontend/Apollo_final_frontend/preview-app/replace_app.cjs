const fs = require('fs');
const content = fs.readFileSync('E:/Apollo_AgriVerse/preview-app/src/App.tsx', 'utf8');
const startIdx = content.indexOf('const MainDashboard = () => (');
const endIdx = content.indexOf('\nconst SIDEBAR_ITEMS = [');
if (startIdx !== -1 && endIdx !== -1) {
  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx);
  const finalContent = 'import MainDashboard from "./MainDashboard";\n' + before + after;
  fs.writeFileSync('E:/Apollo_AgriVerse/preview-app/src/App.tsx', finalContent);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find boundaries");
}

// Builds the owner-facing packages page: inlines the Raynor logo from planner-ui.js into owner-packages-src.html.
const fs = require('fs'), path = require('path');
const ui = fs.readFileSync(path.join(__dirname, 'planner-ui.js'), 'utf8');
const logo = ui.match(/var LOGO = "([^"]+)"/)[1];
const src = fs.readFileSync(path.join(__dirname, 'owner-packages-src.html'), 'utf8');
const out = process.argv[2] || path.join(__dirname, 'owner-packages.html');
fs.writeFileSync(out, src.replace('__LOGO__', logo));
console.log('built', out, fs.statSync(out).size, 'bytes');

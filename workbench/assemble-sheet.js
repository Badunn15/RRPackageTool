// Builds sheet-ui.js from the Planner's shared pieces (controls, details panels, field help) plus sheet-main.js.
// Run before: node build-workbench.js ../data/seed-model.json sheet-shell.html sheet-ui.js package-margin-sheet.html
const fs = require('fs');
const src = fs.readFileSync('planner-ui.js', 'utf8');
function slice(from, to) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  if (a < 0 || b < 0) throw new Error('marker not found: ' + (a < 0 ? from : to));
  return src.slice(a, b);
}
const head = src.slice(0, src.indexOf('  /* ------------------------------ rail'));
const inspectors = slice('  /* ------------------------------ inspector', '  function Inspector(props)') +
  slice('  function toggleCk(', '  function Summary(props)');
const fields = slice('  var FIELD_GROUPS = [', '  function Portfolio(props)');
const words = [
  ['Portfolio → Model settings', 'Business numbers → Model settings'],
  ['court fees <span class="faint">(Portfolio)</span>', 'court fees <span class="faint">(Business numbers)</span>'],
  ['billed to the owner under Add-on fees.', 'billed to the owner under Fees billed to the owner.'],
  ['Flagged \\"check unit\\" on the Services page.', 'Flagged \\"check unit\\" in What each package includes.'],
  ['Court fees, set on the Portfolio page', 'Court fees, set in Business numbers'],
  ['(Costs) and Eviction service (Services) checkboxes', 'and Eviction service checkboxes'],
];
let out = head + inspectors + fields + fs.readFileSync('sheet-main.js', 'utf8');
for (const [a, b] of words) out = out.split(a).join(b);
fs.writeFileSync('sheet-ui.js', out);
console.log('assembled sheet-ui.js', out.length, 'chars');

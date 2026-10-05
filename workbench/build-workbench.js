const fs = require('fs');
// node build-workbench.js <seed.json> [shell.html ui.js out.html]
// Defaults build the Workbench; pass planner-shell.html planner-ui.js package-margin-planner.html for the Planner.
const [seedPath, shellPath = 'workbench-shell.html', uiPath = 'workbench-ui.js', outPath = 'package-margin-workbench.html'] = process.argv.slice(2);
const shell = fs.readFileSync(shellPath, 'utf8');
const engine = fs.readFileSync('workbench-engine.js', 'utf8');
let ui = fs.readFileSync(uiPath, 'utf8');
ui = ui.replace(/(\s)class=/g, (m, s) => s + 'className=').replace(/(\s)for=\$\{/g, (m, s) => s + 'htmlFor=${').replace(/(\s)for="/g, (m, s) => s + 'htmlFor="');
const seed = JSON.stringify(JSON.parse(fs.readFileSync(seedPath, 'utf8')));
const out = shell
  .replace('/*__ENGINE__*/', () => engine)
  .replace('/*__SEED__*/', () => seed)
  .replace('/*__UI__*/', () => ui);
fs.writeFileSync(outPath, out);
console.log('built', outPath, out.length, 'bytes');

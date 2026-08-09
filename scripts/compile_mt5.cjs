const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appData = process.env.APPDATA || '';
if (!appData) {
  console.error('APPDATA not defined');
  process.exit(1);
}

const mtBase = path.join(appData, 'MetaQuotes', 'Terminal');
const sourceFile = path.resolve(__dirname, '..', 'MQL5', 'JournalSync.mq5');
const logFile = path.resolve(__dirname, '..', 'compile.log');

const metaEditorPaths = [
  'C:\\Program Files\\MetaTrader 5 EXNESS\\metaeditor64.exe',
  'C:\\Program Files\\MetaTrader 5\\metaeditor64.exe'
];

let metaEditor = metaEditorPaths.find(p => fs.existsSync(p));

console.log('Using MetaEditor:', metaEditor);
console.log('Source file:', sourceFile);

if (!fs.existsSync(mtBase)) {
  console.log('No MetaQuotes Terminal found in AppData.');
  process.exit(0);
}

const dirs = fs.readdirSync(mtBase);
let count = 0;

for (const d of dirs) {
  const expertDir = path.join(mtBase, d, 'MQL5', 'Experts');
  if (fs.existsSync(expertDir)) {
    const dest = path.join(expertDir, 'JournalSync.mq5');
    fs.copyFileSync(sourceFile, dest);
    console.log(`[+] Copied JournalSync.mq5 to: ${d}`);

    if (metaEditor) {
      try {
        console.log(`[*] Compiling in: ${d}...`);
        execSync(`"${metaEditor}" /compile:"${dest}" /log:"${logFile}"`);
        const ex5Path = path.join(expertDir, 'JournalSync.ex5');
        if (fs.existsSync(ex5Path)) {
          console.log(`[SUCCESS] Compiled JournalSync.ex5 created in ${d}!`);
        }
      } catch (err) {
        console.error(`[!] Compile error in ${d}:`, err.message);
      }
    }
    count++;
  }
}

console.log(`Done! Updated ${count} MT5 terminals.`);

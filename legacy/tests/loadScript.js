/**
 * Helper to load browser script files into the Jest test environment.
 * Simulates <script> tag loading by executing the file content
 * in the global scope so function declarations become global.
 */
const fs = require('fs');
const path = require('path');

function loadScript(filePath) {
  const absPath = path.resolve(filePath);
  const code = fs.readFileSync(absPath, 'utf8');
  // Use indirect eval to execute in global scope
  const globalEval = eval;
  globalEval(code);
}

module.exports = loadScript;

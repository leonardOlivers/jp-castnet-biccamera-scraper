onst levels = ['error', 'warn', 'info', 'debug'];
let current = 'info';

function setLevel(lvl) {
  if (levels.includes(lvl)) current = lvl;
}

function ts() {
  return new Date().toISOString();
}

function logAt(lvl, args) {
  if (levels.indexOf(lvl) <= levels.indexOf(current)) {
    const prefix = `[${ts()}] [${lvl.toUpperCase()}]`;
    // eslint-disable-next-line no-console
    console[lvl === 'debug' ? 'log' : lvl](prefix, ...args);
  }
}

module.exports = {
  setLevel,
  error: (...a) => logAt('error', a),
  warn: (...a) => logAt('warn', a),
  info: (...a) => logAt('info', a),
  debug: (...a) => logAt('debug', a)
};
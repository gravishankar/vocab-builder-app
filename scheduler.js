// scheduler.js
const DAY_MS = 24*60*60*1000;
const INTERVALS = [7, 14, 28]; // days

function ensureFirstSeen(word) {
  const key = `vb.firstSeen.${word}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, Date.now().toString());
  }
}

function isDue(word) {
  const key = `vb.firstSeen.${word}`;
  const ts  = parseInt(localStorage.getItem(key) || '0', 10);
  if (!ts) return false;
  const days = Math.floor((Date.now() - ts)/DAY_MS);
  // due around those windows (±1–2 days tolerance)
  if ((days >= 6 && days <= 9) || (days >= 13 && days <= 16) || (days >= 27)) return true;
  return false;
}

function dueWordsInCurrentSet() {
  return (window.wordList || []).filter(w => isDue(w.word));
}

function updateDueCountBadge() {
  const due = dueWordsInCurrentSet();
  const el = document.getElementById('dueCount');
  if (el) el.textContent = due.length;
}

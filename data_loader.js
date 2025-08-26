// data_loader.js
// Simple CSV parser (no external deps)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    // naive split: assume commas not in quotes for school-safe lists
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] || '');
    return obj;
  });
  return rows;
}

// Save large library in LS
function saveLibrary(arr) {
  localStorage.setItem('vb.library', JSON.stringify(arr));
}
function getLibrary() {
  try { return JSON.parse(localStorage.getItem('vb.library')||'[]'); } catch(e){ return []; }
}

// Chunk into weeks of 100, days of 20 (5 days/week)
function chunkLibraryToMap(all) {
  const map = {}; // {week:{day:[words]}}
  const perWeek = 100, perDay = 20;
  const weeks = Math.ceil(all.length / perWeek);
  for (let w = 1; w <= weeks; w++) {
    map[w] = {};
    for (let d = 1; d <= 5; d++) {
      const start = (w-1)*perWeek + (d-1)*perDay;
      const slice = all.slice(start, start + perDay);
      if (slice.length) map[w][d] = slice;
    }
  }
  return map;
}

function initWeekDaySelectors() {
  const lib = getLibrary();
  const totalWeeks = Math.max(8, Math.ceil(lib.length / 100)); // at least 8; expand as needed
  const weekSel = document.getElementById('weekSelect');
  const daySel = document.getElementById('daySelect');
  weekSel.innerHTML = Array.from({length: totalWeeks}, (_,i)=>`<option value="${i+1}">Week ${i+1}</option>`).join('');
  daySel.innerHTML = [1,2,3,4,5].map(d=>`<option value="${d}">Day ${d} (20 words)</option>`).join('');
}

function loadSelectedWeekDay() {
  const w = parseInt(document.getElementById('weekSelect').value,10);
  const d = parseInt(document.getElementById('daySelect').value,10);
  loadWeekDay(w,d);
}

function loadWeekDay(week, day) {
  const lib = getLibrary();
  const seed = (typeof wordList !== 'undefined' && Array.isArray(wordList)) ? wordList : [];
  const combined = seed.concat(lib); // seed week1 + library
  const map = chunkLibraryToMap(combined);
  const todays = (map[week] && map[week][day]) ? map[week][day] : [];
  if (!todays.length) {
    alert('No words found for this week/day. Try ingesting your library.');
    return;
  }
  window.wordList = todays;        // <- drives all tabs
  window.activeWeek = week;
  window.activeDay  = day;
  // mark first-seen timestamps for SRS
  todays.forEach(w => ensureFirstSeen(w.word));
  // re-render current tab
  const current = document.querySelector('.tabs button.active');
  showTab(current ? current.dataset.tab : 'visual');
  updateDueCountBadge();
}

// Ingest handler
async function handleBulkIngest() {
  const file = document.getElementById('bulkFile').files[0];
  if (!file) { alert('Choose a CSV or JSON file.'); return; }
  const text = await file.text();
  let parsed = [];
  if (file.name.endsWith('.csv')) {
    parsed = parseCSV(text);
  } else {
    parsed = JSON.parse(text);
  }
  // normalize fields
  const normalized = parsed.map(x => ({
    word: (x.word||x.Word||'').trim(),
    definition: (x.definition||x.Definition||'').trim(),
    partOfSpeech: (x.partOfSpeech||x.pos||'').trim(),
    mnemonic: (x.mnemonic||'').trim(),
    sentence: (x.sentence||'').trim(),
    icon: (x.icon||'icons/book.png').trim()
  })).filter(x => x.word && x.definition);

  const existing = getLibrary();
  saveLibrary(existing.concat(normalized));
  initWeekDaySelectors();
  document.getElementById('ingestStatus').textContent =
    `✅ Ingested ${normalized.length} words. Total library: ${getLibrary().length}.`;
}

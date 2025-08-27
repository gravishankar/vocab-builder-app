// data_loader.js
// Simple CSV parser (no external deps)
// --- Replace your old parseCSV with this one ---
function parseCSV(text) {
  const rows = [];
  let i = 0, cur = '', row = [], inQuotes = false;

  function pushCell() {
    // Unescape double quotes inside quoted fields
    const v = inQuotes ? cur.replace(/""/g, '"') : cur;
    row.push(v);
    cur = '';
  }
  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i+1] === '"') { cur += '"'; i += 2; continue; } // escaped quote
        inQuotes = false; i++; continue; // closing quote
      } else {
        cur += ch; i++; continue;
      }
    } else { // not in quotes
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { pushCell(); i++; continue; }
      if (ch === '\n') { pushCell(); rows.push(row); row = []; i++; continue; }
      if (ch === '\r') { // handle CRLF
        // finalize cell and line on \r\n or just \r
        pushCell();
        rows.push(row);
        row = [];
        if (text[i+1] === '\n') i += 2; else i++;
        continue;
      }
      cur += ch; i++; continue;
    }
  }
  // flush last cell/row
  pushCell();
  if (row.length > 1 || row[0] !== '') rows.push(row);

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (cols[idx] || '').trim());
    return obj;
  });
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
  try {
    parsed = file.name.toLowerCase().endsWith('.csv') ? parseCSV(text) : JSON.parse(text);
  } catch (e) {
    console.error('Parse error:', e);
    alert('Could not parse the file. If CSV, ensure headers and quotes are correct.');
    return;
  }

  const normalized = normalizeRows(parsed);
  if (!normalized.length) {
    alert('No valid rows found (need at least word + definition).');
    return;
  }

  const existing = getLibrary();
  saveLibrary(existing.concat(normalized));
  initWeekDaySelectors();

  document.getElementById('ingestStatus').textContent =
    `✅ Ingested ${normalized.length} words. Total library: ${getLibrary().length}.`;

  // Auto-load Week 1 / Day 1 to show 20 words immediately
  loadWeekDay(1, 1);
  showTab('visual');
}


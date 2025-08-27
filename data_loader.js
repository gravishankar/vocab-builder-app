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

// Reset all stored data
function resetAllData() {
  // Clear library data
  localStorage.removeItem('vb.library');
  // Clear all spaced repetition data
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('vb.firstSeen.') || key.startsWith('word-')) {
      localStorage.removeItem(key);
    }
  });
  // Reset UI
  window.wordList = [];
  initWeekDaySelectors();
  if (typeof showTab === 'function') showTab('visual');
  if (typeof updateDueCountBadge === 'function') updateDueCountBadge();
  document.getElementById('ingestStatus').textContent = '✅ All data cleared. Ready for fresh import.';
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
  console.log(`Loading Week ${week}, Day ${day}:`, todays.length, 'words');
  console.log('Sample words:', todays.slice(0, 3));
  if (!todays.length) {
    alert('No words found for this week/day. Try ingesting your library.');
    return;
  }
  window.wordList = todays;        // <- drives all tabs
  window.activeWeek = week;
  window.activeDay  = day;
  // mark first-seen timestamps for SRS
  todays.forEach(w => ensureFirstSeen(w.word));
  // re-render current tab - force visual tab since it's most useful after loading
  if (typeof showTab === 'function') showTab('visual');
  if (typeof updateDueCountBadge === 'function') updateDueCountBadge();
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
  const combined = existing.concat(normalized);
  
  try {
    saveLibrary(combined);
    initWeekDaySelectors();
    document.getElementById('ingestStatus').textContent =
      `✅ Ingested ${normalized.length} words. Total library: ${getLibrary().length}.`;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      document.getElementById('ingestStatus').textContent =
        `❌ Storage quota exceeded! Use "Reset All Data" button to clear space, then try again.`;
    } else {
      document.getElementById('ingestStatus').textContent =
        `❌ Error saving data: ${e.message}`;
    }
    console.error('Storage error:', e);
    return;
  }

  // Auto-load Week 1 / Day 1 to show 20 words immediately
  loadWeekDay(1, 1);
  if (typeof showTab === 'function') showTab('visual');
}

// Normalize parsed CSV/JSON rows to expected format
function normalizeRows(parsed) {
  return parsed.map(row => {
    // Handle different possible column names and formats
    const word = row.word || row.Word || '';
    const definition = row.definition || row.Definition || row.def || '';
    const partOfSpeech = row.part_of_speech || row.partOfSpeech || row.pos || row.PartOfSpeech || '';
    const mnemonic = row.mnemonic || row.Mnemonic || '';
    const sentence = row.sentence || row.Sentence || row.example || row.Example || row.context_sentence || '';
    const icon = row.icon || row.Icon || 'icons/book.png';
    const synonyms = row.synonyms || row.Synonyms || '';
    const moreSynonyms = row.more_synonyms || row.moreSynonyms || row['More Synonyms'] || '';
    const level = row.level || row.Level || '';
    const storyBuilder = row.story_builder || row.storyBuilder || row['story builder'] || '';
    const mnemonicSourceUrl = row.mnemonic_source_url || row.mnemonicSourceUrl || '';
    
    // Skip rows without essential data
    if (!word || !definition) return null;
    
    return {
      word: word.trim(),
      definition: definition.trim(),
      partOfSpeech: partOfSpeech.trim(),
      mnemonic: mnemonic.trim(),
      sentence: sentence.trim(),
      icon: icon.trim(),
      synonyms: synonyms.trim(),
      moreSynonyms: moreSynonyms.trim(),
      level: level.toString().trim(),
      storyBuilder: storyBuilder.trim(),
      mnemonicSourceUrl: mnemonicSourceUrl.trim()
    };
  }).filter(row => row !== null);
}


// app.js — uses the active list from loader OR the seed if loader hasn't run
function W() {
  // Prefer the live list set by data_loader.js -> loadWeekDay()
  if (Array.isArray(window.wordList)) return window.wordList;
  // Fallback to seed if present (week1.js). Top-level const in non-module
  // scripts isn't on window, so guard for ReferenceError:
  try { if (typeof wordList !== 'undefined') return wordList; } catch(e){}
  return [];
}

function showTab(tabName, btn) {
  const tabContent = document.getElementById("tab-content");
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  if (btn && btn.target) btn.target.classList.add('active');

  if (tabName === "visual")   tabContent.innerHTML = renderVisualWall();
  if (tabName === "mnemonics")tabContent.innerHTML = renderMnemonics();
  if (tabName === "context")  tabContent.innerHTML = renderContextSentences();
  if (tabName === "quiz")     tabContent.innerHTML = renderQuiz();
  if (tabName === "story")    tabContent.innerHTML = renderStoryBuilder();
  if (tabName === "review")   tabContent.innerHTML = renderSpacedRecall();
}

// ---- Tabs ----
function renderVisualWall() {
  const list = W();
  if (!list.length) return `<p>No words loaded yet. Use the Week/Day picker and press <strong>Load</strong>.</p>`;
  return list.map(word =>
    `<div style="margin-bottom:1em;">
      <img src="${word.icon || 'icons/book.png'}" alt="" style="height:40px;vertical-align:middle;margin-right:10px;">
      <strong>${word.word}</strong> — ${word.definition}
      ${word.category ? `<span style="color:#888;margin-left:.5rem;">(${word.category})</span>` : ''}
    </div>`
  ).join('');
}

function renderMnemonics() {
  const list = W();
  return list.map(word =>
    `<div style="margin-bottom:1em;">
      <strong>${word.word}</strong>: ${word.mnemonic || '<em>(add a mnemonic)</em>'}
    </div>`
  ).join('');
}

function renderContextSentences() {
  const list = W();
  return list.map(word =>
    `<div style="margin-bottom:1em;">
      <strong>${word.word}</strong>: ${word.sentence || '<em>(add a sentence)</em>'}
    </div>`
  ).join('');
}

// ---- Quiz (prioritizes due words via scheduler.js) ----
function renderQuiz() {
  const list = W();
  if (!list.length) return `<p>Load a Week/Day first.</p>`;
  const due = (typeof dueWordsInCurrentSet === 'function') ? dueWordsInCurrentSet() : [];
  const pool = due.length ? due : list;
  const q = pool[Math.floor(Math.random() * pool.length)];
  const inputId = "quiz-answer";
  return `
    <p><strong>What is the definition of "<span>${q.word}</span>"?</strong></p>
    <input type="text" id="${inputId}" style="width:100%;padding:8px;" placeholder="Type your answer here...">
    <button onclick="checkAnswer('${escapeJS(q.word)}','${escapeJS(q.definition)}','${inputId}')">Check</button>
    <p id="quiz-feedback" style="margin-top:10px;"></p>
    <p style="margin-top:10px;color:#555;">${due.length ? '🔁 Spaced practice word' : '📚 Practice word'}</p>
  `;
}

function checkAnswer(word, correct, inputId) {
  const userInput = document.getElementById(inputId).value.trim().toLowerCase();
  const ok = userInput && correct.toLowerCase().split(/\W+/).some(t => t && userInput.includes(t));
  document.getElementById("quiz-feedback").textContent = ok
    ? "✅ Correct!"
    : `❌ Try again. Correct answer: ${correct}`;
  if (typeof updateDueCountBadge === 'function') updateDueCountBadge();
}

// ---- Story Builder ----
function renderStoryBuilder() {
  const list = W();
  const sample = shuffle(list).slice(0, 5);
  return `
    <p>Use these words in a silly or smart sentence/story:</p>
    <ul>${sample.map(w => `<li><strong>${w.word}</strong></li>`).join('')}</ul>
    <textarea rows="6" style="width:100%;padding:10px;" placeholder="Write your story here..."></textarea>
  `;
}

// ---- Review list hooks from scheduler.js ----
function renderSpacedRecall() {
  if (typeof dueWordsInCurrentSet !== 'function') {
    return `<p>Spaced recall engine not loaded. Make sure <code>scheduler.js</code> is included.</p>`;
  }
  const list = W();
  if (!list.length) return `<p>Load a Week/Day first.</p>`;
  const due = dueWordsInCurrentSet();
  if (!due.length) return "<p>No words are due for spaced review right now. ✅</p>";

  const items = due.map(w => {
    const distractors = shuffle(W().filter(x => x.word !== w.word)).slice(0,3).map(x => x.definition);
    const choices = shuffle([w.definition, ...distractors]);
    const opts = choices.map(c => `<label style="display:block;margin:.25rem 0;">
        <input type="radio" name="q_${w.word}" value="${escapeHTML(c)}"> ${escapeHTML(c)}
      </label>`).join('');
    return `<div class="rev-item" style="margin:1rem 0;padding:.75rem;border:1px solid #eee;border-radius:8px;">
      <strong>${w.word}</strong>
      <div>${opts}</div>
      <button onclick="gradeReview('${escapeJS(w.word)}','${escapeJS(w.definition)}')">Check</button>
      <span id="res_${escapeHTMLAttr(w.word)}" style="margin-left:.5rem;"></span>
    </div>`;
  }).join('');

  return `<h3>🔁 Spaced Review (${due.length} due)</h3>${items}`;
}

function gradeReview(word, correctDef) {
  const sel = document.querySelector(`input[name="q_${cssEscape(word)}"]:checked`);
  const res = document.getElementById(`res_${word}`);
  if (!sel) { if (res) res.textContent = 'Pick an option.'; return; }
  const ok = sel.value === correctDef;
  if (res) res.textContent = ok ? '✅' : '❌';
  if (typeof updateDueCountBadge === 'function') updateDueCountBadge();
}

// ---- helpers ----
function shuffle(arr){ return arr.slice().sort(()=>Math.random()-0.5); }
function escapeJS(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;'}[m])); }
function escapeHTMLAttr(s){ return escapeHTML(s).replace(/"/g,'&quot;'); }
// Minimal CSS escape for radio name lookup
function cssEscape(s){ return String(s).replace(/[^a-zA-Z0-9_-]/g, '_'); }

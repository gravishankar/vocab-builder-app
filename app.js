// Handles tab display and renders word content
function showTab(tabName) {
  const tabContent = document.getElementById("tab-content");
  switch (tabName) {
    case "visual":
      tabContent.innerHTML = renderVisualWall();
      break;
    case "mnemonics":
      tabContent.innerHTML = renderMnemonics();
      break;
    case "context":
      tabContent.innerHTML = renderContextSentences();
      break;
    case "quiz":
      tabContent.innerHTML = renderQuiz();
      break;
    case "story":
      tabContent.innerHTML = renderStoryBuilder();
      break;
    case "review":
      tabContent.innerHTML = renderSpacedRecall();
      break;
  }
}

// Render tab: Visual Wall
function renderVisualWall() {
  return wordList.map(word =>
    `<div style="margin-bottom:1em;">
      <img src="${word.icon}" alt="" style="height:40px;vertical-align:middle;margin-right:10px;">
      <strong>${word.word}</strong> - ${word.definition}
    </div>`
  ).join('');
}

// Render tab: Mnemonics
function renderMnemonics() {
  return wordList.map(word =>
    `<div style="margin-bottom:1em;">
      <strong>${word.word}</strong>: ${word.mnemonic}
    </div>`
  ).join('');
}

// Render tab: Context Sentences
function renderContextSentences() {
  return wordList.map(word =>
    `<div style="margin-bottom:1em;">
      <strong>${word.word}</strong>: ${word.sentence}
    </div>`
  ).join('');
}

// === QUIZ (definition recall with spaced set priority) ===
function renderQuiz() {
  const due = dueWordsInCurrentSet();
  const pool = due.length ? due : wordList; // prioritize due words
  const q = pool[Math.floor(Math.random()*pool.length)];
  const inputId = "quiz-answer";
  return `
    <p><strong>What is the definition of "<span>${q.word}</span>"?</strong></p>
    <input type="text" id="${inputId}" style="width:100%;padding:8px;" placeholder="Type your answer here...">
    <button onclick="checkAnswer('${q.word}', '${q.definition.replace(/'/g, "\\'")}', '${inputId}')">Check</button>
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
  // After any attempt, refresh due badge
  updateDueCountBadge();
}

// Render tab: Story Builder
function renderStoryBuilder() {
  const sample = wordList.sort(() => 0.5 - Math.random()).slice(0, 5);
  return `
    <p>Use these words in a silly or smart sentence/story:</p>
    <ul>${sample.map(w => `<li><strong>${w.word}</strong></li>`).join('')}</ul>
    <textarea rows="6" style="width:100%;padding:10px;" placeholder="Write your story here..."></textarea>
  `;
}

// === REVIEW TAB (shows all due words + quick MCQ) ===
function renderSpacedRecall() {
  const due = dueWordsInCurrentSet();
  if (!due.length) return "<p>No words are due for spaced review right now. ✅</p>";
  // Build a quick MC quiz list
  const items = due.map(w => {
    const distractors = shuffle(wordList.filter(x => x.word !== w.word)).slice(0,3).map(x => x.definition);
    const choices = shuffle([w.definition, ...distractors]);
    const opts = choices.map(c => `<label style="display:block;margin:.25rem 0;">
        <input type="radio" name="q_${w.word}" value="${c.replace(/"/g,'&quot;')}"> ${c}
      </label>`).join('');
    return `<div class="rev-item" style="margin:1rem 0;padding:.75rem;border:1px solid #eee;border-radius:8px;">
      <strong>${w.word}</strong>
      <div>${opts}</div>
      <button onclick="gradeReview('${w.word}','${w.definition.replace(/'/g,"\\'")}')">Check</button>
      <span id="res_${w.word}" style="margin-left:.5rem;"></span>
    </div>`;
  }).join('');

  return `<h3>🔁 Spaced Review (${due.length} due)</h3>${items}`;
}
function gradeReview(word, correctDef) {
  const sel = document.querySelector(`input[name="q_${word}"]:checked`);
  const res = document.getElementById(`res_${word}`);
  if (!sel) { res.textContent = 'Pick an option.'; return; }
  const ok = sel.value === correctDef;
  res.textContent = ok ? '✅' : '❌';
  updateDueCountBadge();
}

// small helper
function shuffle(arr){ return arr.slice().sort(()=>Math.random()-0.5); }

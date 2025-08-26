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

// Render tab: Quiz
function renderQuiz() {
  const question = wordList[Math.floor(Math.random() * wordList.length)];
  const inputId = "quiz-answer";
  return `
    <p><strong>What is the definition of "${question.word}"?</strong></p>
    <input type="text" id="${inputId}" style="width:100%;padding:8px;" placeholder="Type your answer here...">
    <button onclick="checkAnswer('${question.word}', '${question.definition.replace(/'/g, "\\'")}', '${inputId}')">Check</button>
    <p id="quiz-feedback" style="margin-top:10px;"></p>
  `;
}

function checkAnswer(word, correct, inputId) {
  const userInput = document.getElementById(inputId).value.trim().toLowerCase();
  const isCorrect = userInput.includes(correct.toLowerCase().split(" ")[0]);
  document.getElementById("quiz-feedback").textContent = isCorrect
    ? "✅ Correct!"
    : `❌ Try again. Correct answer: ${correct}`;
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

// Placeholder for spaced recall
function renderSpacedRecall() {
  return `<p>Spaced recall engine running... (loaded from review.js)</p>`;
}

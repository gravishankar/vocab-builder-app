function renderSpacedRecall() {
  const now = Date.now();
  const reviewWords = [];

  wordList.forEach(word => {
    const key = `word-${word.word}`;
    const seen = localStorage.getItem(key);
    if (seen) {
      const age = now - parseInt(seen);
      const days = age / (1000 * 60 * 60 * 24);
      if (days >= 7 && days <= 9 || days >= 14 && days <= 16 || days >= 28) {
        reviewWords.push(word);
      }
    } else {
      localStorage.setItem(key, now);
    }
  });

  if (reviewWords.length === 0) {
    return "<p>No words to review yet! Keep learning! ✅</p>";
  }

  return `
    <h3>⏳ Review These Words:</h3>
    <ul>
      ${reviewWords.map(w => `<li><strong>${w.word}</strong>: ${w.definition}</li>`).join('')}
    </ul>
  `;
}

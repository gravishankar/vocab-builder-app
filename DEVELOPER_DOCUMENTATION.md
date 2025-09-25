# vocabbitZ - Developer Documentation
*Level Up Your Words, Build Better Habits*

## Architecture Overview

vocabbitZ is a client-side web application built with vanilla JavaScript, HTML, and CSS. It uses browser localStorage for data persistence and implements a modular architecture with separate concerns for data loading, scheduling, and UI rendering.

## Project Structure

```
vocabbitz/
├── index.html              # Main HTML file with inline scripts
├── app.js                 # Core application logic and UI rendering
├── data_loader.js         # CSV parsing and data management
├── scheduler.js           # Spaced repetition algorithm
├── review.js              # (minimal file)
├── style.css              # Application styles
├── week-data/
│   └── week1.js          # Seed vocabulary data
├── data/
│   ├── sesamewords_leveled_list_with_mnemonics.csv
│   └── [other vocabulary CSV files]
├── icons/                # Word icons and images
└── .github/
    └── workflows/
        └── deploy.yml    # GitHub Pages deployment
```

## Core Components

### 1. Data Layer (`data_loader.js`)

**Purpose**: Handles CSV parsing, data normalization, and localStorage management.

**Key Functions**:
- `parseCSV(text)`: Robust CSV parser handling quoted fields and escapes
- `normalizeRows(parsed)`: Converts various column formats to standardized schema
- `saveLibrary(arr)` / `getLibrary()`: localStorage persistence with error handling
- `chunkLibraryToMap(all)`: Organizes vocabulary into weeks (100 words) and days (20 words)
- `loadWeekDay(week, day)`: Loads specific vocabulary subset into active memory
- `handleBulkIngest()`: File upload and processing pipeline

**Data Schema**:
```javascript
{
  word: string,           // The vocabulary word
  definition: string,     // Definition
  partOfSpeech: string,   // Grammatical classification
  mnemonic: string,       // Memory aid
  sentence: string,       // Example sentence
  icon: string,          // Icon path
  synonyms: string,      // Primary synonyms
  moreSynonyms: string,  // Extended synonyms
  level: string,         // Difficulty level
  storyBuilder: string,  // Story prompt
  mnemonicSourceUrl: string // Source URL
}
```

### 2. Scheduling Layer (`scheduler.js`)

**Purpose**: Implements spaced repetition algorithm for optimal learning intervals.

**Key Functions**:
- `ensureFirstSeen(word)`: Records timestamp when word first encountered
- `isDue(word)`: Determines if word needs review based on spaced intervals
- `dueWordsInCurrentSet()`: Filters current vocabulary for due words
- `updateDueCountBadge()`: Updates UI counter

**Algorithm**:
- Intervals: 7, 14, 28 days with ±1-2 day tolerance
- Storage: `vb.firstSeen.${word}` timestamp in localStorage
- Due calculation: `(Date.now() - firstSeen) / DAY_MS`

### 3. Application Layer (`app.js`)

**Purpose**: Core UI rendering and interaction handling.

**Key Functions**:
- `W()`: Central data accessor with fallback hierarchy (window.wordList → seed → empty)
- `renderVisualWall()`: Card-based vocabulary display with synonyms
- `renderMnemonics()`: Memory aid focused view
- `renderContextSentences()`: Example sentence display
- `renderQuiz()`: Interactive vocabulary testing
- `renderStoryBuilder()`: Creative writing exercises
- `renderSpacedRecall()`: Multiple choice review system

**Utility Functions**:
- `shuffle(arr)`: Array randomization
- `escapeJS(s)` / `escapeHTML(s)` / `cssEscape(s)`: Security helpers
- `checkAnswer()` / `gradeReview()`: Quiz validation logic

### 4. UI Layer (`index.html`)

**Purpose**: Main interface with embedded search functionality and tab system.

**Key Features**:
- **Search System**:
  - Real-time autocomplete with suggestion dropdown
  - Multi-criteria search (word, definition, synonyms) with relevance scoring
  - Search result highlighting with expandable synonyms
  - Smart caching using `cachedFullDataset`

- **Tab Navigation**:
  - Dynamic content rendering based on active tab
  - State management for active tab highlighting
  - Event delegation for tab switching

- **Data Loading**:
  - Auto-load from GitHub CSV (primary method)
  - Manual file upload fallback
  - Memory-based caching to avoid localStorage quota issues

## Search Architecture

The search system implements sophisticated functionality:

1. **Autocomplete**: Shows matching words after 2+ characters
2. **Multi-criteria Scoring**:
   - Exact word match: 100 points
   - Word starts with term: 80 points
   - Word contains term: 60 points
   - Definition contains term: 30 points
   - Synonyms contain term: 25 points
3. **Result Limiting**: Top 50 results to maintain performance
4. **Highlighting**: Search terms highlighted in results with HTML mark tags

## Storage Strategy

**Primary Storage**: In-memory caching (`cachedFullDataset`)
- Avoids localStorage quota issues with large datasets
- Fast access for search and filtering operations
- Resets on page reload (intentional for memory management)

**Persistent Storage**: localStorage for progress tracking
- `vb.library`: Main vocabulary library (only for user uploads)
- `vb.firstSeen.${word}`: Word introduction timestamps
- Spaced repetition progress data

## GitHub Pages Deployment

**Workflow** (`.github/workflows/deploy.yml`):
- Triggers on push/PR to main branch
- Deploys entire repository to GitHub Pages
- No build step required (static assets)
- Automatic deployment with proper permissions

**Live Data Loading**:
- App fetches `data/sesamewords_leveled_list_with_mnemonics.csv` from GitHub
- Enables 5,000+ word vocabulary without local storage limits
- Fallback to manual upload if GitHub fetch fails

## Development Setup

### Prerequisites
- Modern web browser with ES6 support
- Local web server (for CORS compliance during development)
- Text editor with JavaScript support

### Running Locally
```bash
# Clone repository
git clone https://github.com/[username]/vocabbitz.git
cd vocabbitz

# Serve locally (Python example)
python -m http.server 8000

# Or use any static file server
npx http-server .
```

### File Serving Requirements
- Must serve from HTTP/HTTPS (not file://) for CSV loading
- CORS headers needed if serving from different domain
- All assets must be accessible from root path

## Code Patterns

### Error Handling
```javascript
// Graceful degradation pattern
try {
  // Attempt primary operation
  const data = JSON.parse(localStorage.getItem('key'));
} catch (e) {
  // Fallback to safe default
  return [];
}
```

### Data Access Pattern
```javascript
// Hierarchical data access with fallbacks
function W() {
  if (Array.isArray(window.wordList)) return window.wordList;
  try {
    if (typeof wordList !== 'undefined') return wordList;
  } catch(e){}
  return [];
}
```

### UI Rendering Pattern
```javascript
// Consistent render function structure
function renderTab() {
  const list = W();
  if (!list.length) return `<p>No data message</p>`;
  return list.map(item => `<div>...</div>`).join('');
}
```

## Security Considerations

### XSS Prevention
- All user input escaped with `escapeHTML()`, `escapeJS()`, `cssEscape()`
- Template literals use escaped values for dynamic content
- HTML sanitization for synonym content containing markup

### Data Validation
- CSV parsing validates structure and handles malformed data
- Required fields checked during normalization
- File type validation on upload

### Storage Security
- localStorage keys namespaced with 'vb.' prefix
- No sensitive data stored client-side
- Safe JSON parsing with try/catch blocks

## Performance Optimizations

### Memory Management
- Large datasets cached in memory instead of localStorage
- Search results limited to 50 items
- Lazy loading of tab content (render on demand)

### Search Performance
- Early termination of searches with scoring threshold
- Limited suggestion count (8 items)
- Debounced search input (implicit through event handling)

### DOM Optimization
- Minimal DOM manipulation (innerHTML replacement)
- Event delegation for dynamic content
- CSS transitions for smooth interactions

## Browser Compatibility

**Requirements**:
- ES6 support (arrow functions, template literals, destructuring)
- localStorage API
- Fetch API (for CSV loading)
- CSS3 features (flexbox, transitions, animations)

**Tested Browsers**:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Data Format Specifications

### CSV Format
```csv
word,definition,part_of_speech,mnemonic,sentence,synonyms,more_synonyms,level
"example","a thing characteristic of its kind","noun","ex-ample: excellent sample","This is an example sentence","sample,instance","specimen,illustration","3"
```

### JSON Format
```json
[
  {
    "word": "example",
    "definition": "a thing characteristic of its kind",
    "partOfSpeech": "noun",
    "mnemonic": "ex-ample: excellent sample",
    "sentence": "This is an example sentence",
    "synonyms": "sample, instance",
    "moreSynonyms": "specimen, illustration",
    "level": "3"
  }
]
```

## Extension Points

### Adding New Learning Modes
1. Create render function in `app.js`: `renderNewMode()`
2. Add tab button in `index.html` with `data-tab="newmode"`
3. Add case in `showTab()` function
4. Implement specific UI and interaction logic

### Custom Data Sources
1. Modify `autoLoadFromGitHub()` in `index.html`
2. Update CSV URL or add multiple source support
3. Enhance `normalizeRows()` for new data formats

### Enhanced Scheduling
1. Modify `INTERVALS` array in `scheduler.js`
2. Implement difficulty-based scheduling
3. Add performance tracking for adaptive intervals

## Testing Strategy

### Manual Testing Checklist
- [ ] Data loading (auto and manual)
- [ ] Week/day navigation
- [ ] All tab functionality
- [ ] Search with various terms
- [ ] Quiz and spaced recall accuracy
- [ ] Storage persistence across sessions
- [ ] Error handling (invalid files, storage full)

### Automated Testing Opportunities
- Unit tests for CSV parsing logic
- Integration tests for data flow
- Performance tests for search functionality
- Cross-browser compatibility testing

## Common Issues and Solutions

### Storage Quota Exceeded
**Problem**: Large CSV files exceed localStorage limits
**Solution**: Use in-memory caching with `cachedFullDataset`

### CORS Issues
**Problem**: CSV loading fails due to CORS restrictions
**Solution**: Serve from HTTP server, not file:// protocol

### Search Performance
**Problem**: Slow search with large datasets
**Solution**: Implement result limiting and early termination

### Missing Icons
**Problem**: Icon files not found, broken images
**Solution**: Fallback to default icon in `normalizeRows()`

## Future Enhancements

### Planned Features
- Export/import of user progress
- Advanced search filters (part of speech, difficulty level)
- Audio pronunciation integration
- Social sharing of learning progress
- Offline service worker support

### Architecture Improvements
- Module system (ES6 modules)
- TypeScript conversion for better type safety
- Unit testing framework integration
- Build system for optimization and bundling

### Data Enhancements
- Multiple language support
- User-generated content (custom mnemonics)
- Progress analytics and insights
- Adaptive difficulty adjustment

This documentation provides a comprehensive overview for developers working on or extending vocabbitZ. The modular architecture and clear separation of concerns make it straightforward to add new features or modify existing functionality to support vocabulary learning and habit building.
# vocabbitZ - User Manual
*Level Up Your Words, Build Better Habits *

## Overview

vocabbitZ is a comprehensive web-based vocabulary learning and habit-building tool designed to help users learn and memorize vocabulary words using various learning techniques including visual cards, mnemonics, context sentences, quizzes, and spaced repetition.

## Getting Started

### Accessing the App
- Open `index.html` in your web browser
- The app works entirely in your browser - no installation required
- Your progress is automatically saved locally

### Loading Vocabulary Data

You have two options to get started:

#### Option 1: Auto-Load Enhanced Dataset (Recommended)
1. Click the **📊 Auto-Load Enhanced Dataset (5,000+ words)** button
2. The app will automatically load over 5,000 curated words with definitions, mnemonics, and example sentences
3. Words are automatically organized into weeks and days for structured learning

#### Option 2: Upload Custom File
1. Click **📁 Upload Custom File**
2. Choose a `.csv` or `.json` file from your computer
3. Your file should include columns: `word`, `definition`, `partOfSpeech`, `mnemonic`, `sentence`, `icon`
4. Click **Ingest to Local Library**

### Week and Day Selection

- Use the **Week** and **Day** dropdowns to select your learning schedule
- Each week contains 100 words divided into 5 days (20 words per day)
- Click **Load** to display the selected vocabulary set

## Features

### 🔍 Search
- **Smart Search**: Find words by exact match, partial match, definition content, or synonyms
- **Auto-complete**: Get real-time suggestions as you type (after 2+ characters)
- **Advanced Results**: Search results are ranked by relevance with highlighted search terms
- **Synonym Support**: Expandable synonym sections for comprehensive word understanding

### 📷 Visual Wall
- **Card Layout**: Browse words in an attractive card format with icons
- **Rich Information**: Each card shows word, part of speech, definition, and category
- **Interactive Elements**: Click to expand synonym information
- **Visual Learning**: Icons help with memory association

### 🧠 Mnemonics
- **Memory Devices**: View specially crafted memory aids for each word
- **Source Links**: Access original sources for mnemonics when available
- **Learning Technique**: Use visual and verbal associations to remember words better

### ✍️ Context Sentences
- **Real Usage**: See words used in meaningful, realistic sentences
- **Contextual Learning**: Understand how words function in actual communication
- **Practical Application**: Learn proper word usage and grammar

### 📝 Quiz
- **Adaptive Testing**: Quiz prioritizes words that are due for review
- **Instant Feedback**: Get immediate results with correct answers shown
- **Flexible Checking**: Partial matches and synonyms are accepted
- **Progress Tracking**: Quiz results inform the spaced repetition system

### 🧩 Story Builder
- **Creative Writing**: Use vocabulary words in creative stories and sentences
- **Guided Prompts**: Some words include specific story-building challenges
- **Word Integration**: Practice using 5 random words in a cohesive narrative
- **Creative Expression**: Develop writing skills while learning vocabulary

### 🔁 Spaced Recall
- **Scientific Method**: Uses proven spaced repetition intervals (7, 14, 28 days)
- **Due Today Badge**: See how many words are ready for review
- **Multiple Choice**: Answer definition questions with distractors
- **Automatic Scheduling**: Words automatically become due based on learning intervals

## How Spaced Repetition Works

The app tracks when you first encounter each word and schedules reviews at scientifically-proven intervals:

1. **First Review**: ~7 days after first seeing a word
2. **Second Review**: ~14 days after first encounter
3. **Third Review**: ~28 days after first encounter
4. **Ongoing**: Words continue to appear for review to maintain long-term retention

Words appear in the "Due Today" counter and are prioritized in quizzes and spaced recall sessions.

## Navigation Tips

### Keyboard Shortcuts
- **Enter**: Execute search when typing in search box
- **Escape**: Clear search and return to visual wall

### Search Best Practices
- Use at least 2 characters for suggestions
- Try different spellings or word parts if no results found
- Search within definitions for concept-based discovery
- Use the clear button (×) to reset search

### Learning Strategies
1. **Daily Routine**: Load your scheduled week/day vocabulary
2. **Multi-Modal Learning**: Cycle through different tabs (visual, mnemonics, context)
3. **Active Testing**: Use quiz and spaced recall regularly
4. **Creative Application**: Practice with story builder for deeper understanding
5. **Search Exploration**: Use search to find related words and concepts

## Data Management

### Storage
- All data is stored locally in your browser
- No internet connection required after initial data load
- Your learning progress and word schedules are automatically saved

### Backup and Reset
- **Reset All Data**: Use the 🗑️ button to clear all vocabulary and progress data
- **Fresh Start**: Reset is useful if you want to start over or clear storage space
- **No Backup**: Currently no export feature - reset will permanently delete your progress

### File Format Requirements

For custom uploads, ensure your CSV/JSON includes these columns:
- `word` (required): The vocabulary word
- `definition` (required): Clear definition of the word
- `partOfSpeech`: Grammatical classification (noun, verb, etc.)
- `mnemonic`: Memory device or learning aid
- `sentence`: Example sentence showing usage
- `icon`: Path to icon file (defaults to book icon)
- `synonyms`: Related words with similar meanings
- `level`: Difficulty or grade level

## Troubleshooting

### No Words Showing
- Ensure you've loaded data using one of the two loading options
- Select a Week/Day and click Load
- Check that your uploaded file has the correct format

### Storage Issues
- If you see "Storage quota exceeded" error, use Reset All Data
- Large CSV files may exceed browser storage limits
- Try uploading smaller subsets of vocabulary

### Search Not Working
- Make sure data is loaded first
- Try searching with fewer or different terms
- Check spelling and try partial word matches

### Quiz/Spaced Recall Empty
- Words need to be "due" based on spaced repetition schedule
- New words may not appear in spaced recall until review intervals pass
- Use regular quiz for immediate practice

## Tips for Maximum Learning

1. **Consistency**: Review vocabulary daily using the week/day structure
2. **Variety**: Rotate between different learning modes (visual, mnemonics, quiz)
3. **Active Recall**: Test yourself frequently rather than just reading
4. **Spacing**: Trust the spaced repetition system - let it schedule your reviews
5. **Context**: Pay attention to example sentences and try creating your own
6. **Creativity**: Use story builder to make vocabulary personally meaningful
7. **Search**: Explore word relationships and discover new vocabulary through search

vocabbitZ combines multiple research-backed learning techniques with habit-building principles to help you efficiently build and retain a strong vocabulary. Regular use with varied learning modes will maximize your vocabulary growth and create lasting learning habits.

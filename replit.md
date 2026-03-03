# zyBooks Formatter

A web-based text formatter that cleans zyBooks textbook page pastes into clean, readable markdown and generates Colab-ready Jupyter notebooks.

## Overview

Single-page tool with input/output textareas. Users paste raw zyBooks content, click Format, and get cleaned markdown output. They can then Copy to clipboard or Download as a .ipynb notebook file ready for Google Colab.

## Architecture

- **Frontend-only processing**: All regex cleanup and notebook generation happens client-side
- **No database**: No persistence needed — this is a stateless text transformation tool
- **Stack**: React + Tailwind CSS + Shadcn UI components

## Key Files

- `client/src/lib/zybooks-formatter.ts` — Core regex cleanup engine with three paste modes
- `client/src/lib/html-parser.ts` — HTML paste mode: DOM-based parser for raw zyBooks page HTML
- `client/src/lib/notebook-generator.ts` — .ipynb notebook generation (nbformat 4)
- `client/src/pages/home.tsx` — Main formatter page with input/output textareas, mode toggle, and debug preview panels
- `client/src/App.tsx` — App router
- `tests/html-parser.test.ts` — 24 automated tests for the HTML parser (run with `npx tsx tests/html-parser.test.ts`)

## Paste Modes

The formatter supports three input modes via a UI toggle:

### Regular Paste (default)
For plain text copied directly from zyBooks (Ctrl+A, Ctrl+C). This is raw text with no markdown structure — line-by-line regex matching.

### Copy as Markdown
For content pasted via the "Copy as Markdown" browser extension. This format preserves more structure (headings, links, code blocks) but adds markdown artifacts like:
- Escaped characters: `\_`, `\[`, `\]`, `\=`, `\-`, `\|`
- Markdown links `[text](url)` for navigation
- Pipe tables `| code | output |` for code figures
- Hebrew placeholder chars and XXXXXX strings for editor blanks
- Combined button text: `Check Show answer`, `Start Jump to level 1`
- `question\_mark signifies...` hint text
- Checkmark images and `Done. Click any level...` completion text

## Cleanup Patterns (both modes)

The formatter removes:
- Navigation breadcrumbs (My library, Skip to main content, etc.)
- Assignment metadata (Students, Due dates, Activities, Participation/Challenge badges)
- UI controls (Start, 2x speed, Captions, Feedback?, keyboard arrows)
- Animation/figure descriptions (Step 1:, Static Figure:, Begin/End Python code)
- Interactive elements (Check, Show answer, Next level, Try again, Show solution)
- Code editor artifacts (_fullscreen_, fullscreen, Model Solution, How to use this tool, Run program, Submit mode)
- Unused/main.py headers, "Load default template..." text, "Try X.X.X:" prompts
- Footer metadata (Activity summary, section feedback, completion details, thumbs up/down)
- Chapter navigation links and sidebar items
- Diagram labels and standalone pseudocode from animations
- Blob image references and checkmark images
- Code editor line numbers (sequences of 3+ consecutive single-digit lines)
- Excess whitespace

The formatter preserves:
- **PARTICIPATION ACTIVITY** headers (bolded)
- **CHALLENGE ACTIVITY** headers (bolded)
- **Construct X.X.X:** labels (bolded)
- **Figure X.X.X:** labels (bolded)
- Section titles and subsection headings
- Educational content and explanations
- Code examples and exercise prompts
- Question text and answer choices
- Fill-in-the-blank placeholders (`[___]`) for text input fields in questions
- Multiple-choice answer choices formatted as bullet lists (`- `) within PA/CA sections
  - Detects three question types: simple (text answers), output (code supplement → output answers), prints (output supplement → code answers)
  - "How many" questions treated as output type (code is a supplement, not answer choices)
  - Code answer choices wrapped in indented Python code fences
  - Multi-line output answers use continuation indentation
- Python comments starting with `#` at column 0 are escaped (`\#`) when near code context to prevent markdown heading rendering

## Notebook Generation

The .ipynb generator:
- Splits cleaned markdown into separate cells at section headings and activity headers
- Creates code cells for content inside triple-backtick code blocks
- Uses nbformat 4 (standard Jupyter format)
- Includes Colab metadata for direct opening in Google Colab
- Auto-generates filename from section title
- Python 3 kernel configured by default

## Known Limitations

- **Fill-in-the-blank inputs**: In participation activities with interactive input boxes (e.g., 5.5.6), the blank fields disappear entirely in the plain text paste with no marker. HTML parsing would solve this since the HTML has `short-answer-input-container` elements with `<input>` tags between code spans.
- **Code figure tables**: The markdown mode extracts code from pipe tables using Python statement boundary detection to split code into individual lines, wrapped in ```python code fences. The splitting uses keyword/statement-start heuristics and falls back to whitespace splitting. Complex multi-line strings (docstrings) are kept as single blocks.

## HTML Structure Analysis (zyBooks Page Source)

The saved HTML files in `attached_assets/` reveal rich semantic structure that would enable a much more accurate "Paste HTML" mode or browser extension:

### Key CSS Classes & Elements
- `zybook-section` — Main section container with `canonical_section_guid`
- `zybook-section-title` (h1) — Section title (e.g., "5.5 For loops")
- `content-resource` — Base class for all content blocks
- `html-content-resource` — Text/explanation blocks containing `<h3>`, `<p>` elements
- `container-content-resource` — Wrapper for figures, constructs, surveys
- `static-container` — Container for Construct/Figure blocks
- `static-container-title` — Label text (e.g., "Construct 5.5.1: For loop.", "Figure 5.5.2: ...")
- `content-tool-content-resource` — Activity containers
  - Has `participation` or `challenge` class suffix for activity type
- `activity-title-bar` — Activity header with type label and title
- `activity-type` — "participation activity" or "challenge activity" text
- `activity-title` — Activity number and description (e.g., "5.5.1: Iterating over...")
- `activity-payload` — Activity content container
- `multiple-choice-content-resource` — Multiple choice activities
- `multiple-choice-question` / `question-set-question` — Individual questions
- `question` > `setup` > `label` (number) + `text` (question text)
- `question-choices` — Radio button group for answer options
- `short-answer-content-resource` — Fill-in-the-blank activities
- `short-answer-question` — Fill-in-the-blank question
- `short-answer-input-container` — The actual `<input>` blank field
- `zb-feedback` — Feedback button blocks (reliable cell boundary marker)

### Code & Output
- `div.code > div.highlight > pre` — Syntax-highlighted Python code using `<span>` classes:
  - `.k` = keyword, `.n` = name, `.ow` = operator word, `.p` = punctuation
  - `.s2` = string, `.mi` = integer, `.mf` = float, `.c1` = comment
  - `.nb` = builtin, `.sa` = string affix, `.si` = string interpolation, `.se` = string escape
  - `.o` = operator, `.bp` = builtin pseudo
- `div.console > pre` — Program output
- `div.table > table` — Code figure tables with `<td>` for code and output columns
- Animation players: `animation-player` with `pre.highlight.text-object` for code display
- `assistive-text` — Contains animation step descriptions, code examples, and accessibility text (extracted by `extractAnimationContent()`)
- `animation-canvas` with `.animation-text-object` divs — Positioned text objects with absolute CSS `top`/`left` (fallback extraction sorted by vertical position)

### Structural Pattern
```
zybook-section
  ├─ section-header-row + h1.zybook-section-title
  ├─ section-content-resources-container
  │   ├─ container-content-resource (Survey, aside-elaboration)
  │   ├─ html-content-resource (h3 headers, p text)
  │   ├─ container-content-resource (Construct/Figure with code tables)
  │   │   └─ zb-feedback (Feedback?)
  │   ├─ content-tool-content-resource.participation (Animation activities)
  │   │   ├─ activity-title-bar
  │   │   ├─ activity-payload (animation-player or multiple-choice or short-answer)
  │   │   └─ zb-feedback (Feedback?)
  │   ├─ content-tool-content-resource.challenge (Challenge activities)
  │   │   ├─ activity-title-bar
  │   │   ├─ activity-payload (code editor, test cases)
  │   │   └─ zb-feedback (Feedback?)
  │   └─ ... repeating pattern
```

### Fill-in-the-Blank Resolution
In HTML, the fill-in-the-blank inputs are fully visible:
```html
<pre>
  <div><span class="k">for</span> </div>
  <div class="short-answer-input-container">
    <input class="zb-input" size="7" type="text">
  </div>
  <div><span class="ow">in</span> ["Scooter", "Kobe", "Bella"]:</div>
</pre>
```
This means an HTML parser could reconstruct `for [___] in ["Scooter", "Kobe", "Bella"]:` with a visible blank marker.

## Debug/Preview Panels

When in HTML Paste mode, a "Show Previews" toggle button appears below the main UI. It reveals two side-by-side panels:
- **HTML Preview (left)** — Renders the pasted HTML in a sandboxed iframe (`sandbox=""`, no scripts) so you can see the original zyBooks content
- **Markdown Preview (right)** — Renders the formatted markdown output using `marked.js` + `DOMPurify` sanitization via Tailwind Typography (`prose` class)
- Panels are collapsible via the toggle button; state resets when switching paste modes
- Security: HTML is sanitized with DOMPurify (strips scripts, iframes, objects, embeds); iframe uses empty sandbox attribute (no same-origin, no scripts)

## Bookmarklet (One-Click Import)

A browser bookmarklet for one-click import from zyBooks pages:
- **Backend**: `POST /api/bookmarklet` receives HTML (with CORS headers for cross-origin from zyBooks), `GET /api/bookmarklet/pending` returns pending HTML
- **Frontend**: Collapsible panel in header with draggable bookmarklet link, "Start Listening" polling button, and auto-format on receipt
- **Bookmarklet code**: Grabs `document.documentElement.outerHTML` from zyBooks page and POSTs to the formatter app; shows green confirmation toast on the zyBooks page
- **Flow**: User drags bookmarklet to bookmarks bar → clicks "Start Listening" in formatter → navigates to zyBooks section → clicks bookmarklet → content auto-fills and formats
- Polling auto-stops after receiving HTML to prevent overwriting; single-slot in-memory store with 60-second expiry
- CORS enabled with preflight OPTIONS handler for cross-origin XHR from zyBooks

## Roadmap

### Cell-Splitting Improvement (Notebook Generator)
Use structural markers for intelligent cell splitting in .ipynb output:
- "Feedback?" after every content block = most reliable cell boundary
- Section headers (h3) = major section boundaries
- "PARTICIPATION ACTIVITY" / "CHALLENGE ACTIVITY" = activity boundaries
- "Figure X.X.X" / "Construct X.X.X" = code example boundaries
- Pattern: Header → Text → Feedback? → Figure → Feedback? → Activity → Feedback?

### HTML Paste (implemented)
Parses raw zyBooks page HTML using DOM selectors for maximum accuracy:
- Uses browser DOMParser API (client-side processing)
- Strips unwanted elements (nav, toolbar, feedback, watermarks, chevrons, iframes)
- Extracts section titles from `h1.zybook-section-title`
- Walks `.section-content-resources-container` children to find content blocks
- Processes `html-content-resource` blocks for prose text (h2-h4, paragraphs, lists)
- Processes `static-container` blocks for figures with code tables (code + console output)
- Processes `interactive-activity-container` blocks for participation/challenge activities
- Extracts questions from `.question-set-question` with labels and embedded code
- Inline formatting: bold terms (`span.term`), inline code (`<code>`), emphasis
- Code extraction: strips `<span>` syntax highlighting from `div.code > div.highlight > pre`
- Output extraction: reads from `div.console > pre` or second table column

### AI Integration (Future)
- AI-powered code block detection for ambiguous text pastes
- Fill-in-the-blank reconstruction for Regular Paste mode
- OpenAI API integration

### Google Drive Integration (Future)
- Direct upload of .ipynb to Google Drive / Colab

## Notion Integration

- Connected via Replit connector (conn_notion_01KBSDYSFRNDYQGDCYTS324AKY)
- `server/notion.ts` — Notion client module with markdown-to-Notion-blocks converter
- Permissions: user:read/write, content:read/write, workspace:read/write
- API routes:
  - `GET /api/notion/pages` — Lists accessible Notion pages for parent selection
  - `POST /api/notion/send` — Converts markdown to Notion blocks and creates a new page
- Markdown-to-Notion conversion supports: headings (H1-H3), paragraphs, code blocks (with language), bullet lists, numbered lists, inline formatting (bold, italic, code)
- UI: "Send to Notion" button opens a modal to pick parent page, then sends formatted content

## Recent Changes

### Challenge Activity Instructions + Ace Editor Code (latest)
- `<zyinstructions>` custom tag now handled in `walkContentNodes` — extracts direct text nodes for instruction text
- `<pre>` without `<code>` child now extracted as code blocks (example output like `*****\n*****`)
- Ace editor starter code extracted from `.ace_text-layer .ace_line` elements in `extractChallengeContent`
- `.ace-editor-container` and `.code-editor` removed from `removeUnwantedElements` removal list
- Ace editor elements skipped in `walkContentNodes` to prevent duplication in prose
- Test count: 24 (added CA instructions + Ace editor extraction test)

### Animation Content Extraction
- `extractAnimationContent()` prioritizes `.assistive-text` divs for step-by-step descriptions + code
- Falls back to `pre.highlight.text-object` and positioned `.animation-text-object` divs
- `.assistive-text` NOT in `removeUnwantedElements` — it contains animation content

### HTML Parser Rules
- `.question-container` must NOT be in `removeUnwantedElements` (answer options live there)
- `replaceInputsWithBlanks()` must be called BEFORE `removeUnwantedElements()` in `formatHtmlPaste`

## User Workflow & Preferences

- **Primary workflow**: HTML paste from zyBooks → format → send to Notion → use with Perplexity AI for guided study
- **Perplexity integration**: User copies formatted Notion pages into Perplexity Spaces to work through PAs/CAs step-by-step with AI tutoring
- **Content accuracy is critical**: The formatted output needs to preserve all instructions, code, answer choices, and example outputs since it's used as the study reference
- **Published URL**: https://zy-books-formatter.replit.app

## GitHub

Repository: https://github.com/CaseyWongWc/zybooks-formatter
Branch: main2

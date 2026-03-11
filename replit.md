# zyBooks Formatter

## Overview

The zyBooks Formatter is a web-based text formatting tool designed to convert raw content pasted from zyBooks textbooks into clean, readable Markdown. This processed content can then be used to generate Colab-ready Jupyter notebooks or sent to Notion. The project aims to provide students with a streamlined way to extract and utilize educational content for study, particularly when integrated with AI tutoring platforms like Perplexity AI.

## User Preferences

- **Primary workflow**: HTML paste from zyBooks → format → send to Notion → use with Perplexity AI for guided study
- **Perplexity integration**: User copies formatted Notion pages into Perplexity Spaces to work through PAs/CAs step-by-step with AI tutoring
- **Content accuracy is critical**: The formatted output needs to preserve all instructions, code, answer choices, and example outputs since it's used as the study reference

## System Architecture

The application is a single-page web tool built with a frontend-only architecture, meaning all text processing and notebook generation occur client-side without the need for a backend database.

**Technology Stack:**
- **Frontend Framework:** React
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI

**Core Features:**
- **Input/Output:** Features input and output text areas for pasting raw zyBooks content and displaying formatted Markdown.
- **Paste Modes:** Supports three input modes:
    - **Regular Paste:** For plain text copied directly from zyBooks (Ctrl+A, Ctrl+C).
    - **Copy as Markdown:** For content pasted using a "Copy as Markdown" browser extension, which preserves more structure but requires artifact cleanup.
    - **HTML Paste:** Parses raw zyBooks page HTML using DOM selectors for maximum accuracy, stripping unwanted elements and extracting structured content.
- **Content Cleanup:** The formatter intelligently removes navigation elements, assignment metadata, UI controls, animation descriptions, interactive elements, code editor artifacts, and excess whitespace. It preserves important structural elements like activity headers, construct/figure labels, section titles, educational content, code examples, and fill-in-the-blank placeholders.
- **Notebook Generation:** Generates `.ipynb` files (nbformat 4) ready for Google Colab. It intelligently splits cleaned Markdown into separate cells based on section headings and activity headers, creating code cells for triple-backtick code blocks and including Colab-specific metadata.
- **Debug/Preview Panels:** When in HTML Paste mode, a "Show Previews" toggle reveals an HTML Preview (sandboxed iframe) and a Markdown Preview (rendered via `marked.js` and `DOMPurify` for security).
- **Bookmarklet:** Provides a browser bookmarklet for one-click content import from zyBooks pages into the formatter application.

**Design Patterns:**
- **Client-Side Processing:** All intensive operations (regex cleanup, HTML parsing, notebook generation) are performed in the user's browser, ensuring scalability and privacy.
- **Stateless Design:** No user data or content is persisted on a server, aligning with its role as a transformation tool.

## Session Mode (Activity Accumulation)

- `client/src/lib/session.ts` — Session state types, localStorage persistence, activity detection, similarity computation, and combined document generation
- Toggle "Session Mode" button in header opens a modal to enter section ID (e.g., "6.3")
- When active: Format button becomes "Capture", each paste/bookmarklet submission appends to accumulator
- Session panel shows captured activity badges with timestamps and remove buttons
- Output panel shows running combined document (updates after each capture)
- "End Session" combines all activities into a single markdown document with section header and footer
- Session persists in localStorage; resume/discard prompt on page reload
- Duplicate detection: warns if new content is >80% similar to last captured activity (Jaccard word similarity)
- Auto-detects activity labels (PA/CA X.X.X) and section titles from formatted content
- Single-paste mode (session OFF) works exactly as before — no regressions

## API Mode (Direct zyBooks API Fetch)

- Fourth paste mode tab in the UI — bypasses paste/regex/HTML parsing entirely
- `GET /api/zybooks-section` — Server-side proxy to `zyserver.zybooks.com/v1/zybook/{code}/chapter/{ch}/section/{sec}` (solves CORS)
- `POST /api/zybooks-json` — Browser control endpoint that accepts raw JSON and stores via bookmarklet pipeline
- `client/src/lib/json-converter.ts` — Converts `content_resources[]` array to markdown with intelligent handling of all zyBooks resource types:
  - **html**: Attributed string arrays `[{text, attributes}]` → clean markdown
  - **multiple_choice**: Questions with numbered choices and correct answer markers (✓)
  - **container**: Aside/elaboration blocks rendered as blockquotes
  - **zystudio**: Challenge activities with top-level instructions
  - **custom** resources dispatched by `payload.tool`:
    - `python-tutor-v5`: Alt text + runnable trace code
    - `zyAnimator`: Animation descriptions with alt text
    - `homeworkSystem`: Instructions + given/suffix code blocks
    - `CodeWriting`: **Smart renderer** that parses Python randomization data to extract all problem variants grouped by category (e.g., 14 conversion types across Mass/Length/Volume/Temperature, 5 geometric shapes with measurements/formulas), shows task/explanation patterns with readable placeholders, and displays code structure templates
    - `codeOutput`: Multi-level "what is the output?" challenges with code blocks; **template placeholder resolution** resolves `${...}` variables to concrete first-example values from Python randomization params (e.g., `state[0:4]` instead of `state[0:${end_index}]`); handles `pick_from()`, `pick_from_range()`, `min()`, `random.sample()`, named list tracking, nested list-of-lists, derived computations (`end_index_minus`, `char1`, `char2`, `stride`, `step_phrase_1`, negative indices, ordinals); toggle via `&resolve_templates=false` query param to keep raw templates
    - `ParsonsCodingPA`: Parsons problems with prompt and solution code
    - `defnMatch`: Term-definition matching activities
    - `CodingProgression`: Multi-level coding challenges
    - `ProgressionPlayerInteractiveAndAccessible`: Interactive progression activities
    - `arrangeInst`: Drag-and-drop instruction arrangement with fixed + sortable code blocks
  - **zystudio** (zyLab) resources: Lab instructions with HTML-to-markdown conversion + test case table (input/expected output/points), separates visible vs hidden tests
  - **short_answer** resources: Question text with text_before/text_after context, correct answers, hints, and explanations; handles code blocks in context fields and multi-line answers
  - **detect_answer** resources: Content extraction with alt text
  - **image** resources: Figure captions with alt text
  - All `alt_text` fields run through HTML stripper (fixes entity/tag leaks)
  - Full Chapter 1-8 scan: 143 sections, 736K chars clean markdown, 0 errors, 0 HTML leaks
- API Mode UI: auth token (password field, persisted in localStorage), zybook code (persisted, default: CPPCS2520NguyenSpring2026), chapter/section number inputs
- Works with Session Mode — "Fetch & Capture" when session is active
- Bookmarklet polling auto-detects `_apiMode` JSON payloads and routes to JSON converter instead of HTML parser
- Auth token stored only in browser localStorage, never in server storage
- **Token Management** (auto-refresh):
  - `POST /api/token` — Store refresh_token once; server auto-refreshes auth tokens before they expire
  - `GET /api/token/status` — Check if token is configured, when it expires, hours remaining
  - `DELETE /api/token` — Clear stored tokens
  - Auto-retry: If a 401 is received during fetch, automatically refreshes token and retries
  - zyBooks refresh endpoint: `GET https://zyserver.zybooks.com/v1/refresh?refresh_token=X`
  - Refresh tokens are long-lived (no expiry); auth tokens expire in ~24h
  - **Persistent storage**: Tokens saved to `.data/zybooks_tokens.json` (file-based) — survives server restarts and deploys; no more manual re-seeding after publish
- Server-side markdown endpoint: `GET /api/zybooks-markdown` — fetches and converts in one call; uses stored token if no explicit auth provided
- **LLM API access**: `GET /api` returns full API guide with all endpoints, params, and quickstart instructions
- Colab notebook template: `GET /api/notebook-template` — downloads .ipynb with `fetch_section()`, `fetch_chapter()`, `save_chapter_md()`, `publish_to_notion()` functions; auto-detects server-stored token
- Notebook pushed to GitHub: `notebooks/zybooks_study_notebook.ipynb` — opens directly in Colab via GitHub link

## Submit Page (Browser Control Integration)

- `GET /submit` — Standalone HTML form page at `/submit` for browser control automation
- Big textarea for pasting zyBooks content, source URL field, paste mode selector
- Submits via POST to `/api/bookmarklet` — same pipeline as bookmarklet
- Browser control can navigate to `/submit`, fill the textarea, and click Submit without needing POST capability or DevTools
- Shows success/error status messages after submission

## Bookmarklet API

- `POST /api/bookmarklet` — Receives HTML content from bookmarklet or `/submit` form (5MB limit, CORS enabled)
- `GET /api/bookmarklet/pending` — Polls for pending content (60-second expiry, consumed on read)
- Both endpoints confirmed working on local and deployed app

## External Dependencies

- **React:** Frontend JavaScript library for building user interfaces.
- **Tailwind CSS:** Utility-first CSS framework for styling.
- **Shadcn UI:** Reusable UI components.
- **marked.js:** Markdown parser for rendering Markdown preview.
- **DOMPurify:** HTML sanitizer to prevent XSS attacks in the HTML preview.
- **Notion API:** Used for integrating with Notion, allowing users to send formatted Markdown content as Notion pages.
    - Replit connector: `conn_notion_01KBSDYSFRNDYQGDCYTS324AKY`
    - Permissions: `user:read/write`, `content:read/write`, `workspace:read/write`
- **Google Colab:** The generated `.ipynb` files are designed to be directly compatible with Google Colab.
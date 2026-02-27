# zyBooks Formatter

A web-based text formatter that cleans zyBooks textbook page pastes into clean, readable markdown and generates Colab-ready Jupyter notebooks.

## Overview

Single-page tool with input/output textareas. Users paste raw zyBooks content, click Format, and get cleaned markdown output. They can then Copy to clipboard or Download as a .ipynb notebook file ready for Google Colab.

## Architecture

- **Frontend-only processing**: All regex cleanup and notebook generation happens client-side
- **No database**: No persistence needed — this is a stateless text transformation tool
- **Stack**: React + Tailwind CSS + Shadcn UI components

## Key Files

- `client/src/lib/zybooks-formatter.ts` — Core regex cleanup engine with two paste modes
- `client/src/lib/notebook-generator.ts` — .ipynb notebook generation (nbformat 4)
- `client/src/pages/home.tsx` — Main formatter page with input/output textareas and mode toggle
- `client/src/App.tsx` — App router

## Paste Modes

The formatter supports two input modes via a UI toggle:

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
- Footer metadata (Activity summary, section feedback, completion details, thumbs up/down)
- Chapter navigation links and sidebar items
- Diagram labels and standalone pseudocode from animations
- Blob image references and checkmark images
- Code editor line numbers (standalone single digits)
- Excess whitespace

The formatter preserves:
- **PARTICIPATION ACTIVITY** headers (bolded)
- **CHALLENGE ACTIVITY** headers (bolded)
- Section titles and subsection headings
- Educational content and explanations
- Code examples and exercise prompts
- Question text and answer choices

## Notebook Generation

The .ipynb generator:
- Splits cleaned markdown into separate cells at section headings and activity headers
- Creates code cells for content inside triple-backtick code blocks
- Uses nbformat 4 (standard Jupyter format)
- Includes Colab metadata for direct opening in Google Colab
- Auto-generates filename from section title
- Python 3 kernel configured by default

## Known Limitations

- **Fill-in-the-blank inputs**: In participation activities with interactive input boxes (e.g., 5.5.6), the blank fields disappear entirely in the plain text paste with no marker. This is a future AI integration task.
- **Code figure tables**: The markdown mode extracts code from pipe tables but presents the code on one long line since the original line breaks are lost in the table format.

## GitHub

Repository: https://github.com/CaseyWongWc/zybooks-formatter

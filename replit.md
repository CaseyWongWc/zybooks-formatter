# zyBooks Formatter

A web-based text formatter that cleans zyBooks textbook page pastes into clean, readable markdown and generates Colab-ready Jupyter notebooks.

## Overview

Single-page tool with input/output textareas. Users paste raw zyBooks content, click Format, and get cleaned markdown output. They can then Copy to clipboard or Download as a .ipynb notebook file ready for Google Colab.

## Architecture

- **Frontend-only processing**: All regex cleanup and notebook generation happens client-side
- **No database**: No persistence needed — this is a stateless text transformation tool
- **Stack**: React + Tailwind CSS + Shadcn UI components

## Key Files

- `client/src/lib/zybooks-formatter.ts` — Core regex cleanup engine
- `client/src/lib/notebook-generator.ts` — .ipynb notebook generation (nbformat 4)
- `client/src/pages/home.tsx` — Main formatter page with input/output textareas
- `client/src/App.tsx` — App router

## Cleanup Patterns

The formatter removes:
- Navigation breadcrumbs (My library, Skip to main content, etc.)
- Assignment metadata (Students, Due dates, Activities, Participation)
- UI controls (Start, 2x speed, Captions, Feedback?, keyboard arrows)
- Animation/figure descriptions (Step 1:, Step 2:, Static Figure:)
- Interactive elements (Next value, Increment, Store value)
- Footer metadata (Activity summary, section feedback, completion details)
- Chapter navigation links and sidebar items
- Diagram labels and standalone pseudocode from animations
- Blob image references
- Excess whitespace

The formatter preserves:
- **Participation activity** headers (bolded)
- **Challenge activity** headers (bolded)
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

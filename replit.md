# zyBooks Formatter

A web-based text formatter that cleans zyBooks textbook page pastes into clean, readable markdown.

## Overview

Single-page tool with input/output textareas. Users paste raw zyBooks content, click Format, and get cleaned markdown output with a Copy to Clipboard button.

## Architecture

- **Frontend-only processing**: All regex cleanup happens client-side in `client/src/lib/zybooks-formatter.ts`
- **No database**: No persistence needed — this is a stateless text transformation tool
- **Stack**: React + Tailwind CSS + Shadcn UI components

## Key Files

- `client/src/lib/zybooks-formatter.ts` — Core regex cleanup engine
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
- Blob image references
- Excess whitespace

The formatter preserves:
- **Participation activity** headers (bolded)
- **Challenge activity** headers (bolded)
- Section titles and subsection headings
- Educational content and explanations
- Code examples
- Question text and answer choices

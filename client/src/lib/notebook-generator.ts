interface NotebookCell {
  cell_type: "markdown" | "code";
  metadata: Record<string, unknown>;
  source: string[];
  execution_count?: null;
  outputs?: never[];
}

interface Notebook {
  nbformat: 4;
  nbformat_minor: 5;
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
    colab?: {
      name: string;
      provenance: never[];
    };
  };
  cells: NotebookCell[];
}

function splitIntoSourceLines(text: string): string[] {
  const lines = text.split("\n");
  return lines.map((line, i) => (i < lines.length - 1 ? line + "\n" : line));
}

function makeMarkdownCell(content: string): NotebookCell {
  return {
    cell_type: "markdown",
    metadata: {},
    source: splitIntoSourceLines(content.trim()),
  };
}

function makeCodeCell(content: string): NotebookCell {
  return {
    cell_type: "code",
    metadata: {},
    source: splitIntoSourceLines(content.trim()),
    execution_count: null,
    outputs: [],
  };
}

export function markdownToNotebook(markdown: string, title?: string): Notebook {
  const cells: NotebookCell[] = [];

  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const beforeCode = markdown.slice(lastIndex, match.index).trim();
    if (beforeCode) {
      cells.push(makeMarkdownCell(beforeCode));
    }

    const codeContent = match[2];
    if (codeContent.trim()) {
      cells.push(makeCodeCell(codeContent));
    }

    lastIndex = match.index + match[0].length;
  }

  const remaining = markdown.slice(lastIndex).trim();
  if (remaining) {
    const sections = splitMarkdownBySections(remaining);
    cells.push(...sections);
  }

  if (cells.length === 0) {
    const sections = splitMarkdownBySections(markdown);
    cells.push(...sections);
  }

  if (cells.length === 0) {
    cells.push(makeMarkdownCell(markdown));
  }

  const notebookName = title || extractTitle(markdown) || "zyBooks Notes";

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.10.0",
      },
      colab: {
        name: notebookName,
        provenance: [],
      },
    },
    cells,
  };
}

function splitMarkdownBySections(text: string): NotebookCell[] {
  const cells: NotebookCell[] = [];
  const lines = text.split("\n");
  let currentChunk: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isActivityHeader = /^\*\*(PARTICIPATION|CHALLENGE)\s+ACTIVITY\*\*$/i.test(line.trim());
    const isSectionHeading = /^#{1,3}\s+/.test(line) || /^\d+\.\d+(\.\d+)?[\s:]/.test(line);
    const isMajorBreak = isActivityHeader || isSectionHeading;

    if (isMajorBreak && currentChunk.length > 0) {
      const content = currentChunk.join("\n").trim();
      if (content) {
        cells.push(makeMarkdownCell(content));
      }
      currentChunk = [line];
    } else {
      currentChunk.push(line);
    }
  }

  if (currentChunk.length > 0) {
    const content = currentChunk.join("\n").trim();
    if (content) {
      cells.push(makeMarkdownCell(content));
    }
  }

  return cells;
}

function extractTitle(markdown: string): string | null {
  const headingMatch = markdown.match(/^#+\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  const sectionMatch = markdown.match(/^(\d+\.\d+\s+.+)$/m);
  if (sectionMatch) return sectionMatch[1].trim();

  return null;
}

export function downloadNotebook(notebook: Notebook, filename: string): void {
  const json = JSON.stringify(notebook, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ipynb") ? filename : filename + ".ipynb";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateFilename(markdown: string): string {
  const title = extractTitle(markdown);
  if (title) {
    const clean = title
      .replace(/[^a-zA-Z0-9\s._-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);
    return clean + ".ipynb";
  }
  return "zybooks_notes.ipynb";
}

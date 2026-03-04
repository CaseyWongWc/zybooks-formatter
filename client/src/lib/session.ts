export interface ActivityBlock {
  index: number;
  label?: string;
  rawInput: string;
  formattedOutput: string;
  pasteMode: 'regular' | 'markdown' | 'html';
  capturedAt: string;
}

export interface SessionState {
  active: boolean;
  sectionId: string;
  sectionTitle?: string;
  activities: ActivityBlock[];
  startedAt: string;
}

const STORAGE_KEY = 'zybooks-formatter-session';

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed.active || !parsed.sectionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function createSession(sectionId: string): SessionState {
  return {
    active: true,
    sectionId,
    activities: [],
    startedAt: new Date().toISOString(),
  };
}

export function detectActivityLabel(formattedOutput: string): string | undefined {
  const paMatch = formattedOutput.match(/(?:\*\*PARTICIPATION ACTIVITY\*\*)\s*\n+\s*(\d+\.\d+\.\d+)[:\s]/);
  if (paMatch) return `PA ${paMatch[1]}`;

  const caMatch = formattedOutput.match(/(?:\*\*CHALLENGE ACTIVITY\*\*)\s*\n+\s*(\d+\.\d+\.\d+)[:\s]/);
  if (caMatch) return `CA ${caMatch[1]}`;

  const sectionMatch = formattedOutput.match(/^#\s+(\d+\.\d+)\s+/m);
  if (sectionMatch) return `Section ${sectionMatch[1]}`;

  return undefined;
}

export function detectSectionTitle(formattedOutput: string): string | undefined {
  const match = formattedOutput.match(/^#\s+\d+\.\d+\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

export function computeSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function combineActivities(session: SessionState): string {
  const parts: string[] = [];

  const title = session.sectionTitle
    ? `# Section ${session.sectionId} — ${session.sectionTitle}`
    : `# Section ${session.sectionId}`;
  parts.push(title);

  for (const activity of session.activities) {
    parts.push(activity.formattedOutput);
    parts.push('---');
  }

  if (parts[parts.length - 1] === '---') {
    parts.pop();
  }

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  parts.push(`\n---\n*Captured ${session.activities.length} activities on ${date}*`);

  return parts.join('\n\n');
}

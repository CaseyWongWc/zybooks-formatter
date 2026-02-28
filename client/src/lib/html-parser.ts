export function formatHtmlPaste(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const parts: string[] = [];

  removeUnwantedElements(doc);

  const sectionTitle = doc.querySelector('h1.zybook-section-title');
  if (sectionTitle) {
    const titleText = (sectionTitle.textContent || '').replace(/\s+/g, ' ').trim();
    parts.push(`# ${titleText}`);
  }

  const container = doc.querySelector('.section-content-resources-container');
  if (!container) {
    return parts.join('\n\n') || fallbackTextExtraction(doc);
  }

  const resources = container.querySelectorAll(
    '.content-resource, .interactive-activity-container, .static-container'
  );

  const processed = new Set<Element>();

  resources.forEach(el => {
    if (processed.has(el)) return;

    const ancestor = findProcessedAncestor(el, processed);
    if (ancestor) return;

    const htmlEl = el as HTMLElement;
    const block = processElement(htmlEl);
    if (block) {
      parts.push(block);
      processed.add(el);
    }
  });

  let result = parts.filter(p => p.trim()).join('\n\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

function findProcessedAncestor(el: Element, processed: Set<Element>): Element | null {
  let parent = el.parentElement;
  while (parent) {
    if (processed.has(parent)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function removeUnwantedElements(doc: Document): void {
  const selectors = [
    '.zb-nav-menu', '.top-toolbar', '.osano-cm-window',
    '.zb-feedback', '.assignment-completion-summary-card',
    '.section-announcement', '.notify-outlet',
    '.activity-watermark', '.chevron-container',
    '.title-bar-chevron-container', '.check-button',
    '.show-answer-button', '.zb-explanation',
    '.zb-input-container', 'iframe',
    'style', 'script', 'link',
    '.resizable-bar'
  ];
  selectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });
}

function processElement(el: HTMLElement): string | null {
  if (shouldSkip(el)) return null;

  if (isInteractiveActivity(el)) {
    return processActivity(el);
  }

  if (el.classList.contains('static-container') ||
      (el.classList.contains('container-content-resource') && !el.classList.contains('interactive-activity-container'))) {
    return processStaticContainer(el);
  }

  if (el.classList.contains('html-content-resource') ||
      el.classList.contains('content-resource')) {
    return processHtmlContent(el);
  }

  return null;
}

function shouldSkip(el: HTMLElement): boolean {
  if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return true;
  const skipClasses = [
    'zb-feedback', 'assignment-completion-summary-card',
    'section-announcement', 'notify-outlet',
    'activity-watermark', 'chevron-container',
    'zb-nav-menu', 'top-toolbar', 'osano-cm-window'
  ];
  for (const cls of skipClasses) {
    if (el.classList.contains(cls)) return true;
  }
  if (el.textContent?.trim() === '') return true;
  if (el.textContent?.trim() === 'Feedback?') return true;
  return false;
}

function isInteractiveActivity(el: HTMLElement): boolean {
  return el.classList.contains('interactive-activity-container') ||
    (el.classList.contains('participation') && el.querySelector('.activity-title') !== null) ||
    (el.classList.contains('challenge') && el.querySelector('.activity-title') !== null);
}

function processHtmlContent(el: HTMLElement): string | null {
  const parts: string[] = [];
  walkContentNodes(el, parts);
  const result = parts.join('\n\n');
  return result.trim() || null;
}

function walkContentNodes(el: Element, parts: string[]): void {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;

    if (child.classList?.contains('code') && child.querySelector('.highlight pre')) {
      continue;
    }
    if (child.classList?.contains('console')) continue;
    if (child.classList?.contains('table') && child.querySelector('.code')) continue;

    const tag = child.tagName;
    if (tag === 'H2' || tag === 'H3' || tag === 'H4') {
      const text = child.textContent?.trim();
      if (text) {
        const level = tag === 'H2' ? '##' : tag === 'H3' ? '###' : '####';
        parts.push(`${level} ${text}`);
      }
    } else if (tag === 'P') {
      const text = extractInlineText(child);
      if (text.trim()) parts.push(text.trim());
    } else if (tag === 'UL' || tag === 'OL') {
      const items = child.querySelectorAll(':scope > li');
      items.forEach(li => {
        const text = extractInlineText(li).trim();
        if (text) parts.push(`- ${text}`);
      });
    } else if (tag === 'TABLE') {
      continue;
    } else if (tag === 'DIV' || tag === 'SECTION' || tag === 'SPAN') {
      walkContentNodes(child, parts);
    }
  }
}

function extractInlineText(el: Element): string {
  let text = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as HTMLElement;
      if (child.tagName === 'BR') {
        text += '\n';
      } else if (child.tagName === 'CODE') {
        text += '`' + child.textContent + '`';
      } else if (child.classList?.contains('term')) {
        text += '**' + child.textContent + '**';
      } else if (child.tagName === 'STRONG' || child.tagName === 'B') {
        text += '**' + extractInlineText(child) + '**';
      } else if (child.tagName === 'EM' || child.tagName === 'I') {
        text += '*' + extractInlineText(child) + '*';
      } else if (child.tagName === 'A') {
        text += extractInlineText(child);
      } else if (child.tagName === 'IMG') {
        const alt = child.getAttribute('alt') || '';
        const src = child.getAttribute('src') || '';
        if (src) text += `![${alt}](${src})`;
      } else if (child.tagName === 'SUB') {
        text += extractInlineText(child);
      } else if (child.tagName === 'SUP') {
        text += extractInlineText(child);
      } else {
        text += extractInlineText(child);
      }
    }
  }
  return text;
}

function processStaticContainer(el: HTMLElement): string | null {
  const parts: string[] = [];

  const titleEl = el.querySelector('.static-container-title');
  if (titleEl) {
    const title = titleEl.textContent?.replace(/\s+/g, ' ').trim();
    if (title) parts.push(`**${title}**`);
  }

  const instructionsEl = el.querySelector('.activity-instructions');
  if (instructionsEl) {
    const instrParts: string[] = [];
    walkContentNodes(instructionsEl, instrParts);
    const instrText = instrParts.join('\n\n').trim() || extractInlineText(instructionsEl).trim();
    if (instrText) parts.push(instrText);
  }

  const codeBlocks = extractAllCodeFromElement(el);
  for (const block of codeBlocks) {
    parts.push(block.code);
    if (block.output) {
      parts.push('Output:\n' + block.output);
    }
  }

  if (codeBlocks.length === 0) {
    const contentParts: string[] = [];
    const payload = el.querySelector('.static-container-payload');
    if (payload) {
      walkContentNodes(payload, contentParts);
    }
    const contentText = contentParts.join('\n\n').trim();
    if (contentText) parts.push(contentText);
  }

  const result = parts.join('\n\n');
  return result.trim() || null;
}

function extractAllCodeFromElement(el: HTMLElement): Array<{ code: string; output: string | null }> {
  const results: Array<{ code: string; output: string | null }> = [];

  const tables = el.querySelectorAll('.table table, table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const tds = row.querySelectorAll('td');
      if (tds.length >= 1) {
        const codeTd = tds[0];
        const codeEl = codeTd.querySelector('.code .highlight pre, .highlight pre');
        if (codeEl) {
          const codeText = extractCodeText(codeEl as HTMLElement);
          if (codeText.trim()) {
            let output: string | null = null;
            if (tds.length >= 2) {
              const outputTd = tds[tds.length - 1];
              const consolePre = outputTd.querySelector('.console pre, pre');
              if (consolePre && !outputTd.querySelector('.code')) {
                output = consolePre.textContent?.trim() || null;
              } else if (!outputTd.querySelector('.code')) {
                const text = outputTd.textContent?.trim();
                if (text) output = text;
              }
            }
            results.push({
              code: '```python\n' + codeText + '\n```',
              output
            });
          }
        }
      }
    });
  });

  if (results.length === 0) {
    const pres = el.querySelectorAll('.code .highlight pre');
    pres.forEach(pre => {
      const codeText = extractCodeText(pre as HTMLElement);
      if (codeText.trim()) {
        results.push({
          code: '```python\n' + codeText + '\n```',
          output: null
        });
      }
    });
  }

  return results;
}

function extractCodeText(pre: HTMLElement): string {
  let code = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      code += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
      }
    }
  };
  walk(pre);
  return code.replace(/^\n+/, '').replace(/\n+$/, '');
}

function processActivity(el: HTMLElement): string | null {
  const parts: string[] = [];

  const typeEl = el.querySelector('.activity-type');
  const titleEl = el.querySelector('.activity-title');

  let activityType = '';
  if (typeEl) {
    activityType = typeEl.textContent?.replace(/\s+/g, ' ').trim().toUpperCase() || '';
  }

  if (el.classList.contains('participation') || activityType.includes('PARTICIPATION')) {
    activityType = 'PARTICIPATION ACTIVITY';
  } else if (el.classList.contains('challenge') || activityType.includes('CHALLENGE')) {
    activityType = 'CHALLENGE ACTIVITY';
  }

  if (activityType) parts.push(`**${activityType}**`);

  if (titleEl) {
    const title = titleEl.textContent?.replace(/\s+/g, ' ').trim();
    if (title) parts.push(title);
  }

  const instructionsEl = el.querySelector('.activity-instructions');
  if (instructionsEl) {
    const instrParts: string[] = [];
    walkContentNodes(instructionsEl, instrParts);
    const instrText = instrParts.join('\n\n').trim() || extractInlineText(instructionsEl).trim();
    if (instrText) parts.push(instrText);
  }

  const questions = el.querySelectorAll('.question-set-question');
  questions.forEach((q, idx) => {
    const qParts: string[] = [];
    const labelEl = q.querySelector('.label');
    const textEl = q.querySelector('.text');

    const label = labelEl?.textContent?.trim() || `${idx + 1})`;
    qParts.push(label);

    if (textEl) {
      const qText = extractQuestionText(textEl as HTMLElement);
      if (qText) qParts.push(qText);
    }

    parts.push(qParts.join('\n'));
  });

  const result = parts.join('\n\n');
  return result.trim() || null;
}

function extractQuestionText(el: HTMLElement): string {
  const parts: string[] = [];

  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) parts.push(text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as HTMLElement;
      if (child.tagName === 'BR') {
        continue;
      }

      const codeHighlight = child.querySelector('.code .highlight pre, .highlight pre');
      if (codeHighlight) {
        const code = extractCodeText(codeHighlight as HTMLElement);
        if (code.trim()) parts.push('```python\n' + code + '\n```');
      } else if (child.classList?.contains('code') && child.querySelector('.highlight pre')) {
        const pre = child.querySelector('.highlight pre') as HTMLElement;
        if (pre) {
          const code = extractCodeText(pre);
          if (code.trim()) parts.push('```python\n' + code + '\n```');
        }
      } else {
        const text = extractInlineText(child).trim();
        if (text) parts.push(text);
      }
    }
  }

  return parts.join('\n');
}

function fallbackTextExtraction(doc: Document): string {
  const body = doc.body;
  if (!body) return '';
  return body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

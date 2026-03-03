export function formatHtmlPaste(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const parts: string[] = [];

  replaceInputsWithBlanks(doc);
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

function replaceInputsWithBlanks(doc: Document): void {
  doc.querySelectorAll('.zb-input-container').forEach(container => {
    const input = container.querySelector('input');
    const placeholder = doc.createTextNode(' [___] ');
    if (input) {
      container.replaceWith(placeholder);
    }
  });
  doc.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
    if (!(input as HTMLElement).closest('.answer, [role="radio"]')) {
      const placeholder = doc.createTextNode(' [___] ');
      input.replaceWith(placeholder);
    }
  });
}

function removeUnwantedElements(doc: Document): void {
  const selectors = [
    '.zb-nav-menu', '.top-toolbar', '.osano-cm-window',
    '.zb-feedback', '.assignment-completion-summary-card',
    '.section-announcement', '.notify-outlet',
    '.activity-watermark', '.chevron-container',
    '.title-bar-chevron-container', '.check-button',
    '.show-answer-button', '.zb-explanation',
    'iframe',
    'style', 'script', 'link',
    '.resizable-bar',
    '.segmented-control',
    '.zb-simple-expandable', '.levels-bar',
    '.check-next-container', '.view-solution-container',
    '.reset-template-button-container', '.editor-indents',
    '.ace-editor-container', '.code-editor',
    '.zyante-progression-start-reset-buttons-container',
    '.zyante-progression-status-bar',
    '.zyante-progression-modal-cover > style'
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
    if (child.classList?.contains('assistive-text')) continue;
    if (child.classList?.contains('animation-player')) continue;
    if (child.classList?.contains('animation-canvas')) continue;
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
    } else if (tag === 'PRE') {
      const codeChild = child.querySelector('code');
      if (codeChild) {
        const codeText = codeChild.textContent?.trim();
        if (codeText) parts.push('```\n' + codeText + '\n```');
      }
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

    const instrCodeBlocks = instructionsEl.querySelectorAll('.code .highlight pre');
    instrCodeBlocks.forEach(pre => {
      const codeText = extractCodeText(pre as HTMLElement);
      if (codeText.trim()) {
        parts.push('```python\n' + codeText + '\n```');
      }
    });
  }

  const animationContent = extractAnimationContent(el);
  if (animationContent) parts.push(animationContent);

  const questions = el.querySelectorAll('.question-set-question');
  if (questions.length > 0) {
    questions.forEach((q, idx) => {
      const qBlock = extractQuestion(q as HTMLElement, idx);
      if (qBlock) parts.push(qBlock);
    });
  }

  const challengeContent = extractChallengeContent(el);
  if (challengeContent) parts.push(challengeContent);

  const result = parts.join('\n\n');
  return result.trim() || null;
}

function extractAnimationContent(el: HTMLElement): string | null {
  const parts: string[] = [];

  const assistiveTexts = el.querySelectorAll('.assistive-text');
  for (let i = 0; i < assistiveTexts.length; i++) {
    const at = assistiveTexts[i] as HTMLElement;
    const raw = at.textContent?.trim() || '';
    if (!raw || raw.length < 20) continue;

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
    const meaningful: string[] = [];
    let inCode = false;
    const codeLines: string[] = [];

    for (const line of lines) {
      if (/^Begin Python code:?$/i.test(line)) {
        inCode = true;
        continue;
      }
      if (/^End Python code\.?$/i.test(line)) {
        if (codeLines.length > 0) {
          meaningful.push('```python\n' + codeLines.join('\n') + '\n```');
          codeLines.length = 0;
        }
        inCode = false;
        continue;
      }
      if (inCode) {
        codeLines.push(line);
        continue;
      }
      if (/^Static figure:$/i.test(line)) continue;
      meaningful.push(line);
    }
    if (codeLines.length > 0) {
      meaningful.push('```python\n' + codeLines.join('\n') + '\n```');
    }

    if (meaningful.length > 0) {
      parts.push(meaningful.join('\n\n'));
    }
  }

  if (parts.length > 0) return parts.join('\n\n');

  const highlightPre = el.querySelector('.highlight.text-object');
  if (highlightPre) {
    const codeText = extractCodeText(highlightPre as HTMLElement);
    if (codeText.trim()) {
      parts.push('```python\n' + codeText + '\n```');
    }
  }

  const caption = el.querySelector('.animation-caption');
  if (caption) {
    const capText = caption.textContent?.trim();
    if (capText) parts.push(capText);
  }

  const canvas = el.querySelector('.animation-canvas');
  if (canvas) {
    const textObjects = canvas.querySelectorAll('.animation-text-object');
    if (textObjects.length > 0) {
      interface TextItem { text: string; top: number; left: number; }
      const items: TextItem[] = [];
      textObjects.forEach(obj => {
        const text = obj.textContent?.trim();
        if (!text) return;
        const style = (obj as HTMLElement).getAttribute('style') || '';
        const topMatch = style.match(/top:\s*([\d.]+)px/);
        const leftMatch = style.match(/left:\s*([\d.]+)px/);
        items.push({
          text,
          top: topMatch ? parseFloat(topMatch[1]) : 0,
          left: leftMatch ? parseFloat(leftMatch[1]) : 0
        });
      });
      items.sort((a, b) => a.top - b.top || a.left - b.left);

      const groups: TextItem[][] = [];
      let currentGroup: TextItem[] = [];
      let lastTop = -999;
      for (const item of items) {
        if (Math.abs(item.top - lastTop) > 25) {
          if (currentGroup.length > 0) groups.push(currentGroup);
          currentGroup = [item];
        } else {
          currentGroup.push(item);
        }
        lastTop = item.top;
      }
      if (currentGroup.length > 0) groups.push(currentGroup);

      const lines: string[] = [];
      for (const group of groups) {
        group.sort((a, b) => a.left - b.left);
        lines.push(group.map(g => g.text).join('  '));
      }

      const filtered = lines.filter((line, i) => {
        if (!line.trim()) return false;
        if (i > 0 && line === lines[i - 1]) return false;
        return true;
      });

      if (filtered.length > 0) {
        parts.push('Animation content:\n' + filtered.join('\n'));
      }
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

function extractQuestion(q: HTMLElement, idx: number): string | null {
  const labelEl = q.querySelector('.label');
  const textEl = q.querySelector('.text');

  const label = labelEl?.textContent?.trim() || `${idx + 1})`;

  let questionLine = label;
  if (textEl) {
    const qText = extractQuestionText(textEl as HTMLElement);
    if (qText) {
      const lines = qText.split('\n');
      questionLine = `${label} ${lines[0]}`;
      const remainingLines = lines.slice(1).join('\n');
      if (remainingLines.trim()) {
        questionLine += '\n' + remainingLines;
      }
    }
  }

  const parts: string[] = [questionLine];

  const answerOptions = extractAnswerOptions(q);
  if (answerOptions) parts.push(answerOptions);

  const result = parts.join('\n');
  return result.trim() || null;
}

function extractAnswerOptions(q: HTMLElement): string | null {
  const options: string[] = [];

  const mcAnswers = q.querySelectorAll('.answer, .zb-radio-button, [role="radio"], .mc-answer, .multiple-choice-answer');
  if (mcAnswers.length > 0) {
    mcAnswers.forEach(ans => {
      const labelEl = ans.querySelector('.label, .text, .formatted-text, span:not(.zb-icon):not(.material-icons)');
      let text = '';
      if (labelEl) {
        text = labelEl.textContent?.trim() || '';
      }
      if (!text) {
        text = (ans as HTMLElement).textContent?.trim() || '';
        text = text.replace(/^(check_circle|radio_button_unchecked|radio_button_checked|circle)\s*/i, '').trim();
      }
      if (text) options.push(`- ○ ${text}`);
    });
  }

  if (options.length === 0) {
    const questionContainer = q.querySelector('.question-container');
    if (questionContainer) {
      const inputs = questionContainer.querySelectorAll('input[type="radio"]');
      if (inputs.length > 0) {
        inputs.forEach(input => {
          const parent = (input as HTMLElement).closest('.answer, label, div') || (input as HTMLElement).parentElement;
          if (parent) {
            let text = parent.textContent?.trim() || '';
            text = text.replace(/^(check_circle|radio_button_unchecked|radio_button_checked|circle)\s*/i, '').trim();
            if (text) options.push(`- ○ ${text}`);
          }
        });
      }
    }
  }

  if (options.length === 0) {
    const container = q.querySelector('.question-container, .answers');
    if (container) {
      const divs = container.querySelectorAll(':scope > div, :scope > label');
      divs.forEach(div => {
        const hasRadio = div.querySelector('input[type="radio"], .zb-radio, [role="radio"], .material-icons');
        if (hasRadio) {
          let text = div.textContent?.trim() || '';
          text = text.replace(/^(check_circle|radio_button_unchecked|radio_button_checked|circle)\s*/i, '').trim();
          text = text.replace(/(Check|Show answer|Feedback\?)$/i, '').trim();
          if (text) options.push(`- ○ ${text}`);
        }
      });
    }
  }

  return options.length > 0 ? options.join('\n') : null;
}

function extractQuestionText(el: HTMLElement): string {
  const parts: string[] = [];
  collectQuestionContent(el, parts);
  return parts.join('\n');
}

function collectQuestionContent(el: HTMLElement, parts: string[]): void {
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

      if (child.classList?.contains('code') && child.querySelector('.highlight pre, pre')) {
        const pre = child.querySelector('.highlight pre') || child.querySelector('pre');
        if (pre) {
          const code = extractCodeText(pre as HTMLElement);
          if (code.trim()) {
            parts.push('```python\n' + code + '\n```');
            continue;
          }
        }
      }

      if (child.tagName === 'DIV') {
        collectQuestionContent(child, parts);
      } else {
        const text = extractInlineText(child).trim();
        if (text) parts.push(text);
      }
    }
  }
}

function extractChallengeContent(el: HTMLElement): string | null {
  const parts: string[] = [];

  const typeOutputPrompt = el.querySelector('#prompt, p#prompt');
  if (typeOutputPrompt) {
    const promptText = typeOutputPrompt.textContent?.trim();
    if (promptText) parts.push(promptText);
  }

  const typeOutputCode = el.querySelector('.custom-tool-container .code:not(.highlight), .tool-container .code:not(.highlight)');
  if (typeOutputCode && !typeOutputCode.querySelector('.highlight')) {
    const codeText = typeOutputCode.textContent?.trim();
    if (codeText) {
      parts.push('```python\n' + codeText + '\n```');
    }
  }

  const parsonsInstr = el.querySelector('.reorderable-lists-instructions');
  if (parsonsInstr) {
    const instrParts: string[] = [];
    walkContentNodes(parsonsInstr, instrParts);
    const instrText = instrParts.join('\n\n').trim();
    if (instrText) parts.push(instrText);

    const unusedBlocks = el.querySelectorAll('.sortable[data-list-name="unused"] .block');
    if (unusedBlocks.length > 0) {
      const codeLines: string[] = [];
      unusedBlocks.forEach(block => {
        const lineText = block.textContent?.trim();
        if (lineText) codeLines.push(lineText);
      });
      if (codeLines.length > 0) {
        parts.push('Available code blocks:\n```python\n' + codeLines.join('\n') + '\n```');
      }
    }

    const usedBlocks = el.querySelectorAll('.sortable[data-list-name="used"] .block');
    if (usedBlocks.length > 0) {
      const codeLines: string[] = [];
      usedBlocks.forEach(block => {
        const lineText = block.textContent?.trim();
        if (lineText) codeLines.push(lineText);
      });
      if (codeLines.length > 0) {
        parts.push('Starting code:\n```python\n' + codeLines.join('\n') + '\n```');
      }
    }
  }

  const codeWritingPrompt = el.querySelector('.code-writing-prompt');
  if (codeWritingPrompt) {
    const promptParts: string[] = [];
    walkContentNodes(codeWritingPrompt, promptParts);
    const promptText = promptParts.join('\n\n').trim();
    if (promptText) parts.push(promptText);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

function fallbackTextExtraction(doc: Document): string {
  const body = doc.body;
  if (!body) return '';
  return body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

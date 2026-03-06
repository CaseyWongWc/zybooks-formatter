export interface ZyBooksContentResource {
  id: string | number;
  type: string;
  payload: any;
  caption?: string | null;
  instructions?: string | null;
  activity_type?: string | null;
  parts?: number;
}

export interface ZyBooksSectionResponse {
  section: {
    title?: string;
    content_resources: ZyBooksContentResource[];
  };
}

function extractAttributedText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          return typeof item.text === 'string' ? item.text : extractAttributedText(item.text);
        }
        return '';
      })
      .join('');
  }
  if (typeof val === 'object' && 'text' in val) {
    return extractAttributedText(val.text);
  }
  return '';
}

function decodeEntities(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  let text = html;

  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    return '\n```python\n' + decodeEntities(code).trim() + '\n```\n';
  });
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return '\n```\n' + decodeEntities(code).trim() + '\n```\n';
  });
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, (_, code) => '`' + decodeEntities(code) + '`');

  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1');

  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n');
  text = text.replace(/<zyInstructions[^>]*>/gi, '');
  text = text.replace(/<\/zyInstructions>/gi, '');
  text = text.replace(/<[^>]+>/g, '');

  text = decodeEntities(text);
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function cleanText(val: any): string {
  const raw = extractAttributedText(val);
  return stripHtml(raw);
}

export function convertZybooksJson(data: ZyBooksSectionResponse, chapter?: number, section?: number): string {
  const lines: string[] = [];
  const sectionTitle = data.section?.title || '';

  if (sectionTitle || (chapter && section)) {
    const header = sectionTitle
      ? `${chapter || '?'}.${section || '?'} ${sectionTitle}`
      : `Section ${chapter}.${section}`;
    lines.push(`## ${header}`, '');
  }

  const resources = data.section?.content_resources || [];

  for (const resource of resources) {
    try {
      const converted = convertResource(resource);
      if (converted.trim()) {
        lines.push(converted, '');
      }
    } catch (e: any) {
      lines.push(`[Converter error on resource type="${resource.type}": ${e.message}]`, '');
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function convertResource(resource: ZyBooksContentResource): string {
  const type = (resource.type || '').toLowerCase();

  switch (type) {
    case 'html':
      return convertHtmlResource(resource);
    case 'multiple_choice':
    case 'multiple_choice_question':
    case 'true_false':
    case 'true_false_question':
    case 'short_answer':
    case 'short_answer_question':
      return convertMultipleChoiceResource(resource);
    case 'container':
      return convertContainerResource(resource);
    case 'zystudio':
    case 'zy_studio':
      return convertZyStudioResource(resource);
    case 'custom':
      return convertCustomResource(resource);
    case 'animation':
      return convertAnimationResource(resource);
    default:
      if (type.includes('code') || type === 'ace_live_code') {
        return convertCodeResource(resource);
      }
      if (type.includes('image') || type.includes('figure')) {
        return convertImageResource(resource);
      }
      if (type.includes('table')) {
        return convertTableResource(resource);
      }
      return convertGenericResource(resource);
  }
}

function convertHtmlResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const htmlArray = payload.html;
  if (Array.isArray(htmlArray)) {
    const text = htmlArray.map((item: any) => extractAttributedText(item)).join('');
    return stripHtml(text);
  }
  const content = extractAttributedText(payload.content || payload.html || payload.text || payload);
  return stripHtml(content);
}

function convertMultipleChoiceResource(resource: ZyBooksContentResource): string {
  const lines: string[] = [];
  const payload = resource.payload || {};

  const caption = resource.caption || '';
  const activityType = resource.activity_type || 'participation';
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' : 'PARTICIPATION ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  const questions = payload.questions || [];
  if (Array.isArray(questions) && questions.length > 0) {
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const questionText = cleanText(q.text);
      if (questionText) {
        if (questions.length > 1) {
          lines.push('', `**${qi + 1}.** ${questionText}`);
        } else {
          lines.push('', questionText);
        }
      }

      const choices = q.choices || q.options || [];
      if (Array.isArray(choices) && choices.length > 0) {
        for (const choice of choices) {
          const choiceLabel = choice.label || cleanText(choice.text) || '';
          const isCorrect = choice.correct === true;
          const marker = isCorrect ? ' ✓' : '';
          if (choiceLabel) {
            lines.push(`- ${choiceLabel}${marker}`);
          }
        }
      }
    }
  }

  if (lines.length <= 1) {
    const questionText = cleanText(payload.question || payload.prompt || payload.text || '');
    if (questionText) lines.push('', questionText);
    const choices = payload.choices || payload.options || [];
    if (Array.isArray(choices)) {
      for (const choice of choices) {
        const text = cleanText(choice);
        if (text) lines.push(`- ${text}`);
      }
    }
  }

  return lines.join('\n');
}

function convertContainerResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];

  const caption = resource.caption || '';
  const containerType = payload.type || '';

  if (caption) {
    lines.push(`> **${caption}**`);
  }

  const htmlArray = payload.html;
  if (Array.isArray(htmlArray)) {
    const text = htmlArray.map((item: any) => extractAttributedText(item)).join('');
    const cleaned = stripHtml(text);
    if (cleaned) {
      const prefixed = cleaned.split('\n').map(line => `> ${line}`).join('\n');
      lines.push(prefixed);
    }
  }

  return lines.join('\n');
}

function convertZyStudioResource(resource: ZyBooksContentResource): string {
  const lines: string[] = [];

  const caption = resource.caption || '';
  lines.push(`### CHALLENGE ACTIVITY: ${caption}`);

  const instructions = resource.instructions;
  if (instructions && typeof instructions === 'string') {
    lines.push('', stripHtml(instructions));
  }

  return lines.join('\n');
}

function convertCustomResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const tool = (payload.tool || '').toLowerCase();
  const caption = resource.caption || '';
  const activityType = resource.activity_type || '';

  if (tool.includes('python-tutor') || tool.includes('pythontutor')) {
    return convertPythonTutorResource(resource);
  }
  if (tool === 'zyanimator') {
    return convertZyAnimatorResource(resource);
  }
  if (tool === 'homeworksystem') {
    return convertHomeworkResource(resource);
  }
  if (tool === 'codewriting') {
    return convertCodeWritingResource(resource);
  }

  const lines: string[] = [];
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' :
    activityType === 'participation' ? 'PARTICIPATION ACTIVITY' : 'ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  if (payload.alt_text) {
    lines.push('', payload.alt_text);
  }

  if (payload.instructions) {
    lines.push('', stripHtml(typeof payload.instructions === 'string' ? payload.instructions : extractAttributedText(payload.instructions)));
  }

  return lines.join('\n');
}

function convertPythonTutorResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`**${caption}**`);

  if (payload.alt_text) {
    lines.push('', payload.alt_text);
  }

  const traceCode = payload.options?.trace?.code;
  if (traceCode && typeof traceCode === 'string') {
    lines.push('', '```python', decodeEntities(traceCode).trim(), '```');
  }

  return lines.join('\n');
}

function convertZyAnimatorResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';
  const activityType = resource.activity_type || '';
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' :
    activityType === 'participation' ? 'PARTICIPATION ACTIVITY' : 'ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  if (payload.alt_text) {
    lines.push('', payload.alt_text);
  }

  return lines.join('\n');
}

function convertHomeworkResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`### CHALLENGE ACTIVITY: ${caption}`);

  const instructions = options.instructions || payload.instructions || '';
  if (instructions) {
    lines.push('', stripHtml(typeof instructions === 'string' ? instructions : extractAttributedText(instructions)));
  }

  if (options.prefix && typeof options.prefix === 'string') {
    const lang = (options.language || 'python').toLowerCase().replace('python3', 'python');
    lines.push('', '**Given code:**', '```' + lang, decodeEntities(options.prefix).trim(), '```');
  }

  if (options.suffix && typeof options.suffix === 'string' && options.suffix.trim()) {
    lines.push('', '**Suffix code:**', '```python', decodeEntities(options.suffix).trim(), '```');
  }

  return lines.join('\n');
}

function convertCodeWritingResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`### CHALLENGE ACTIVITY: ${caption}`);

  if (options.levels && Array.isArray(options.levels)) {
    for (let i = 0; i < options.levels.length; i++) {
      const level = options.levels[i];
      if (!level || typeof level !== 'object') continue;

      if (options.levels.length > 1) {
        lines.push('', `**Level ${i + 1}:**`);
      }

      const prompt = level.prompt || level.instructions || level.description || '';
      if (prompt) {
        lines.push(stripHtml(typeof prompt === 'string' ? prompt : extractAttributedText(prompt)));
      }

      if (level.prefix && typeof level.prefix === 'string') {
        lines.push('', '```python', decodeEntities(level.prefix).trim(), '```');
      }
    }
  }

  return lines.join('\n');
}

function convertAnimationResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  if (caption) {
    lines.push(`**Animation: ${caption}**`);
  }

  if (payload.alt_text) {
    lines.push(payload.alt_text);
  }

  const htmlArray = payload.html;
  if (Array.isArray(htmlArray)) {
    const text = htmlArray.map((item: any) => extractAttributedText(item)).join('');
    const cleaned = stripHtml(text);
    if (cleaned) lines.push(cleaned);
  }

  return lines.join('\n');
}

function convertCodeResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  if (caption) {
    lines.push(`**${caption}**`);
    lines.push('');
  }

  let code = '';
  for (const key of ['code', 'source', 'starter_code', 'initial_code', 'content']) {
    if (payload[key] && typeof payload[key] === 'string') {
      code = payload[key];
      break;
    }
  }

  if (code) {
    const lang = (typeof payload.language === 'string' ? payload.language : 'python').toLowerCase();
    lines.push('```' + lang, decodeEntities(code).trim(), '```');
  }
  return lines.join('\n');
}

function convertTableResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  if (caption) {
    lines.push(`**${caption}**`);
    lines.push('');
  }

  const htmlArray = payload.html;
  if (Array.isArray(htmlArray)) {
    const text = htmlArray.map((item: any) => extractAttributedText(item)).join('');
    lines.push(stripHtml(text));
  } else {
    const content = extractAttributedText(payload.content || payload.html || payload.text || '');
    if (content) lines.push(stripHtml(content));
  }

  return lines.join('\n');
}

function convertImageResource(resource: ZyBooksContentResource): string {
  const caption = resource.caption || '';
  if (caption) {
    return `**Figure:** ${caption}`;
  }
  return '';
}

function convertGenericResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  if (caption) {
    lines.push(`**${caption}**`);
  }

  if (payload.alt_text) {
    lines.push(payload.alt_text);
  }

  const htmlArray = payload.html;
  if (Array.isArray(htmlArray)) {
    const text = htmlArray.map((item: any) => extractAttributedText(item)).join('');
    const cleaned = stripHtml(text);
    if (cleaned) lines.push(cleaned);
  }

  if (resource.instructions && typeof resource.instructions === 'string') {
    lines.push(stripHtml(resource.instructions));
  }

  return lines.join('\n');
}

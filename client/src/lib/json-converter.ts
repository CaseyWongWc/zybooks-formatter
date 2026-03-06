export interface ZyBooksContentResource {
  id: string;
  type: string;
  payload: any;
  parts?: number;
}

export interface ZyBooksSectionResponse {
  section: {
    title?: string;
    content_resources: ZyBooksContentResource[];
  };
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
    const converted = convertResource(resource);
    if (converted.trim()) {
      lines.push(converted, '');
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function convertResource(resource: ZyBooksContentResource): string {
  switch (resource.type) {
    case 'html':
      return convertHtmlResource(resource.payload);
    case 'short_answer_question':
    case 'multiple_choice_question':
    case 'true_false_question':
      return convertQuestionResource(resource);
    case 'animation':
      return convertAnimationResource(resource.payload);
    case 'code':
    case 'ace_live_code':
      return convertCodeResource(resource.payload);
    case 'table':
      return convertTableResource(resource.payload);
    case 'image':
      return convertImageResource(resource.payload);
    case 'custom':
    case 'custom_content_resource':
      return convertCustomResource(resource);
    default:
      return convertGenericResource(resource);
  }
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function convertHtmlResource(payload: any): string {
  if (!payload) return '';
  const content = safeStr(payload.content) || safeStr(payload.html) || safeStr(payload.text) || '';
  if (!content) return '';
  return stripHtmlTags(content);
}

function convertQuestionResource(resource: ZyBooksContentResource): string {
  const lines: string[] = [];
  const payload = resource.payload || {};

  const activityLabel = safeStr(payload.activity_label) || safeStr(payload.label) || '';
  const activityType = resource.type === 'multiple_choice_question' ? 'PARTICIPATION ACTIVITY' :
    resource.type === 'true_false_question' ? 'PARTICIPATION ACTIVITY' :
    resource.type === 'short_answer_question' ? 'PARTICIPATION ACTIVITY' : 'ACTIVITY';

  if (activityLabel) {
    lines.push(`### ${activityType}: ${stripHtmlTags(activityLabel)}`);
  }

  const questionText = safeStr(payload.question) || safeStr(payload.prompt) || safeStr(payload.text) || '';
  if (questionText) {
    lines.push('', stripHtmlTags(questionText));
  }

  if (payload.choices && Array.isArray(payload.choices)) {
    lines.push('');
    payload.choices.forEach((choice: any, idx: number) => {
      const text = typeof choice === 'string' ? choice : safeStr(choice.text || choice.content || choice.label || '');
      lines.push(`${idx + 1}. ${stripHtmlTags(text)}`);
    });
  }

  if (payload.answers && Array.isArray(payload.answers)) {
    lines.push('');
    payload.answers.forEach((answer: any, idx: number) => {
      const text = typeof answer === 'string' ? answer : safeStr(answer.text || answer.content || '');
      lines.push(`${idx + 1}. ${stripHtmlTags(text)}`);
    });
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const partText = safeStr(part.question) || safeStr(part.prompt) || safeStr(part.text) || '';
      if (partText) {
        lines.push('', stripHtmlTags(partText));
      }
      if (part.choices && Array.isArray(part.choices)) {
        lines.push('');
        part.choices.forEach((choice: any, idx: number) => {
          const text = typeof choice === 'string' ? choice : safeStr(choice.text || choice.content || '');
          lines.push(`${idx + 1}. ${stripHtmlTags(text)}`);
        });
      }
    }
  }

  return lines.join('\n');
}

function convertAnimationResource(payload: any): string {
  if (!payload) return '';
  const lines: string[] = [];
  const title = safeStr(payload.title) || safeStr(payload.label) || '';
  if (title) {
    lines.push(`**Animation: ${stripHtmlTags(title)}**`);
  }
  const description = safeStr(payload.description) || safeStr(payload.caption) || '';
  if (description) {
    lines.push(stripHtmlTags(description));
  }
  return lines.join('\n');
}

function convertCodeResource(payload: any): string {
  if (!payload) return '';
  const lines: string[] = [];
  const title = safeStr(payload.title) || safeStr(payload.label) || '';
  if (title) {
    lines.push(`**${stripHtmlTags(title)}**`);
    lines.push('');
  }
  const code = safeStr(payload.code) || safeStr(payload.content) || safeStr(payload.source) || safeStr(payload.starter_code) || '';
  if (code) {
    const lang = safeStr(payload.language) || 'python';
    lines.push('```' + lang);
    lines.push(code.trim());
    lines.push('```');
  }
  return lines.join('\n');
}

function convertTableResource(payload: any): string {
  if (!payload) return '';
  const title = safeStr(payload.title) || '';
  const lines: string[] = [];
  if (title) {
    lines.push(`**${stripHtmlTags(title)}**`);
    lines.push('');
  }
  const content = safeStr(payload.content) || safeStr(payload.html) || '';
  if (content) {
    lines.push(stripHtmlTags(content));
  }
  return lines.join('\n');
}

function convertImageResource(payload: any): string {
  if (!payload) return '';
  const caption = safeStr(payload.caption) || safeStr(payload.alt) || safeStr(payload.title) || '';
  if (caption) {
    return `**Figure:** ${stripHtmlTags(caption)}`;
  }
  return '';
}

function convertCustomResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];

  const label = safeStr(payload.activity_label) || safeStr(payload.label) || safeStr(payload.title) || '';
  if (label) {
    lines.push(`### CHALLENGE ACTIVITY: ${stripHtmlTags(label)}`);
  }

  const prompt = safeStr(payload.prompt) || safeStr(payload.question) || safeStr(payload.text) || safeStr(payload.description) || '';
  if (prompt) {
    lines.push('', stripHtmlTags(prompt));
  }

  if (payload.starter_code || payload.code) {
    const code = safeStr(payload.starter_code) || safeStr(payload.code);
    lines.push('', '```python', code.trim(), '```');
  }

  if (payload.test_cases && Array.isArray(payload.test_cases)) {
    lines.push('', '**Test Cases:**');
    for (const tc of payload.test_cases) {
      const input = safeStr(tc.input);
      const expected = safeStr(tc.expected_output) || safeStr(tc.output);
      if (input || expected) {
        lines.push(`- Input: \`${input}\` → Expected: \`${expected}\``);
      }
    }
  }

  return lines.join('\n');
}

function convertGenericResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const text = safeStr(payload.content) || safeStr(payload.html) || safeStr(payload.text) || safeStr(payload.description) || '';
  if (text) {
    return stripHtmlTags(text);
  }
  return '';
}

function stripHtmlTags(html: any): string {
  if (html === null || html === undefined) return '';
  if (typeof html !== 'string') {
    if (typeof html === 'object') return JSON.stringify(html);
    return String(html);
  }
  let text = html;

  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    return '\n```python\n' + decodeEntities(code).trim() + '\n```\n';
  });
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return '\n```\n' + decodeEntities(code).trim() + '\n```\n';
  });

  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, (_, code) => '`' + decodeEntities(code) + '`');

  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1');

  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');

  text = text.replace(/<[^>]+>/g, '');

  text = decodeEntities(text);

  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function decodeEntities(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return String(text);
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

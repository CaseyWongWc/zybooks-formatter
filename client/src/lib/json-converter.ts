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
  const sectionTitle = extractText(data.section?.title);

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

function extractText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);

  if (Array.isArray(val)) {
    return val.map(extractText).filter(Boolean).join('\n');
  }

  if (typeof val === 'object') {
    if ('text' in val && typeof val.text === 'string') return val.text;
    if ('html' in val && typeof val.html === 'string') return val.html;
    if ('content' in val && typeof val.content === 'string') return val.content;

    if ('text' in val && val.text !== null && typeof val.text === 'object') {
      return extractText(val.text);
    }
    if ('html' in val && val.html !== null && typeof val.html === 'object') {
      return extractText(val.html);
    }
    if ('content' in val && val.content !== null && typeof val.content === 'object') {
      return extractText(val.content);
    }

    if ('question' in val) return extractText(val.question);
    if ('prompt' in val) return extractText(val.prompt);
    if ('description' in val) return extractText(val.description);
    if ('label' in val && typeof val.label === 'string') return val.label;
    if ('value' in val && typeof val.value === 'string') return val.value;
    if ('caption' in val && typeof val.caption === 'string') return val.caption;
    if ('title' in val && typeof val.title === 'string') return val.title;

    if ('body' in val) return extractText(val.body);

    const textKeys = Object.keys(val).filter(k =>
      !['attributes', 'type', 'id', 'metadata', 'analytics', 'style', 'class',
       'resource_id', 'canonical_section_id', 'content_resource_id',
       'autoplay', 'loop', 'controls', 'width', 'height'].includes(k)
    );
    for (const key of textKeys) {
      const result = extractText(val[key]);
      if (result && result.length > 5) return result;
    }
  }

  return '';
}

function extractAllTextFields(obj: any): string[] {
  const results: string[] = [];
  if (!obj || typeof obj !== 'object') return results;

  for (const [key, val] of Object.entries(obj)) {
    if (['attributes', 'metadata', 'analytics', 'id', 'resource_id',
         'canonical_section_id', 'content_resource_id', 'type'].includes(key)) continue;

    if (typeof val === 'string' && val.length > 3) {
      results.push(val);
    } else if (typeof val === 'object' && val !== null) {
      results.push(...extractAllTextFields(val));
    }
  }
  return results;
}

function convertResource(resource: ZyBooksContentResource): string {
  const type = (resource.type || '').toLowerCase();

  if (type.includes('html') || type === 'reading_content' || type === 'text_content') {
    return convertHtmlResource(resource.payload);
  }
  if (type.includes('question') || type.includes('quiz') || type.includes('participation')
      || type === 'short_answer_question' || type === 'multiple_choice_question'
      || type === 'true_false_question') {
    return convertQuestionResource(resource);
  }
  if (type.includes('animation') || type === 'zy_animation' || type === 'ZyAnimationPlayer') {
    return convertAnimationResource(resource.payload);
  }
  if (type.includes('code') || type === 'ace_live_code' || type === 'coding_activity') {
    return convertCodeResource(resource.payload);
  }
  if (type.includes('table')) {
    return convertTableResource(resource.payload);
  }
  if (type.includes('image') || type.includes('figure')) {
    return convertImageResource(resource.payload);
  }
  if (type.includes('custom') || type.includes('challenge')) {
    return convertCustomResource(resource);
  }

  return convertGenericResource(resource);
}

function convertHtmlResource(payload: any): string {
  if (!payload) return '';
  const content = extractText(payload);
  if (!content) return '';
  return stripHtmlTags(content);
}

function convertQuestionResource(resource: ZyBooksContentResource): string {
  const lines: string[] = [];
  const payload = resource.payload || {};

  const activityLabel = extractText(payload.activity_label || payload.label || '');
  const activityType = 'PARTICIPATION ACTIVITY';

  if (activityLabel) {
    lines.push(`### ${activityType}: ${stripHtmlTags(activityLabel)}`);
  }

  const questionText = extractText(payload.question || payload.prompt || payload.text || '');
  if (questionText) {
    lines.push('', stripHtmlTags(questionText));
  }

  const choices = payload.choices || payload.options || payload.answers || [];
  if (Array.isArray(choices) && choices.length > 0) {
    lines.push('');
    choices.forEach((choice: any, idx: number) => {
      const text = extractText(choice);
      if (text) {
        lines.push(`${idx + 1}. ${stripHtmlTags(text)}`);
      }
    });
  }

  const parts = payload.parts || payload.sub_questions || [];
  if (Array.isArray(parts) && parts.length > 0) {
    for (const part of parts) {
      const partText = extractText(part.question || part.prompt || part.text || part);
      if (partText) {
        lines.push('', stripHtmlTags(partText));
      }
      const partChoices = part.choices || part.options || part.answers || [];
      if (Array.isArray(partChoices)) {
        lines.push('');
        partChoices.forEach((choice: any, idx: number) => {
          const text = extractText(choice);
          if (text) lines.push(`${idx + 1}. ${stripHtmlTags(text)}`);
        });
      }
    }
  }

  return lines.join('\n');
}

function convertAnimationResource(payload: any): string {
  if (!payload) return '';
  const lines: string[] = [];
  const title = extractText(payload.title || payload.label || '');
  if (title) {
    lines.push(`**Animation: ${stripHtmlTags(title)}**`);
  }
  const description = extractText(payload.description || payload.caption || '');
  if (description) {
    lines.push(stripHtmlTags(description));
  }
  if (!title && !description) {
    const fallback = extractText(payload);
    if (fallback) lines.push(`**[Animation]** ${stripHtmlTags(fallback)}`);
  }
  return lines.join('\n');
}

function convertCodeResource(payload: any): string {
  if (!payload) return '';
  const lines: string[] = [];
  const title = extractText(payload.title || payload.label || '');
  if (title) {
    lines.push(`**${stripHtmlTags(title)}**`);
    lines.push('');
  }

  let code = '';
  for (const key of ['code', 'source', 'starter_code', 'initial_code', 'solution', 'content']) {
    if (payload[key] && typeof payload[key] === 'string') {
      code = payload[key];
      break;
    }
    if (payload[key] && typeof payload[key] === 'object') {
      const extracted = extractText(payload[key]);
      if (extracted) { code = extracted; break; }
    }
  }

  if (code) {
    const lang = (typeof payload.language === 'string' ? payload.language : 'python').toLowerCase();
    lines.push('```' + lang);
    lines.push(stripHtmlTags(code).trim());
    lines.push('```');
  }
  return lines.join('\n');
}

function convertTableResource(payload: any): string {
  if (!payload) return '';
  const title = extractText(payload.title || '');
  const lines: string[] = [];
  if (title) {
    lines.push(`**${stripHtmlTags(title)}**`);
    lines.push('');
  }
  const content = extractText(payload.content || payload.html || payload);
  if (content) {
    lines.push(stripHtmlTags(content));
  }
  return lines.join('\n');
}

function convertImageResource(payload: any): string {
  if (!payload) return '';
  const caption = extractText(payload.caption || payload.alt || payload.title || '');
  if (caption) {
    return `**Figure:** ${stripHtmlTags(caption)}`;
  }
  return '';
}

function convertCustomResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];

  const label = extractText(payload.activity_label || payload.label || payload.title || '');
  if (label) {
    lines.push(`### CHALLENGE ACTIVITY: ${stripHtmlTags(label)}`);
  }

  const prompt = extractText(payload.prompt || payload.question || payload.text || payload.description || '');
  if (prompt) {
    lines.push('', stripHtmlTags(prompt));
  }

  let code = '';
  for (const key of ['starter_code', 'code', 'initial_code', 'source']) {
    if (payload[key]) {
      code = extractText(payload[key]);
      if (code) break;
    }
  }
  if (code) {
    lines.push('', '```python', stripHtmlTags(code).trim(), '```');
  }

  if (payload.test_cases && Array.isArray(payload.test_cases)) {
    lines.push('', '**Test Cases:**');
    for (const tc of payload.test_cases) {
      const input = extractText(tc.input || '');
      const expected = extractText(tc.expected_output || tc.output || '');
      if (input || expected) {
        lines.push(`- Input: \`${input}\` → Expected: \`${expected}\``);
      }
    }
  }

  return lines.join('\n');
}

function convertGenericResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};

  const textContent = extractText(payload);
  if (textContent) {
    return stripHtmlTags(textContent);
  }

  const allTexts = extractAllTextFields(payload);
  if (allTexts.length > 0) {
    return allTexts.map(t => stripHtmlTags(t)).join('\n\n');
  }

  return '';
}

function stripHtmlTags(html: any): string {
  if (html === null || html === undefined) return '';
  if (typeof html !== 'string') {
    const extracted = extractText(html);
    if (extracted && typeof extracted === 'string') return stripHtmlTags(extracted);
    return '';
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
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n');

  text = text.replace(/<[^>]+>/g, '');

  text = decodeEntities(text);

  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function decodeEntities(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return extractText(text);
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

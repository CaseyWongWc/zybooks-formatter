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
  text = text.replace(/<details[^>]*>[\s\S]*?<\/details>/gi, '');
  text = text.replace(/<summary[^>]*>[\s\S]*?<\/summary>/gi, '');
  text = text.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  text = text.replace(/<[^>]+>/g, '');

  text = decodeEntities(text);

  text = text.replace(/<details[^>]*>[\s\S]*?<\/details>/gi, '');
  text = text.replace(/<summary[^>]*>[\s\S]*?<\/summary>/gi, '');
  text = text.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');

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

function parseCodeWritingVariants(setupCode: string): { categories: Record<string, string[]>; rawEntries: Record<string, string>[] } | null {
  const decoded = decodeEntities(setupCode);
  const categories: Record<string, string[]> = {};
  const rawEntries: Record<string, string>[] = [];

  const dictListMatch = decoded.match(/conv_list_dict\s*=\s*\[([\s\S]*?)\]\s*(?:\n\n|\ndef |$)/);
  if (dictListMatch) {
    const dictBlock = dictListMatch[1];
    const entryRegex = /\{([^}]+)\}/g;
    let m;
    while ((m = entryRegex.exec(dictBlock)) !== null) {
      const entry: Record<string, string> = {};
      const fieldRegex = /'([^']+)'\s*:\s*'([^']*)'/g;
      let fm;
      while ((fm = fieldRegex.exec(m[1])) !== null) {
        entry[fm[1]] = fm[2];
      }
      if (Object.keys(entry).length > 0) {
        rawEntries.push(entry);
        const cat = entry['conv_type'] || 'General';
        if (!categories[cat]) categories[cat] = [];
        const param = entry['param'] || '';
        const param1 = entry['param1'] || '';
        const param2 = entry['param2'] || '';
        const retVal = entry['ret_val'] || '';
        if (param1 && param2 && retVal) {
          categories[cat].push(`${param1}+${param2} → ${retVal}`);
        } else if (param && retVal) {
          categories[cat].push(`${param} → ${retVal}`);
        } else if (param1 && retVal) {
          categories[cat].push(`${param1} → ${retVal}`);
        } else if (param || param1) {
          categories[cat].push(param || param1);
        }
      }
    }
    if (rawEntries.length > 0) return { categories, rawEntries };
  }

  const shapeDictMatch = decoded.match(/shape_dict_dict\s*=\s*\{([\s\S]*?)\n\}\s*(?:\n|$)/);
  if (shapeDictMatch) {
    const shapeBlock = shapeDictMatch[1];
    const shapeNameRegex = /^\s{4}'([A-Z]\w+)'\s*:\s*\{/gm;
    let sm;
    while ((sm = shapeNameRegex.exec(shapeBlock)) !== null) {
      const shapeName = sm[1];
      if (!categories['Shapes']) categories['Shapes'] = [];
      const nextShapeMatch = shapeBlock.substring(sm.index + sm[0].length).match(/^\s{4}'[A-Z]\w+'\s*:\s*\{/m);
      const endIdx = nextShapeMatch
        ? sm.index + sm[0].length + nextShapeMatch.index
        : shapeBlock.length;
      const shapeSection = shapeBlock.substring(sm.index, endIdx);
      const measurements: string[] = [];
      const measRegex = /'measurement'\s*:\s*'([^']+)'/g;
      let mm;
      while ((mm = measRegex.exec(shapeSection)) !== null) {
        if (!measurements.includes(mm[1])) measurements.push(mm[1]);
      }
      const formulas: string[] = [];
      const formulaRegex = /'formula'\s*:\s*'([^']+)'/g;
      let ffm;
      while ((ffm = formulaRegex.exec(shapeSection)) !== null) {
        if (!formulas.includes(ffm[1])) formulas.push(ffm[1]);
      }
      categories['Shapes'].push(`${shapeName} (${measurements.join(', ')})`);
      rawEntries.push({ shape: shapeName, measurements: measurements.join(', '), formulas: formulas.join('; ') });
    }
    if (rawEntries.length > 0) return { categories, rawEntries };
  }

  return null;
}

function extractSolutionPattern(files: any[]): string | null {
  if (!Array.isArray(files)) return null;
  for (const file of files) {
    const content = file.content;
    if (!Array.isArray(content)) continue;
    for (const segment of content) {
      if (segment.editable && segment.solution) {
        const sol = decodeEntities(typeof segment.solution === 'string' ? segment.solution : '');
        if (sol && !sol.includes('${')) return sol.trim();
      }
    }
  }
  return null;
}

function extractTemplateStructure(files: any[]): string[] {
  if (!Array.isArray(files)) return [];
  const parts: string[] = [];
  for (const file of files) {
    const content = file.content;
    if (!Array.isArray(content)) continue;
    for (const segment of content) {
      const template = segment.template;
      if (typeof template === 'string' && template.trim()) {
        const cleaned = decodeEntities(template)
          .replace(/\$\{[^}]+\}/g, '___')
          .trim();
        if (cleaned && cleaned !== '___') {
          parts.push(cleaned);
        }
      }
    }
  }
  return parts;
}

function describePromptPattern(prompt: string): string {
  const cleaned = stripHtml(typeof prompt === 'string' ? prompt : '');
  if (!cleaned) return '';
  const hasTemplateVars = /\$\{[^}]+\}/.test(cleaned);
  if (!hasTemplateVars) return cleaned;

  let described = cleaned;
  described = described.replace(/\$\{distractor\.method_name\}/g, '[function_name]');
  described = described.replace(/\$\{distractor\.conv_type_lower\}/g, '[conversion_type]');
  described = described.replace(/\$\{meaningful\.param_plural\}/g, '[input_unit]');
  described = described.replace(/\$\{meaningful\.ret_val\}/g, '[output_unit]');
  described = described.replace(/\$\{meaningful\.conv_factor_formula\}/g, '');
  described = described.replace(/\$\{distractor\.example_input\}/g, '[example_input]');
  described = described.replace(/\$\{distractor\.example_output\}/g, '[example_output]');
  described = described.replace(/\$\{distractor\.note\}/g, '');
  described = described.replace(/\$\{distractor\.param1_lower\}/g, '[unit_1]');
  described = described.replace(/\$\{distractor\.param2_lower\}/g, '[unit_2]');
  described = described.replace(/\$\{distractor\.param1_singular\}/g, '[unit_1_singular]');
  described = described.replace(/\$\{distractor\.param2_singular\}/g, '[unit_2_singular]');
  described = described.replace(/\$\{distractor\.conversion1\}/g, '[factor_1]');
  described = described.replace(/\$\{distractor\.conversion2\}/g, '[factor_2]');
  described = described.replace(/\$\{distractor\.base_func\}/g, '[base_function]');
  described = described.replace(/\$\{distractor\.complex_func\}/g, '[complex_function]');
  described = described.replace(/\$\{distractor\.base_params_list\}/g, '[base_parameters]');
  described = described.replace(/\$\{distractor\.complex_params_list\}/g, '[complex_parameters]');
  described = described.replace(/\$\{distractor\.complex_measurement\}/g, '[measurement]');
  described = described.replace(/\$\{distractor\.base_num_params_in_words\}/g, '[N]');
  described = described.replace(/\$\{distractor\.complex_num_params_in_words\}/g, '[N]');
  described = described.replace(/\$\{distractor\.base_params_plural_singular\}/g, '(s)');
  described = described.replace(/\$\{distractor\.complex_params_plural_singular\}/g, '(s)');
  described = described.replace(/\$\{distractor\.latex_base_formula\}/g, '[formula]');
  described = described.replace(/\$\{distractor\.latex_complex_formula\}/g, '[formula]');
  described = described.replace(/\$\{meaningful\.shape_lower\}/g, '[shape]');
  described = described.replace(/\$\{[^}]+\}/g, '[...]');
  described = described.replace(/\[\.\.\.\]\s*\[\.\.\.\]/g, '[...]');
  described = described.replace(/\s{2,}/g, ' ');

  return described.trim();
}

function convertCodeWritingResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';
  const lang = (options.language || 'python').toLowerCase().replace('python3', 'python');
  const numLevels = Array.isArray(options.levels) ? options.levels.length : 0;

  lines.push(`### CHALLENGE ACTIVITY: ${caption}` + (numLevels > 1 ? ` (${numLevels} Levels)` : ''));

  if (options.levels && Array.isArray(options.levels)) {
    for (let i = 0; i < options.levels.length; i++) {
      const level = options.levels[i];
      if (!level || typeof level !== 'object') continue;

      if (numLevels > 1) {
        lines.push('', `**Level ${i + 1}:**`);
      }

      const variants = level.randomization ? parseCodeWritingVariants(
        decodeEntities(level.randomization.setup || '')
      ) : null;

      if (variants && Object.keys(variants.categories).length > 0) {
        const catSummaries: string[] = [];
        for (const [cat, items] of Object.entries(variants.categories)) {
          if (cat === 'Shapes') {
            catSummaries.push(`**${cat}:** ${items.join(', ')}`);
          } else {
            catSummaries.push(`**${cat}:** ${items.join(', ')}`);
          }
        }
        const totalVariants = variants.rawEntries.length;
        lines.push(`*Randomized activity with ${totalVariants} problem variant${totalVariants !== 1 ? 's' : ''}:*`);
        for (const summary of catSummaries) {
          lines.push(`- ${summary}`);
        }
      }

      const prompt = level.prompt || level.instructions || level.description || '';
      if (prompt) {
        const described = describePromptPattern(prompt);
        if (described) {
          lines.push('', '**Task pattern:**', described);
        }
      }

      const explanation = level.explanation || '';
      if (explanation && typeof explanation === 'string') {
        const expText = describePromptPattern(explanation);
        if (expText && expText.length > 10) {
          lines.push('', '**Explanation pattern:**', expText);
        }
      }

      const solution = extractSolutionPattern(level.files);
      if (solution) {
        lines.push('', '**Solution pattern:**', '```' + lang, solution, '```');
      }

      const templateParts = extractTemplateStructure(level.files);
      if (templateParts.length > 0 && !solution) {
        const codeTemplate = templateParts.join('\n');
        if (codeTemplate.length > 10) {
          lines.push('', '**Code structure:**', '```' + lang, codeTemplate, '```');
        }
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

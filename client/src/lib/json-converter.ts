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

  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code>([\s\S]*?)<\/pre>/gi, (_, code, trailing) => {
    const combined = (code + (trailing || '')).trim();
    return '\n```\n' + decodeEntities(combined) + '\n```\n';
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

export interface ConvertOptions {
  resolveTemplates?: boolean;
}

let _convertOptions: ConvertOptions = { resolveTemplates: true };

export function convertZybooksJson(data: ZyBooksSectionResponse, chapter?: number, section?: number, options?: ConvertOptions): string {
  _convertOptions = { resolveTemplates: true, ...options };
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
      return convertShortAnswerResource(resource);
    case 'detect_answer':
      return convertDetectAnswerResource(resource);
    case 'image':
      return convertImageResource(resource);
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
  const activityType = resource.activity_type || 'lab';
  const label = activityType === 'lab' ? 'LAB ACTIVITY' :
    activityType === 'challenge' ? 'CHALLENGE ACTIVITY' : 'ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  const instructions = resource.instructions;
  if (instructions) {
    const instrText = typeof instructions === 'string' ? stripHtml(instructions) : cleanText(instructions);
    if (instrText) lines.push('', instrText);
  }

  const payload = resource.payload || {};
  const testCases = payload.testCases || [];
  if (Array.isArray(testCases) && testCases.length > 0) {
    const visible = testCases.filter((tc: any) => !tc.hidden);
    const hidden = testCases.filter((tc: any) => tc.hidden);

    if (visible.length > 0) {
      lines.push('', '**Test Cases:**');
      lines.push('| # | Input | Expected Output | Points |');
      lines.push('|---|-------|-----------------|--------|');
      for (let i = 0; i < visible.length; i++) {
        const tc = visible[i];
        const input = (tc.stdin || '(none)').replace(/\n/g, '\\n').replace(/\|/g, '\\|');
        const output = (tc.stdout || '').replace(/\n/g, '\\n').replace(/\|/g, '\\|');
        lines.push(`| ${i + 1} | \`${input}\` | \`${output}\` | ${tc.points || 0} |`);
      }
    }

    if (hidden.length > 0) {
      lines.push('', `*Plus ${hidden.length} hidden test case${hidden.length > 1 ? 's' : ''}.*`);
    }

    const totalPoints = testCases.reduce((sum: number, tc: any) => sum + (tc.points || 0), 0);
    if (totalPoints > 0) {
      lines.push(`*Total: ${totalPoints} points*`);
    }
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
  if (tool === 'codeoutput') {
    return convertCodeOutputResource(resource);
  }
  if (tool === 'parsonscodingpa') {
    return convertParsonsResource(resource);
  }
  if (tool === 'defnmatch') {
    return convertDefnMatchResource(resource);
  }
  if (tool === 'codingprogression') {
    return convertCodingProgressionResource(resource);
  }
  if (tool === 'progressionplayerinteractiveandaccessible') {
    return convertProgressionResource(resource);
  }
  if (tool === 'arrangeinst') {
    return convertArrangeInstResource(resource);
  }

  const lines: string[] = [];
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' :
    activityType === 'participation' ? 'PARTICIPATION ACTIVITY' : 'ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  if (payload.alt_text) {
    lines.push('', stripHtml(payload.alt_text));
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
    lines.push('', stripHtml(payload.alt_text));
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
    lines.push('', stripHtml(payload.alt_text));
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

function convertShortAnswerResource(resource: ZyBooksContentResource): string {
  const lines: string[] = [];
  const payload = resource.payload || {};
  const caption = resource.caption || '';
  const activityType = resource.activity_type || 'participation';
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' : 'PARTICIPATION ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  const questions = payload.questions || [];
  if (Array.isArray(questions)) {
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const rawText = extractAttributedText(q.text);
      const hasCodeBlock = rawText.includes('class="highlight"') || rawText.includes('class="code');
      const questionText = stripHtml(rawText.replace(/<\/br>/gi, '<br/>'));

      const rawBefore = q.text_before ? extractAttributedText(q.text_before).replace(/<\/br>/gi, '<br/>') : '';
      const rawAfter = q.text_after ? extractAttributedText(q.text_after).replace(/<\/br>/gi, '<br/>') : '';
      const beforeHasCode = rawBefore.includes('class="highlight"') || rawBefore.includes('class="code');
      const afterHasCode = rawAfter.includes('class="highlight"') || rawAfter.includes('class="code');
      const textBefore = rawBefore ? stripHtml(rawBefore) : '';
      const textAfter = rawAfter ? stripHtml(rawAfter) : '';
      const hint = q.hint ? cleanText(q.hint) : '';

      if (beforeHasCode && textBefore) {
        lines.push('', textBefore);
      }

      const prompt = [
        (beforeHasCode ? '' : textBefore),
        questionText,
        (afterHasCode ? '' : textAfter)
      ].filter(Boolean).join(' ');

      if (prompt) {
        if (questions.length > 1) {
          lines.push('', `**${qi + 1}.** ${prompt}`);
        } else {
          lines.push('', prompt);
        }
      }

      if (afterHasCode && textAfter) {
        lines.push('', textAfter);
      }

      const answers = q.answers || [];
      if (Array.isArray(answers) && answers.length > 0) {
        const answerTexts = answers.map((a: any) => typeof a === 'string' ? a : cleanText(a)).filter(Boolean);
        if (answerTexts.length > 0) {
          if (answerTexts.some(a => a.includes('\n'))) {
            lines.push('', '**Answer:**', '```', answerTexts[0], '```');
            if (answerTexts.length > 1) {
              lines.push('Also accepted: ' + answerTexts.slice(1).join(' or '));
            }
          } else {
            lines.push(`Answer: ${answerTexts.join(' or ')}`);
          }
        }
      }

      if (hint) {
        lines.push(`*Hint: ${hint}*`);
      }

      if (q.explanation) {
        const exp = cleanText(q.explanation);
        if (exp) lines.push(`*${exp}*`);
      }
    }
  }

  return lines.join('\n');
}

function convertDetectAnswerResource(resource: ZyBooksContentResource): string {
  const lines: string[] = [];
  const payload = resource.payload || {};
  const caption = resource.caption || '';
  const activityType = resource.activity_type || 'participation';
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' : 'PARTICIPATION ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  if (payload.alt_text) {
    lines.push('', stripHtml(payload.alt_text));
  }

  const questions = payload.questions || [];
  if (Array.isArray(questions)) {
    for (const q of questions) {
      if (q.contents) {
        const content = cleanText(q.contents);
        if (content) lines.push('', content);
      }
    }
  }

  return lines.join('\n');
}

function extractExampleFromPythonParams(paramCode: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const numVars: Record<string, number> = {};

  function resolveExpr(expr: string): number | null {
    expr = expr.trim();
    const num = parseInt(expr);
    if (!isNaN(num) && String(num) === expr) return num;
    if (expr in numVars) return numVars[expr];
    const negMatch = expr.match(/^-(\w+)$/);
    if (negMatch && negMatch[1] in numVars) return -numVars[negMatch[1]];
    const lenMatch = expr.match(/^len\((\w+)\)$/);
    if (lenMatch) {
      const v = vars[lenMatch[1]];
      if (v) return v.length;
    }
    const lenMinusMatch = expr.match(/^len\((\w+)\)\s*-\s*(\d+)$/);
    if (lenMinusMatch) {
      const v = vars[lenMinusMatch[1]];
      if (v) return v.length - parseInt(lenMinusMatch[2]);
    }
    const addMatch = expr.match(/^(\w+)\s*\+\s*(\d+)$/);
    if (addMatch && addMatch[1] in numVars) return numVars[addMatch[1]] + parseInt(addMatch[2]);
    const subMatch = expr.match(/^(\w+)\s*-\s*(\d+)$/);
    if (subMatch && subMatch[1] in numVars) return numVars[subMatch[1]] - parseInt(subMatch[2]);
    const negLenMatch = expr.match(/^-\(len\((\w+)\)\s*-\s*(\d+)\)$/);
    if (negLenMatch) {
      const v = vars[negLenMatch[1]];
      if (v) return -(v.length - parseInt(negLenMatch[2]));
    }
    return null;
  }

  function setVar(name: string, val: string | number) {
    if (typeof val === 'number') {
      numVars[name] = val;
      vars[name] = String(val);
    } else {
      vars[name] = val;
    }
  }

  const allStringTuples: [string, string][] = [];
  const strTupleMatches = paramCode.matchAll(/\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g);
  for (const m of strTupleMatches) {
    allStringTuples.push([m[1], m[2]]);
  }

  const allMixedTuples: [string, number][] = [];
  const mixTupleMatches = paramCode.matchAll(/\(\s*'([^']+)'\s*,\s*(\d+)\s*\)/g);
  for (const m of mixTupleMatches) {
    allMixedTuples.push([m[1], parseInt(m[2])]);
  }

  const dictMap: Record<number, string> = {};
  const dictEntries = paramCode.matchAll(/(-?\d+)\s*:\s*'([^']+)'/g);
  for (const m of dictEntries) {
    dictMap[parseInt(m[1])] = m[2];
  }

  const lines = paramCode.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed.startsWith('(') || trimmed.startsWith('while') || trimmed.startsWith('if') || trimmed.startsWith('for') || trimmed.startsWith('else')) continue;

    const pickFromStrList = trimmed.match(/^(\w+)\s*,\s*(\w+)\s*=\s*pick_from\(\s*(\w+)\s*\)/);
    if (pickFromStrList && allStringTuples.length > 0) {
      setVar(pickFromStrList[1], allStringTuples[0][0]);
      setVar(pickFromStrList[2], allStringTuples[0][1]);
      continue;
    }

    const sampleAssign = trimmed.match(/\[\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*,\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\]\s*=\s*random\.sample\(\s*(\w+)\s*,\s*\d+\s*\)/);
    if (sampleAssign && allStringTuples.length >= 2) {
      setVar(sampleAssign[1], allStringTuples[0][0]);
      setVar(sampleAssign[2], allStringTuples[0][1]);
      setVar(sampleAssign[3], allStringTuples[1][0]);
      setVar(sampleAssign[4], allStringTuples[1][1]);
      continue;
    }

    const pickFromMixed = trimmed.match(/^(\w+)\s*,\s*(\w+)\s*=\s*pick_from\(\s*(\w+)\s*\)/);
    if (pickFromMixed && allMixedTuples.length > 0) {
      setVar(pickFromMixed[1], allMixedTuples[0][0]);
      setVar(pickFromMixed[2], allMixedTuples[0][1]);
      continue;
    }

    const stridePickFrom = trimmed.match(/^(\w+)\s*,\s*(\w+)\s*=\s*pick_from\(\s*stride_list\s*\)/);
    if (stridePickFrom && allMixedTuples.length > 0) {
      setVar(stridePickFrom[1], allMixedTuples[0][0]);
      setVar(stridePickFrom[2], allMixedTuples[0][1]);
      continue;
    }

    const minPickRange = trimmed.match(/^(\w+)\s*=\s*min\(\s*([^,]+)\s*,\s*pick_from_range\(\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*\)/);
    if (minPickRange) {
      const cap = resolveExpr(minPickRange[2]);
      const rangeStart = resolveExpr(minPickRange[3]);
      if (cap !== null && rangeStart !== null) {
        setVar(minPickRange[1], Math.min(cap, rangeStart));
      }
      continue;
    }

    const pickRange = trimmed.match(/^(\w+)\s*=\s*pick_from_range\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
    if (pickRange) {
      const rangeStart = resolveExpr(pickRange[2]);
      if (rangeStart !== null) {
        setVar(pickRange[1], rangeStart);
      }
      continue;
    }

    const exprAssign = trimmed.match(/^(\w+)\s*=\s*(\w+)\s*([+\-])\s*(\d+)\s*$/);
    if (exprAssign) {
      const base = resolveExpr(exprAssign[2]);
      const operand = parseInt(exprAssign[4]);
      if (base !== null) {
        setVar(exprAssign[1], exprAssign[3] === '+' ? base + operand : base - operand);
      }
      continue;
    }

    const negLenAssign = trimmed.match(/^(\w+)\s*=\s*-\(\s*len\((\w+)\)\s*-\s*(\d+)\s*\)/);
    if (negLenAssign) {
      const v = vars[negLenAssign[2]];
      if (v) {
        setVar(negLenAssign[1], -(v.length - parseInt(negLenAssign[3])));
      }
      continue;
    }

    const lenAssign = trimmed.match(/^(\w+)\s*=\s*len\((\w+)\)\s*([+\-])\s*(\d+)$/);
    if (lenAssign) {
      const v = vars[lenAssign[2]];
      if (v) {
        setVar(lenAssign[1], lenAssign[3] === '+' ? v.length + parseInt(lenAssign[4]) : v.length - parseInt(lenAssign[4]));
      }
      continue;
    }

    const lenPlusAssign = trimmed.match(/^(\w+)\s*=\s*len\((\w+)\)\s*\+\s*(\w+)$/);
    if (lenPlusAssign) {
      const v = vars[lenPlusAssign[2]];
      const addVal = resolveExpr(lenPlusAssign[3]);
      if (v && addVal !== null) {
        setVar(lenPlusAssign[1], v.length + addVal);
      }
      continue;
    }

    const indexAccess = trimmed.match(/^(\w+)\s*=\s*(\w+)\[([^\]]+)\]/);
    if (indexAccess) {
      const strVal = vars[indexAccess[2]];
      const idx = resolveExpr(indexAccess[3]);
      if (strVal && idx !== null) {
        const actualIdx = idx < 0 ? strVal.length + idx : idx;
        if (actualIdx >= 0 && actualIdx < strVal.length) {
          setVar(indexAccess[1], strVal[actualIdx]);
        }
      }
      continue;
    }

    const dictLookup = trimmed.match(/^(\w+)\s*=\s*(\w+)\[(\w+)\]/);
    if (dictLookup && Object.keys(dictMap).length > 0) {
      const key = resolveExpr(dictLookup[3]);
      if (key !== null && key in dictMap) {
        setVar(dictLookup[1], dictMap[key]);
      }
      continue;
    }

    const numDirectAssign = trimmed.match(/^(\w+)\s*=\s*(-?\d+)\s*$/);
    if (numDirectAssign) {
      setVar(numDirectAssign[1], parseInt(numDirectAssign[2]));
      continue;
    }

    const strDirectAssign = trimmed.match(/^(\w+)\s*=\s*['"]([^'"]*)['"]\s*$/);
    if (strDirectAssign) {
      setVar(strDirectAssign[1], strDirectAssign[2]);
      continue;
    }
  }

  const name = vars['name'] || vars['name1'] || '';
  if (name) {
    const endIdx = numVars['end_index'];
    const startIdx = numVars['start_index'] ?? 0;
    if (endIdx !== undefined) {
      if (!vars['end_index_minus']) setVar('end_index_minus', endIdx - 1);
      if (endIdx > 0) {
        if (!vars['char1'] && startIdx >= 0 && startIdx < name.length) setVar('char1', name[startIdx]);
        if (!vars['char2'] && endIdx - 1 >= 0 && endIdx - 1 < name.length) setVar('char2', name[endIdx - 1]);
      } else if (endIdx < 0) {
        const posIdx = name.length + endIdx;
        if (!vars['end_index_pos']) setVar('end_index_pos', posIdx);
        if (!vars['end_index_pos_in']) setVar('end_index_pos_in', posIdx - 1);
        if (!vars['end_val'] && posIdx >= 0 && posIdx < name.length) setVar('end_val', name[posIdx]);
        if (!vars['start_val_in'] && name.length > 0) setVar('start_val_in', name[0]);
        if (!vars['end_val_in'] && posIdx > 0 && posIdx <= name.length) setVar('end_val_in', name[posIdx - 1]);
        const ordinals: Record<number, string> = {2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh'};
        if (!vars['ordinal']) setVar('ordinal', ordinals[Math.abs(endIdx)] || Math.abs(endIdx) + 'th');
      }
    }

    if (vars['stride'] && vars['end_index'] && !vars['step_phrase_1']) {
      const stride = numVars['stride'];
      const ei = numVars['end_index'];
      if (stride && ei) {
        const indices: number[] = [];
        for (let idx = 0; idx < ei; idx += stride) indices.push(idx);
        const chars = indices.map(i => i < name.length ? `"${name[i]}"` : '?').join(', ');
        setVar('step_phrase_1', `${vars['category'] || 'var'}[${indices.join('], ' + (vars['category'] || 'var') + '[')}] are returned, so ${chars}.`);
      }
    }
  }

  if (vars['name1'] && !vars['name']) vars['name'] = vars['name1'];

  return vars;
}

function applyDollarVarSubstitution(text: string, vars: Record<string, string>): string {
  for (const [key, val] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), val);
  }
  return text;
}

const fallbackLabels: Record<string, string> = {
  step_phrase_1: '[computed stride description]',
  step_phrase_2: '[computed stride description]',
  slice_result: '[computed slice result]',
  stride_desc: '[computed stride description]',
  ordinal_desc: '[ordinal position]',
};

function applyFallbackLabels(text: string): string {
  return text.replace(/\$\{(\w+)\}/g, (match, varName) => {
    if (fallbackLabels[varName]) return fallbackLabels[varName];
    const readable = varName.replace(/_/g, ' ');
    return `[${readable}]`;
  });
}

function convertCodeOutputResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';
  const activityType = resource.activity_type || 'challenge';
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' : 'PARTICIPATION ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  const lang = (options.language || 'python').toLowerCase().replace('python3', 'python');
  const levels = options.levels || [];
  if (Array.isArray(levels)) {
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (!level || typeof level !== 'object') continue;
      if (levels.length > 1) {
        lines.push('', `**Level ${i + 1}:**`);
      }

      let code = '';
      if (level.template && typeof level.template === 'string') {
        code = level.template;
        const params = level.parameters || {};

        if (typeof params === 'object' && !Array.isArray(params) && params !== null && typeof params !== 'string') {
          for (const [key, values] of Object.entries(params)) {
            const firstVal = Array.isArray(values) ? (values as string[])[0] : String(values);
            code = code.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), firstVal);
          }
        }

        if (typeof params === 'string' && code.includes('${')) {
          if (_convertOptions.resolveTemplates !== false) {
            const exampleVars = extractExampleFromPythonParams(params);
            if (Object.keys(exampleVars).length > 0) {
              code = applyDollarVarSubstitution(code, exampleVars);
              if (level.explanation) {
                level._resolvedExplanation = applyDollarVarSubstitution(level.explanation, exampleVars);
              }
            }
          }
        }
      } else if (level.code && typeof level.code === 'string') {
        code = level.code;
      }

      const hasDollarVars = /\$\{[a-zA-Z_]/.test(code);

      if (hasDollarVars && _convertOptions.resolveTemplates !== false) {
        code = applyFallbackLabels(code);
      }

      if (code) {
        lines.push('', 'What is the output?', '', '```' + lang, decodeEntities(code).trim(), '```');
      }

      if (hasDollarVars && _convertOptions.resolveTemplates === false) {
        lines.push('*Note: `${...}` placeholders are filled with random values at runtime (e.g., different names/numbers each attempt).*');
      }

      let explanationText = level._resolvedExplanation || level.explanation;
      if (explanationText) {
        let expClean = stripHtml(explanationText);
        if (/\$\{[a-zA-Z_]/.test(expClean)) {
          if (_convertOptions.resolveTemplates !== false) {
            expClean = applyFallbackLabels(expClean);
          } else {
            expClean = expClean.replace(/\$\{(\w+)\}/g, '[$1]');
          }
        }
        lines.push('', '*' + expClean + '*');
      }
    }
  }

  return lines.join('\n');
}

function convertParsonsResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`### CHALLENGE ACTIVITY: ${caption}`);

  if (options.prompt) {
    lines.push('', stripHtml(typeof options.prompt === 'string' ? options.prompt : extractAttributedText(options.prompt)));
  }

  const lang = (options.language || 'python').toLowerCase().replace('python3', 'python');
  const files = options.files || [];
  if (Array.isArray(files)) {
    for (const file of files) {
      if (file.solution && typeof file.solution === 'string') {
        lines.push('', '**Solution:**', '```' + lang, decodeEntities(file.solution).trim(), '```');
      } else if (Array.isArray(file.contents) && file.contents.length > 0) {
        const solutionLines = file.contents
          .map((c: any) => {
            const sol = decodeEntities(c.solution || '');
            const indent = '  '.repeat(c.indents || 0);
            return indent + sol;
          })
          .filter((s: string) => s.trim());
        if (solutionLines.length > 0) {
          lines.push('', '**Solution:**', '```' + lang, solutionLines.join('\n'), '```');
          const distractors = file.contents
            .filter((c: any) => Array.isArray(c.distractors) && c.distractors.length > 0)
            .flatMap((c: any) => c.distractors.map((d: string) => decodeEntities(d)));
          if (distractors.length > 0) {
            lines.push('', '**Distractor lines (wrong answers):**');
            for (const d of distractors) {
              lines.push(`- \`${d}\``);
            }
          }
        }
      }
    }
  }

  return lines.join('\n');
}

function convertDefnMatchResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`### PARTICIPATION ACTIVITY: ${caption}`);

  const terms = options.terms || [];
  if (Array.isArray(terms)) {
    for (const term of terms) {
      const word = typeof term.word === 'string' ? term.word : cleanText(term.word);
      const defn = typeof term.definition === 'string' ? term.definition : cleanText(term.definition);
      if (word && defn) {
        lines.push(`- **${stripHtml(word)}**: ${stripHtml(defn)}`);
      }
    }
  }

  return lines.join('\n');
}

function convertCodingProgressionResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`### CHALLENGE ACTIVITY: ${caption}`);

  const lang = (options.language || 'python').toLowerCase().replace('python3', 'python');
  const levels = options.levels || [];
  if (Array.isArray(levels)) {
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (!level) continue;
      if (levels.length > 1) {
        lines.push('', `**Level ${i + 1}:**`);
      }
      if (level.prompt) {
        lines.push(stripHtml(typeof level.prompt === 'string' ? level.prompt : extractAttributedText(level.prompt)));
      }
      if (level.code && typeof level.code === 'string') {
        lines.push('', '```' + lang, decodeEntities(level.code).trim(), '```');
      }
    }
  }

  return lines.join('\n');
}

function convertProgressionResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  lines.push(`### CHALLENGE ACTIVITY: ${caption}`);

  if (resource.instructions && typeof resource.instructions === 'string') {
    lines.push('', stripHtml(resource.instructions));
  }

  if (payload.alt_text) {
    lines.push('', stripHtml(payload.alt_text));
  }

  return lines.join('\n');
}

function convertArrangeInstResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const options = payload.options || {};
  const lines: string[] = [];
  const caption = resource.caption || '';
  const activityType = resource.activity_type || 'participation';
  const label = activityType === 'challenge' ? 'CHALLENGE ACTIVITY' : 'PARTICIPATION ACTIVITY';

  lines.push(`### ${label}: ${caption}`);

  if (resource.instructions) {
    const instrText = cleanText(resource.instructions);
    if (instrText) lines.push('', instrText);
  }

  const vars = options.vars || [];
  if (Array.isArray(vars) && vars.length > 0) {
    lines.push('', `Variables: ${vars.join(', ')}`);
  }

  const instrs = options.instrs || [];
  if (Array.isArray(instrs) && instrs.length > 0) {
    const fixed = instrs.filter((i: any) => i.sortable === 'unsortable' || i.sortable === false);
    const sortable = instrs.filter((i: any) => i.sortable === 'sortable' || i.sortable === true);

    if (fixed.length > 0) {
      lines.push('', '**Fixed instructions (in order):**');
      for (const instr of fixed) {
        lines.push('```', decodeEntities(instr.code || '').trim(), '```');
      }
    }

    if (sortable.length > 0) {
      lines.push('', '**Drag-and-drop instructions (arrange these):**');
      for (let i = 0; i < sortable.length; i++) {
        lines.push(`${i + 1}. \`${decodeEntities(sortable[i].code || '').replace(/\n/g, ' / ')}\``);
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
    lines.push(stripHtml(payload.alt_text));
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
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';
  const title = payload.title || '';

  if (caption || title) {
    lines.push(`**Figure:** ${caption || title}`);
  }

  if (payload.alt_text) {
    lines.push('', stripHtml(payload.alt_text));
  }

  return lines.join('\n');
}

function convertGenericResource(resource: ZyBooksContentResource): string {
  const payload = resource.payload || {};
  const lines: string[] = [];
  const caption = resource.caption || '';

  if (caption) {
    lines.push(`**${caption}**`);
  }

  if (payload.alt_text) {
    lines.push(stripHtml(payload.alt_text));
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

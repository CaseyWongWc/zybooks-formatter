export type PasteMode = 'regular' | 'markdown';

export function formatZybooksText(input: string, mode: PasteMode = 'regular'): string {
  if (mode === 'markdown') {
    return formatMarkdownPaste(input);
  }
  return formatRegularPaste(input);
}

function formatRegularPaste(input: string): string {
  let text = input;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  text = text.replace(/\[Skip to main content\]\([^)]*\)/g, '');
  text = text.replace(/\[_library_books_ zyBooks catalog\]\([^)]*\)/g, '');
  text = text.replace(/\[_help_ Help\/FAQ\]\([^)]*\)/g, '');
  text = text.replace(/\[_search_ Search zyBook\]\([^)]*\)/g, '');

  text = text.replace(/_menu_/g, '');
  text = text.replace(/!\[zyBooks\]\([^)]*\)/g, '');
  text = text.replace(/\[!\[zyBooks\]\([^)]*\)\]\([^)]*\)/g, '');

  text = text.replace(/^-\s+\[My library\]\([^)]*\)\s*\\?>?\s*$/gm, '');
  text = text.replace(/^-\s+\[CS \d+:.*?home\]\([^)]*\)\s*\\?>?\s*$/gm, '');
  text = text.replace(/^-\s+\[\d+\.\d+:.*?\]\([^)]*\)\s*$/gm, '');

  text = text.replace(/^\[My library\]\([^)]*\)\s*\\?>?\s*$/gm, '');
  text = text.replace(/^\[CS \d+:.*?home\]\([^)]*\)\s*\\?>?\s*$/gm, '');

  text = text.replace(/^My library\s*>?\s*$/gm, '');
  text = text.replace(/^CS \d+:.*?home\s*>?\s*$/gm, '');
  text = text.replace(/^\d+\.\d+:.*$/gm, function(match) {
    if (/^\d+\.\d+\s/.test(match)) return match;
    return '';
  });

  text = text.replace(/_account_circle_.*?_arrow_drop_down_/gs, '');

  text = text.replace(/^-\s+_info_[\s\S]*?_close_\s*$/gm, '');
  text = text.replace(/You have unverified email\(s\)\..*$/gm, '');

  const navPattern = /^-\s+(?:\[)?\d+\)\s+.*?(?:_expand_(?:more|less)_)?\s*$/gm;
  text = text.replace(navPattern, '');

  text = text.replace(/^-\s+\[\d+\.\d+\s+.*?\]\(https:\/\/learn\.zybooks\.com[^)]*\)\s*$/gm, '');
  text = text.replace(/^\s*\[_print_ Print chapter\s*\]\([^)]*\)\s*$/gm, '');

  const chapterNavPattern = /^-\s+\d+\)\s+.*$/gm;
  text = text.replace(chapterNavPattern, '');
  text = text.replace(/^\s*_expand_(?:more|less)_\s*$/gm, '');

  text = text.replace(/^-\s+_info_ About this Material\s*$/gm, '');

  text = text.replace(/^\[_arrow_upward_.*?\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^_arrow_upward_.*$/gm, '');

  text = text.replace(/^_assignment_\s*$/gm, '');
  text = text.replace(/^Students:\s*$/gm, '');
  text = text.replace(/^Section \d+\.\d+ is a part of \d+ assignment.*$/gm, '');
  text = text.replace(/^Activities:\s*$/gm, '');
  text = text.replace(/^\s*P\s*$/gm, '');
  text = text.replace(/^Participation\s*$/gm, '');
  text = text.replace(/^Due:.*(?:PST|PDT|EST|EDT|CST|CDT|MST|MDT|UTC).*$/gm, '');
  text = text.replace(/^C\d+\s*$/gm, '');
  text = text.replace(/^C\nChallenge\s*$/gm, '');
  text = text.replace(/^Challenge\s*$/gm, '');

  text = text.replace(/^Survey\s*$/gm, '');
  text = text.replace(/^The following questions are part of a zyBooks survey.*$/gm, '');
  text = text.replace(/^.*Please take a short moment to answer the (?:\[)?student survey(?:\]\([^)]*\))?\.?\s*$/gm, '');
  text = text.replace(/^.*zyBooks survey.*$/gm, '');

  text = text.replace(/^(Construct \d+\.\d+\.\d+:.*)$/gm, '**$1**');
  text = text.replace(/^(Figure \d+\.\d+\.\d+:.*)$/gm, '**$1**');

  text = text.replace(/^TITLE\s*$/gm, '');
  text = text.replace(/^TITLE\s+/gm, '');

  text = text.replace(/^(?:Start)\s*$/gm, '');
  text = text.replace(/^\s*2x speed\s*$/gm, '');
  text = text.replace(/^\s*Captions\s*$/gm, '');
  text = text.replace(/^\s*_keyboard_arrow_up_\s*$/gm, '');
  text = text.replace(/^\s*_keyboard_arrow_down_\s*$/gm, '');
  text = text.replace(/^\s*_keyboard\\?_arrow\\?_up_\s*$/gm, '');
  text = text.replace(/^\s*_keyboard\\?_arrow\\?_down_\s*$/gm, '');
  text = text.replace(/^\s*_expand\\?_more_\s*$/gm, '');
  text = text.replace(/^\s*_expand\\?_less_\s*$/gm, '');
  text = text.replace(/^\s*_thumb\\?_up_\s*$/gm, '');
  text = text.replace(/^\s*_thumb\\?_down_\s*$/gm, '');
  text = text.replace(/^\s*Feedback\?\s*$/gm, '');
  text = text.replace(/^\s*Activity completed\s*$/gm, '');
  text = text.replace(/^\s*Question completed\s*$/gm, '');

  text = text.replace(/^\s*Check\s*$/gm, '');
  text = text.replace(/^\s*Show answer\s*$/gm, '');
  text = text.replace(/^\s*Next\s*$/gm, '');
  text = text.replace(/^\s*Next level\s*$/gm, '');
  text = text.replace(/^\s*Click here for example\s*$/gm, '');
  text = text.replace(/^\s*Type the program's output\s*$/gm, '');
  text = text.replace(/^\s*fullscreen\s*$/gm, '');
  text = text.replace(/^\s*_fullscreen_\s*$/gm, '');
  text = text.replace(/^\s*Full screen\s*$/gm, '');
  text = text.replace(/^\s*Model Solution\s*$/gm, '');
  text = text.replace(/^\s*How to use this tool\s*$/gm, '');
  text = text.replace(/^\s*Run program\s*$/gm, '');
  text = text.replace(/^\s*Submit mode\s*$/gm, '');
  text = text.replace(/^(?:####?\s*)?Unused\s*$/gm, '');
  text = text.replace(/^(?:####?\s*)?main\.py\s*$/gm, '');
  text = text.replace(/^\s*Load default template\.{3}\s*$/gm, '');
  text = text.replace(/^Try \d+\.\d+\.\d+:.*$/gm, '');
  text = text.replace(/^question\\?_mark signifies.*$/gm, '');
  text = text.replace(/^\s*Start Jump to level \d+\s*$/gm, '');
  text = text.replace(/^\s*Try again\s*$/gm, '');
  text = text.replace(/^\s*Input Output\s*$/gm, '');
  text = text.replace(/^\|.*\|\s*$/gm, '');
  text = text.replace(/^\[_arrow\\?_(?:upward|downward)_.*\]\(.*\)\s*$/gm, '');
  text = text.replace(/^\[_library\\?_books_.*\]\(.*\)\s*$/gm, '');

  text = text.replace(/^\d{6,}\.\d+\.\w+\s*$/gm, '');

  text = text.replace(/^!\[\]\(blob:https:\/\/learn\.zybooks\.com\/[^)]*\)\s*$/gm, '');
  text = text.replace(/^.*!\[(?:Correct|Incorrect)\]\(https:\/\/zytools\.zybooks\.com\/[^)]*\)\s*$/gm, '');

  text = text.replace(/^Step \d+[:\s].*$/gm, '');
  text = text.replace(/^Static [Ff]igure[:\s].*$/gm, '');
  text = text.replace(/^Begin Python code[:\s].*$/gm, '');
  text = text.replace(/^Begin Python code\s*$/gm, '');
  text = text.replace(/^End Python code[:\s].*$/gm, '');
  text = text.replace(/^End Python code\.?\s*$/gm, '');
  text = text.replace(/^.*\.\.\.\[Truncated\]\s*$/gm, '');

  text = text.replace(/^(?:Awake\?|1st check|2nd check|3rd check|False|True|Baby in car)\s*$/gm, '');
  text = text.replace(/^Awake\?(?:\d+(?:st|nd|rd|th) check)+(?:False|True)*(?:Baby in car)*\s*$/gm, '');

  text = text.replace(/^\d+\.\d+ LAB:.*$/gm, '');

  text = text.replace(/^\s*Next value\s*$/gm, '');
  text = text.replace(/^\s*Increment\s*$/gm, '');
  text = text.replace(/^\s*Store value\s*$/gm, '');
  text = text.replace(/^Click ".*?" if .*$/gm, '');

  text = text.replace(/^How was this section\?\s*$/gm, '');
  text = text.replace(/^\|?\s*$/gm, '');
  text = text.replace(/^Provide section feedback\s*$/gm, '');
  text = text.replace(/^Activity summary for assignment:.*$/gm, '');
  text = text.replace(/^\d+\s*\/\s*\d+\s*points\s*$/gm, '');
  text = text.replace(/^Completion details\s*$/gm, '');
  text = text.replace(/^\s*_thumb_up_\s*$/gm, '');
  text = text.replace(/^\s*_thumb_down_\s*$/gm, '');
  text = text.replace(/^\s*Check\s+(?:Show answer|Next level)\s*$/gm, '');
  text = text.replace(/^\s*Done\..*Click any level.*$/gm, '');

  text = text.replace(/^[\u05D0-\u05EA]{10,}\s*$/gm, '');
  text = text.replace(/^X{10,}\s*$/gm, '');

  text = text.replace(/^Skip to main content\s*$/gm, '');
  text = text.replace(/^zyBooks\s*$/gm, '');
  text = text.replace(/^zyBooks catalog\s*$/gm, '');
  text = text.replace(/^Help\/FAQ\s*$/gm, '');
  text = text.replace(/^.*?Casey Wong.*$/gm, '');
  text = text.replace(/^\s*Search zyBook\s*$/gm, '');
  text = text.replace(/^\s*About this Material\s*$/gm, '');

  text = text.replace(/^\s*-?\s*\[\d+\.\d+\s+[^\]]*?\n\s*\]\(https:\/\/learn\.zybooks\.com\/[^)]*\)\s*$/gm, '');
  text = text.replace(/^\s*-\s+\[\d+\.\d+\s+.*?\]\(https:\/\/learn\.zybooks\.com\/.*?\)\s*$/gm, '');
  text = text.replace(/^\s*-?\s*\[_print_\s+Print chapter\s*\n?\s*\]\(.*?\)\s*$/gm, '');
  text = text.replace(/^\[\]\(https:\/\/learn\.zybooks\.com\/\)\s*$/gm, '');

  text = text.replace(/\s*\\>\s*/g, ' ');

  text = text.replace(/^(\s*)(participation\s+activity)\s*$/gim, function(_match, indent, label) {
    return indent + '**' + label.toUpperCase() + '**';
  });
  text = text.replace(/^(\s*)(challenge\s+activity)\s*$/gim, function(_match, indent, label) {
    return indent + '**' + label.toUpperCase() + '**';
  });

  text = text.replace(/^(\s*)(PARTICIPATION\s*\n\s*ACTIVITY)\s*$/gm, '**PARTICIPATION ACTIVITY**');

  text = text.replace(/^##\s*$/gm, '');

  text = text.replace(/^(\d+)\)\s*$/gm, '');

  text = text.replace(/^Loop\s*$/gm, '');
  text = text.replace(/^Output\s*$/gm, '');
  text = text.replace(/^Input\s*$/gm, '');

  text = text.replace(/^List\s*$/gm, '');
  text = text.replace(/^Counter\s*$/gm, '');
  text = text.replace(/^Max\s*$/gm, '');

  text = text.replace(/^(?:sum|num|val|max|count|avg)\s*=\s*(?:Get next input|\d+)\s*$/gm, '');

  text = text.replace(/^(?:sum|num|val|max|count|avg)\s*=\s*(?:sum|num|val|avg|max|count)\s*[\+\-\*\/]\s*(?:sum|num|val|avg|max|count|\d+)\s*$/gm, '');
  text = text.replace(/^(?:num)\s*=\s*(?:num)\s*\+\s*1\s*$/gm, '');

  text = text.replace(/^Put (?:sum|avg|max|count|val) to output.*$/gm, '');
  text = text.replace(/^avg = sum \/ num\s*$/gm, '');

  text = text.replace(/^(?:sum|num|val|max|count|avg):[\d\s-]*$/gm, '');
  text = text.replace(/^sum:\s*$/gm, '');
  text = text.replace(/^num:\s*$/gm, '');

  text = text.replace(/^(?:sum|num|val|avg|max|count)\s*=\s*(?:sum|num|val|avg|max|count|Get next input|\d+).*(?:sum|val|num|avg|max|count)\s*=\s*(?:sum|num|val|avg|max|count|Get next input|\d+).*$/gm, '');

  text = text.replace(/^While\s+val\s*>\s*-?\d+.*val\s*=\s*Get next input.*$/gm, '');

  text = text.replace(/^(?:\d+\s+){3,}$/gm, '');
  text = text.replace(/^(?:-?\d+\s+){2,}-?\d+\s*$/gm, function(match) {
    if (match.trim().split(/\s+/).length >= 3) {
      const nums = match.trim().split(/\s+/);
      if (nums.every(n => /^-?\d+$/.test(n))) return '';
    }
    return match;
  });

  text = text.replace(/^\d+\s*\/\s*\d+\s*$/gm, '');

  text = text.replace(/^(\s*)\*\s+\[([^\]]+)\]\(https:\/\/learn\.zybooks\.com[^)]*\)\s*$/gm, '');
  text = text.replace(/^-\s+\[([^\]]+)\s*(?:Lab)?\s*\]\(https:\/\/learn\.zybooks\.com[^)]*\)\s*$/gm, '');

  text = text.replace(/^\s*Lab\s*$/gm, '');

  text = text.replace(/^-\s*$/gm, '');

  text = text.replace(/^\s*\[\d+\.\d+\s+.*?\]\(https:\/\/learn\.zybooks\.com[^)]*\)\s*$/gm, '');

  text = text.replace(/^\s*\[student survey\]\([^)]*\)\s*$/gm, '');

  const sectionCounts: Record<string, number> = {};
  const sectionLines = text.split('\n');
  for (const sl of sectionLines) {
    const subMatch = sl.match(/^(\d+\.\d+)\.\d+/);
    if (subMatch) {
      const parent = subMatch[1];
      sectionCounts[parent] = (sectionCounts[parent] || 0) + 1;
    }
  }

  let mainSectionNum = '';
  let maxCount = 0;
  for (const [sec, cnt] of Object.entries(sectionCounts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      mainSectionNum = sec;
    }
  }

  if (mainSectionNum) {
    const parts = mainSectionNum.split('.');
    const major = parts[0];
    const minor = parseInt(parts[1]);
    for (const adj of [minor - 1, minor + 1]) {
      const adjSec = major + '.' + adj;
      const escaped = adjSec.replace('.', '\\.');
      text = text.replace(new RegExp('^' + escaped + '\\s+(?!\\d).*$', 'gm'), '');
    }
  }

  text = formatAnswerChoices(text);

  text = text.replace(/\\=/g, '=');
  text = text.replace(/\\_/g, '_');
  text = text.replace(/\\#/g, '#');
  text = text.replace(/\\-/g, '-');
  text = text.replace(/\\\[/g, '[');
  text = text.replace(/\\\]/g, ']');
  text = text.replace(/\\\|/g, '|');

  return collapseWhitespace(text);
}

function formatMarkdownPaste(input: string): string {
  let text = input;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  text = text.replace(/^\[Skip to main content\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^_menu_\s*$/gm, '');
  text = text.replace(/^\[!\[zyBooks\]\([^)]*\)\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^!\[zyBooks\]\([^)]*\)\s*$/gm, '');

  text = text.replace(/^\[_library\\_books_ zyBooks catalog\]\([^)]*\).*$/gm, '');
  text = text.replace(/^\[_help_ Help\/FAQ\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^\[_search_ Search zyBook\]\([^)]*\)\s*$/gm, '');

  text = text.replace(/^-\s+\[My library\]\([^)]*\)\s*\\?>?\s*$/gm, '');
  text = text.replace(/^-\s+\[CS \d+:.*?home\]\([^)]*\)\s*\\?>?\s*$/gm, '');
  text = text.replace(/^-\s+\[\d+\.\d+:.*?\]\([^)]*\)\s*$/gm, '');

  text = text.replace(/_account\\_circle_ .*? _arrow\\_drop\\_down_/gs, '');

  text = text.replace(/^-\s+_info_\s*$/gm, '');
  text = text.replace(/^\s+You have unverified email.*$/gm, '');
  text = text.replace(/^\s+_close_\s*$/gm, '');

  text = text.replace(/^-\s+\[_search_.*?\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^-\s+_info_ About this Material\s*$/gm, '');

  text = text.replace(/^-\s+\d+\)\s+.*$/gm, '');
  text = text.replace(/^\s+_expand\\_(?:more|less)_\s*$/gm, '');
  text = text.replace(/\s+-\s+\[\d+\.\d+\s+[^\]]*?\s*\]\(https:\/\/learn\.zybooks\.com[^)]*\)/g, '');
  text = text.replace(/\s+-\s+\[_print_ Print chapter\s*\]\([^)]*\)/g, '');
  text = text.replace(/^\s+Lab\s*$/gm, '');

  text = text.replace(/^\[_arrow\\_upward_.*?\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^\[_arrow\\_downward_.*?\]\([^)]*\)\s*$/gm, '');

  text = text.replace(/^_assignment_\s*$/gm, '');
  text = text.replace(/^Students:\s*$/gm, '');
  text = text.replace(/^Section \d+\.\d+ is a part of \d+ assignment.*$/gm, '');
  text = text.replace(/^Activities:\s*$/gm, '');
  text = text.replace(/^\s*P\s*$/gm, '');
  text = text.replace(/^Participation\s*$/gm, '');
  text = text.replace(/^\s*C\s*$/gm, '');
  text = text.replace(/^Challenge\s*$/gm, '');
  text = text.replace(/^Due:.*(?:PST|PDT|EST|EDT|CST|CDT|MST|MDT|UTC).*$/gm, '');

  text = text.replace(/^##\s*$/gm, '');
  text = text.replace(/^##\s*\n\s*Survey\s*$/gm, '');
  text = text.replace(/^Survey\s*$/gm, '');
  text = text.replace(/^The following questions are part of a zyBooks survey.*$/gm, '');
  text = text.replace(/^.*Please take a short moment to answer the \[student survey\]\([^)]*\)\.?\s*$/gm, '');

  text = text.replace(/^##\s*\n\s*(Construct \d+\.\d+\.\d+:.*)$/gm, '**$1**');
  text = text.replace(/^(Construct \d+\.\d+\.\d+:.*)$/gm, '**$1**');
  text = text.replace(/^##\s*\n\s*(Figure \d+\.\d+\.\d+:.*)$/gm, '**$1**');
  text = text.replace(/^(Figure \d+\.\d+\.\d+:.*)$/gm, '**$1**');

  text = text.replace(/^Start\s*$/gm, '');
  text = text.replace(/^Start Jump to level \d+\s*$/gm, '');
  text = text.replace(/^\s*2x speed\s*$/gm, '');
  text = text.replace(/^\s*Captions\s*$/gm, '');
  text = text.replace(/^\s*_keyboard\\_arrow\\_up_\s*$/gm, '');
  text = text.replace(/^\s*_keyboard\\_arrow\\_down_\s*$/gm, '');
  text = text.replace(/^\s*Feedback\?\s*$/gm, '');

  text = text.replace(/^Check Show answer\s*$/gm, '');
  text = text.replace(/^Check Next level\s*$/gm, '');
  text = text.replace(/^\s*Check\s*$/gm, '');
  text = text.replace(/^\s*Show answer\s*$/gm, '');
  text = text.replace(/^\s*Next\s*$/gm, '');
  text = text.replace(/^\s*Next level\s*$/gm, '');
  text = text.replace(/^\s*Try again\s*$/gm, '');
  text = text.replace(/^\s*Show solution\s*$/gm, '');
  text = text.replace(/^\s*Click here for example\s*$/gm, '');
  text = text.replace(/^\*\*Click here for example\*\*.*$/gm, '');
  text = text.replace(/^\s*Type the program's output\s*$/gm, '');
  text = text.replace(/^question\\_mark signifies.*$/gm, '');
  text = text.replace(/^question_mark signifies.*$/gm, '');
  text = text.replace(/^\*\*Done\*\*\..*$/gm, '');
  text = text.replace(/^✖.*$/gm, '');
  text = text.replace(/^!\[Correct\]\([^)]*\)\s*$/gm, '');
  text = text.replace(/^\s*Solution\s*$/gm, '');
  text = text.replace(/^\s*Input Output\s*$/gm, '');
  text = text.replace(/^\s*fullscreen\s*$/gm, '');
  text = text.replace(/^\s*_fullscreen_\s*$/gm, '');
  text = text.replace(/^\s*Full screen\s*$/gm, '');
  text = text.replace(/^\s*Model Solution\s*$/gm, '');
  text = text.replace(/^\s*How to use this tool\s*$/gm, '');
  text = text.replace(/^\s*Run program\s*$/gm, '');
  text = text.replace(/^\s*Submit mode\s*$/gm, '');
  text = text.replace(/^####\s*Unused\s*$/gm, '');
  text = text.replace(/^####\s*main\.py\s*$/gm, '');
  text = text.replace(/^\s*Load default template\.{3}\s*$/gm, '');
  text = text.replace(/^Try \d+\.\d+\.\d+:.*$/gm, '');

  text = text.replace(/^\d{6,}\.\d+\.\w+\s*$/gm, '');
  text = text.replace(/^\s*\d{6,}\.\d+\.\w+\s*$/gm, '');

  text = text.replace(/^Static figure:.*$/gim, '');
  text = text.replace(/^Begin Python code:.*$/gm, '');
  text = text.replace(/^End Python code\..*$/gm, '');
  text = text.replace(/^Step \d+:.*$/gm, '');
  text = text.replace(/^.*\.\.\.\[Truncated\]\s*$/gm, '');

  text = text.replace(/^[הה]{10,}\s*$/gm, '');
  text = text.replace(/^X{10,}\s*$/gm, '');

  function splitCodeLine(flat: string): string[] {
    const stmtStart = /(?<=\s)(?=(?:while |for |if |elif |else:|def |class |import |from |return |try:|except |with |raise |pass$|print\(|[a-z_]\w*\s*=(?!=)|"""|# ))/;
    const parts = flat.split(stmtStart).map(s => s.trim()).filter(s => s.length > 0);
    if (parts.length <= 1) {
      const fallback = flat.split(/\s{2,}/).filter(l => l.trim());
      return fallback.length > 1 ? fallback : [flat];
    }
    return parts;
  }

  text = text.replace(/^\| -.*main\.py.*\|.*\|\s*$/gm, '');
  text = text.replace(/^\|\s*---\s*(?:\|\s*---\s*)*\|\s*$/gm, '');

  text = text.replace(/^\|[^|].*\|\s*$/gm, function(match) {
    if (/^\|\s*---/.test(match)) return '';
    if (/^\|\s*-\s*main\.py/.test(match)) return '';

    const inner = match.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '');
    const isCodeTable = inner.includes('\\=') || inner.includes('for ') || inner.includes('print') || inner.includes('def ') || inner.includes('total') || inner.includes('average');
    if (!isCodeTable) return match;

    function unescapeMd(s: string): string {
      return s
        .replace(/\\\\=/g, '=')
        .replace(/\\\\-/g, '-')
        .replace(/\\\\\[/g, '[')
        .replace(/\\\\\]/g, ']')
        .replace(/\\\\\|/g, '|')
        .replace(/\\\\_/g, '_')
        .replace(/\\\\#/g, '#')
        .replace(/\\\\/g, '\\')
        .replace(/\\=/g, '=')
        .replace(/\\#/g, '#')
        .replace(/\\-/g, '-')
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']')
        .replace(/\\\|/g, '|')
        .replace(/\\_/g, '_');
    }

    const columns = inner.split(/\s*(?<!\\)\|\s*/);
    if (columns.length === 2) {
      const code = unescapeMd(columns[0]);
      const output = unescapeMd(columns[1]);
      const codeLines = splitCodeLine(code);
      const outputLines = output.split(/\s{2,}/).filter(l => l.trim());
      let result = '```python\n' + codeLines.join('\n') + '\n```';
      if (outputLines.length > 0 && outputLines[0].trim()) {
        result += '\n\nOutput:\n' + outputLines.join('\n');
      }
      return result;
    }

    const cleaned = unescapeMd(inner);
    const parts = cleaned.split(/\s{2,}/).filter(l => l.trim());
    return '```python\n' + parts.join('\n') + '\n```';
  });

  text = text.replace(/\\=/g, '=');
  text = text.replace(/\\\[/g, '[');
  text = text.replace(/\\\]/g, ']');
  text = text.replace(/\\_/g, '_');
  text = text.replace(/\\#/g, '#');
  text = text.replace(/\\\*/g, '*');
  text = text.replace(/\\-/g, '-');
  text = text.replace(/\\\|/g, '|');
  text = text.replace(/\\\\/g, '\\');

  text = text.replace(/^How was this section\?\s*$/gm, '');
  text = text.replace(/^_thumb_up_\s*$/gm, '');
  text = text.replace(/^\s*_thumb_down_\s*$/gm, '');
  text = text.replace(/^Provide section feedback\s*$/gm, '');
  text = text.replace(/^Activity summary for assignment:.*$/gm, '');
  text = text.replace(/^\d+\s*\/\s*\d+\s*points\s*$/gm, '');
  text = text.replace(/^Completion details\s*$/gm, '');

  text = text.replace(/^(\s*)(participation\s+activity)\s*$/gim, function(_match, indent, label) {
    return indent + '**' + label.toUpperCase() + '**';
  });
  text = text.replace(/^(\s*)(challenge\s+activity)\s*$/gim, function(_match, indent, label) {
    return indent + '**' + label.toUpperCase() + '**';
  });

  text = text.replace(/^(\d+)\)\s*$/gm, '');

  const editorLineNumsPattern = /(?:^\d\s*\n){3,}/gm;
  text = text.replace(editorLineNumsPattern, '');

  text = text.replace(/^\s*\|\s*$/gm, '');
  text = text.replace(/^-\s*$/gm, '');

  const sectionCounts: Record<string, number> = {};
  const sectionLines = text.split('\n');
  for (const sl of sectionLines) {
    const subMatch = sl.match(/^(?:#+\s+)?(\d+\.\d+)\.\d+/);
    if (subMatch) {
      const parent = subMatch[1];
      sectionCounts[parent] = (sectionCounts[parent] || 0) + 1;
    }
  }

  let mainSectionNum = '';
  let maxSCount = 0;
  for (const [sec, cnt] of Object.entries(sectionCounts)) {
    if (cnt > maxSCount) {
      maxSCount = cnt;
      mainSectionNum = sec;
    }
  }

  if (mainSectionNum) {
    const parts = mainSectionNum.split('.');
    const major = parts[0];
    const minor = parseInt(parts[1]);
    for (const adj of [minor - 1, minor + 1]) {
      const adjSec = major + '.' + adj;
      const escaped = adjSec.replace('.', '\\.');
      text = text.replace(new RegExp('^\\[_arrow_(?:upward|downward)_\\s+' + escaped + '.*?\\]\\([^)]*\\)\\s*$', 'gm'), '');
      text = text.replace(new RegExp('^' + escaped + '\\s+(?!\\d).*$', 'gm'), '');
    }
  }

  text = formatAnswerChoices(text);

  return collapseWhitespace(text);
}

function isCodeLike(text: string): boolean {
  const lines = text.split('\n');
  const first = lines[0].trim();
  return /^(?:for |if |while |def |class |print\(|return |import |from |elif |else:|try:|except |with |raise )/.test(first) ||
    /^[a-z_]\w*\s*=/.test(first) ||
    /^[a-z_]\w*\s*\[/.test(first) ||
    /^\s{2,}/.test(lines[0]) ||
    (lines.length > 1 && lines.some(l => /^\s{2,}/.test(l)));
}

function formatAnswerChoices(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const result: string[] = [];

  let inActivity = false;
  let sectionHasQuestions = false;
  let afterQuestion = false;
  let questionType: 'simple' | 'output' | 'prints' = 'simple';
  let inCodeSupp = false;
  let printsOutputConsumed = false;

  function scanForQuestions(startIdx: number): boolean {
    for (let j = startIdx + 1; j < paragraphs.length; j++) {
      const p = paragraphs[j].trim();
      if (/^\*\*PARTICIPATION ACTIVITY\*\*/.test(p) || /^\*\*CHALLENGE ACTIVITY\*\*/.test(p) || p.startsWith('### ')) break;
      const firstLine = p.split('\n')[0].trim();
      if (/\?\s*$/.test(firstLine)) return true;
    }
    return false;
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const trimmed = para.trim();
    if (!trimmed) {
      result.push(para);
      continue;
    }

    const firstLine = trimmed.split('\n')[0].trim();

    if (/^\*\*PARTICIPATION ACTIVITY\*\*/.test(trimmed) || /^\*\*CHALLENGE ACTIVITY\*\*/.test(trimmed)) {
      inActivity = true;
      afterQuestion = false;
      inCodeSupp = false;
      printsOutputConsumed = false;
      sectionHasQuestions = scanForQuestions(i);
      result.push(para);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      inActivity = false;
      afterQuestion = false;
      result.push(para);
      continue;
    }

    if (!inActivity || !sectionHasQuestions) {
      result.push(para);
      continue;
    }

    if (/^\d+\.\d+\.\d+:/.test(firstLine)) {
      result.push(para);
      continue;
    }

    if (/\?\s*$/.test(firstLine)) {
      afterQuestion = true;
      inCodeSupp = false;
      printsOutputConsumed = false;
      if (/how many\b/i.test(firstLine)) {
        questionType = 'output';
        inCodeSupp = true;
      } else if (/prints?\b/i.test(firstLine)) {
        questionType = 'prints';
      } else if (/output/i.test(firstLine)) {
        questionType = 'output';
        inCodeSupp = true;
      } else {
        questionType = 'simple';
      }
      result.push(para);
      continue;
    }

    if (!afterQuestion) {
      result.push(para);
      continue;
    }

    if (questionType === 'output' && inCodeSupp) {
      if (isCodeLike(trimmed)) {
        result.push(para);
        continue;
      }
      inCodeSupp = false;
    }

    if (questionType === 'prints' && !printsOutputConsumed) {
      if (!isCodeLike(trimmed)) {
        printsOutputConsumed = true;
        result.push(para);
        continue;
      }
    }

    const paraLines = trimmed.split('\n');

    if (paraLines.length === 1) {
      result.push('- ' + trimmed);
    } else if (isCodeLike(trimmed)) {
      const indentedCode = paraLines.map(l => '  ' + l).join('\n');
      result.push('- \n  ```python\n' + indentedCode + '\n  ```');
    } else {
      result.push('- ' + paraLines[0] + '\n' + paraLines.slice(1).map(l => '  ' + l).join('\n'));
    }
  }

  return result.join('\n\n');
}

function escapePythonComments(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  function findNearby(idx: number, direction: number): string {
    for (let j = idx + direction; j >= 0 && j < lines.length; j += direction) {
      if (lines[j].trim() !== '') return lines[j];
    }
    return '';
  }

  const codePattern = /^(?:for |if |while |def |class |print|return |import |from |else:|elif |try:|except |with |raise |pass$)/;

  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      result.push(line);
      continue;
    }
    if (inFence) {
      result.push(line);
      continue;
    }
    if (/^#\s/.test(line) && !/^#{1,6}\s+\d+\.\d+/.test(line) && !/^##?\s*$/.test(line)) {
      const prevRaw = findNearby(i, -1);
      const nextRaw = findNearby(i, 1);
      const prev = prevRaw.trim();
      const next = nextRaw.trim();
      const isNearCode = codePattern.test(prev) ||
        codePattern.test(next) ||
        /^\s{2,}/.test(prevRaw) ||
        /^\s{2,}/.test(nextRaw) ||
        /^[a-z_]\w*\s*[=+\-*\/\[\(]/.test(prev) ||
        /^[a-z_]\w*\s*[=+\-*\/\[\(]/.test(next) ||
        /^#\s/.test(prevRaw) ||
        /^\\#\s/.test(prevRaw);

      if (isNearCode) {
        result.push('\\' + line);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

function collapseWhitespace(text: string): string {
  text = escapePythonComments(text);

  const lines = text.split('\n');
  const result: string[] = [];
  let blankCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      blankCount++;
      if (blankCount <= 2) {
        result.push('');
      }
    } else {
      blankCount = 0;
      result.push(line);
    }
  }

  let final = result.join('\n').trim();
  final = final.replace(/\n{3,}/g, '\n\n');
  return final;
}

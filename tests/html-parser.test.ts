import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Document = dom.window.Document;

import { formatHtmlPaste } from '../client/src/lib/html-parser';

interface TestResult {
  name: string;
  passed: boolean;
  failures: string[];
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  const failures: string[] = [];
  const originalAssert = assert;
  function assert(condition: boolean, msg: string) {
    if (!condition) failures.push(msg);
  }
  try {
    fn();
  } catch (e: any) {
    failures.push(`Exception: ${e.message}`);
  }
  const passed = failures.length === 0;
  results.push({ name, passed, failures });
  console.log(`${passed ? '✓' : '✗'} ${name}`);
  if (!passed) failures.forEach(f => console.log(`    FAIL: ${f}`));
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function contains(output: string, expected: string, label?: string): boolean {
  const found = output.includes(expected);
  if (!found) console.log(`    MISSING: "${label || expected}"`);
  return found;
}

function notContains(output: string, forbidden: string, label?: string): boolean {
  const found = !output.includes(forbidden);
  if (!found) console.log(`    UNWANTED: "${label || forbidden}" found in output`);
  return found;
}

function loadSample(filename: string): string {
  const p = path.join(__dirname, '..', 'attached_assets', filename);
  if (!fs.existsSync(p)) {
    throw new Error(`Sample file not found: ${p}`);
  }
  return fs.readFileSync(p, 'utf-8');
}

test('Section 5.8: Section title extracted', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '# 5.8 Nested loops'), 'Should have section title "# 5.8 Nested loops"');
});

test('Section 5.8: Content headings preserved', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, 'Nested loops'), 'Should contain "Nested loops" heading content');
});

test('Section 5.8: Python code blocks preserved', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '```python'), 'Should contain python code fences');
  assert(contains(output, 'for'), 'Should contain "for" keyword in code');
  assert(contains(output, 'range'), 'Should contain "range" in code');
});

test('Section 5.8: PA question text with numbers inline', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  const hasNumberedQuestion = /\d\)\s+\S/.test(output);
  assert(hasNumberedQuestion, 'Should have numbered questions like "1) question text"');
});

test('Section 5.8: No zyBooks UI artifacts', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  assert(notContains(output, 'Feedback?'), 'Should not contain "Feedback?"');
  assert(notContains(output, 'Show answer'), 'Should not contain "Show answer"');
  assert(notContains(output, 'Check'), 'Should not contain standalone "Check"');
  assert(notContains(output, 'Skip to main content'), 'Should not contain nav text');
  assert(notContains(output, '<button'), 'Should not contain HTML button tags');
  assert(notContains(output, '<input'), 'Should not contain HTML input tags');
  assert(notContains(output, '<iframe'), 'Should not contain HTML iframe tags');
});

test('Section 5.8: PARTICIPATION ACTIVITY labels present', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '**PARTICIPATION ACTIVITY**'), 'Should have bolded PA labels');
});

test('Section 5.8: CHALLENGE ACTIVITY labels present', () => {
  const html = loadSample('Section_5.8_-_CS_2520__Python_for_Programmers___zyBooks_1772187034925.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '**CHALLENGE ACTIVITY**'), 'Should have bolded CA labels');
});

test('Fill-in-the-blank: [___] placeholder insertion', () => {
  const html = `<h1 class="zybook-section-title">Test Section</h1>
    <div class="section-content-resources-container">
      <div class="short-answer-content-resource interactive-activity-container participation">
        <div class="activity-title-bar"><div class="activity-type">participation activity</div>
        <div class="activity-description"><h2><div class="activity-title">Test PA</div></h2></div></div>
        <div class="activity-payload"><div class="content-resource short-answer-payload">
          <div class="question-set-question short-answer-question"><div class="question">
            <div class="setup flex-row"><div class="label">1)</div>
              <div class="text"><div>The loop runs <div class="zb-input-container"><input class="zb-input" type="text"></div> times.</div></div>
            </div>
          </div></div>
        </div></div>
      </div>
    </div>`;
  const output = formatHtmlPaste(html);
  assert(contains(output, '[___]'), 'Should insert [___] placeholder for input fields');
  assert(contains(output, 'The loop runs'), 'Should preserve question text around blanks');
  assert(notContains(output, '<input'), 'Should not contain raw input HTML');
});

test('Multiple-choice: Answer options extracted', () => {
  const html = `<h1 class="zybook-section-title">Test MC</h1>
    <div class="section-content-resources-container">
      <div class="short-answer-content-resource interactive-activity-container participation">
        <div class="activity-title-bar"><div class="activity-type">participation activity</div>
        <div class="activity-description"><h2><div class="activity-title">MC Test</div></h2></div></div>
        <div class="activity-payload"><div class="content-resource short-answer-payload">
          <div class="question-set-question"><div class="question">
            <div class="setup flex-row"><div class="label">1)</div>
              <div class="text"><div>What is the output?</div></div>
            </div>
            <div class="question-container">
              <div class="answer" role="radio"><span class="material-icons">radio_button_unchecked</span><span class="text">Option A</span></div>
              <div class="answer" role="radio"><span class="material-icons">radio_button_unchecked</span><span class="text">Option B</span></div>
            </div>
          </div></div>
        </div></div>
      </div>
    </div>`;
  const output = formatHtmlPaste(html);
  assert(contains(output, 'Option A'), 'Should extract MC option A');
  assert(contains(output, 'Option B'), 'Should extract MC option B');
  assert(contains(output, '○'), 'Should format options with circle marker');
});

test('Question numbers inline with text', () => {
  const html = `<h1 class="zybook-section-title">Test</h1>
    <div class="section-content-resources-container">
      <div class="short-answer-content-resource interactive-activity-container participation">
        <div class="activity-title-bar"><div class="activity-type">participation activity</div>
        <div class="activity-description"><h2><div class="activity-title">PA Test</div></h2></div></div>
        <div class="activity-payload"><div class="content-resource short-answer-payload">
          <div class="question-set-question"><div class="question">
            <div class="setup flex-row"><div class="label">1)</div>
              <div class="text"><div>How many iterations?</div></div>
            </div>
          </div></div>
          <div class="question-set-question"><div class="question">
            <div class="setup flex-row"><div class="label">2)</div>
              <div class="text"><div>What is printed?</div></div>
            </div>
          </div></div>
        </div></div>
      </div>
    </div>`;
  const output = formatHtmlPaste(html);
  assert(contains(output, '1) How many iterations?'), 'Question 1 should be inline: "1) How many iterations?"');
  assert(contains(output, '2) What is printed?'), 'Question 2 should be inline: "2) What is printed?"');
});

test('Code blocks with embedded question text', () => {
  const html = `<h1 class="zybook-section-title">Test Code Q</h1>
    <div class="section-content-resources-container">
      <div class="short-answer-content-resource interactive-activity-container participation">
        <div class="activity-title-bar"><div class="activity-type">participation activity</div>
        <div class="activity-description"><h2><div class="activity-title">Code Q</div></h2></div></div>
        <div class="activity-payload"><div class="content-resource short-answer-payload">
          <div class="question-set-question"><div class="question">
            <div class="setup flex-row"><div class="label">1)</div>
              <div class="text"><div>Given the following code, how many times does the loop execute?<br>
                <div class="code no-box"><div class="highlight"><pre><span class="k">for</span> <span class="n">i</span> <span class="ow">in</span> <span class="nb">range</span><span class="p">(</span><span class="mi">5</span><span class="p">):</span>
    <span class="nb">print</span><span class="p">(</span><span class="n">i</span><span class="p">)</span></pre></div></div>
              </div></div>
            </div>
          </div></div>
        </div></div>
      </div>
    </div>`;
  const output = formatHtmlPaste(html);
  assert(contains(output, 'how many times does the loop execute'), 'Should extract question text');
  assert(contains(output, '```python'), 'Should have code block');
  assert(contains(output, 'for i in range(5)'), 'Should preserve code content');
  assert(contains(output, 'print(i)'), 'Should preserve print statement');
});

test('Prose content with bold terms', () => {
  const html = `<h1 class="zybook-section-title">5.1 Loops</h1>
    <div class="section-content-resources-container">
      <div class="content-resource html-content-resource">
        <div><h3>While loops</h3>
          <p>A <span class="term">while loop</span> is a construct that repeatedly executes a group of statements.</p>
        </div>
      </div>
    </div>`;
  const output = formatHtmlPaste(html);
  assert(contains(output, '# 5.1 Loops'), 'Should have section title');
  assert(contains(output, 'While loops'), 'Should preserve h3 heading');
  assert(contains(output, 'while loop'), 'Should preserve term text');
  assert(contains(output, 'repeatedly executes'), 'Should preserve prose content');
});

test('Section 5.1: Full section extraction', () => {
  const html = loadSample('Section_5.1_-_CS_2520__Python_for_Programmers___zyBooks_1772175506722.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '# 5.1'), 'Should have section 5.1 title');
  assert(output.length > 500, `Output should be substantial (got ${output.length} chars)`);
  assert(notContains(output, '<button'), 'Should not contain HTML tags');
});

test('Section 5.5: Full section extraction', () => {
  const html = loadSample('Section_5.5_-_CS_2520__Python_for_Programmers___zyBooks_1772179146121.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '# 5.5'), 'Should have section 5.5 title');
  assert(output.length > 500, `Output should be substantial (got ${output.length} chars)`);
});

test('Section 5.9: Full section extraction', () => {
  const html = loadSample('Section_5.9_-_CS_2520__Python_for_Programmers___zyBooks_1772249448699.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '# 5.9'), 'Should have section 5.9 title');
  assert(output.length > 500, `Output should be substantial (got ${output.length} chars)`);
});

test('Section 5.10: Full section extraction', () => {
  const html = loadSample('Section_5.10_-_CS_2520__Python_for_Programmers___zyBooks_1772250003439.html');
  const output = formatHtmlPaste(html);
  assert(contains(output, '# 5.10'), 'Should have section 5.10 title');
  assert(output.length > 500, `Output should be substantial (got ${output.length} chars)`);
});

test('Empty input returns empty string', () => {
  const output = formatHtmlPaste('');
  assert(output.trim() === '', 'Empty input should return empty output');
});

test('No section container gracefully falls back', () => {
  const html = '<html><body><p>Just some text</p></body></html>';
  const output = formatHtmlPaste(html);
  assert(typeof output === 'string', 'Should return a string even without section container');
});

test('Parsons (drag-and-drop) challenge extraction', () => {
  const html = `<h1 class="zybook-section-title">Test Parsons</h1>
    <div class="section-content-resources-container">
      <div class="interactive-activity-container challenge">
        <div class="activity-title-bar"><div class="activity-type">challenge activity</div>
        <div class="activity-description"><h2><div class="activity-title">5.8.3: Print seats.</div></h2></div></div>
        <div class="activity-payload">
          <div class="reorderable-lists-instructions"><p>Rearrange the following code to print all seats.</p></div>
          <div class="sortable" data-list-name="unused" role="listbox">
            <div class="block moveable" data-block-id="0"><span class="hljs-keyword">for</span> row <span class="hljs-keyword">in</span> <span class="hljs-built_in">range</span>(num_rows):</div>
            <div class="block moveable" data-block-id="1"><span class="hljs-built_in">print</span>(<span class="hljs-string">"*"</span>)</div>
          </div>
        </div>
      </div>
    </div>`;
  const output = formatHtmlPaste(html);
  assert(contains(output, '**CHALLENGE ACTIVITY**'), 'Should label as challenge');
  assert(contains(output, '5.8.3'), 'Should have activity number');
  assert(contains(output, 'Rearrange'), 'Should have Parsons instructions');
  assert(contains(output, 'for row in range(num_rows)'), 'Should extract code blocks');
});

console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  ✗ ${r.name}`);
    r.failures.forEach(f => console.log(`      ${f}`));
  });
}

process.exit(failed > 0 ? 1 : 0);

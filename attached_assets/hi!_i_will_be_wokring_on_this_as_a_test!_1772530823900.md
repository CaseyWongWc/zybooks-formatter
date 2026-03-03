<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# hi! i will be wokring on this as a test!

Nice, this looks like a great setup for practicing functions in Python using zyBooks and Colab.[^1_1][^1_2]

If you want, we can go through each participation/challenge activity one by one and I can:

- Help you reason through the answer first (visually, step‑by‑step).
- Then translate that into the exact code or text you should type.

Tell me which activity number you want to start with (for example: “6.1.6 \#1” or “the calc_pizza_calories_per_slice one”), and paste the prompt or a screenshot of just that part.
<span style="display:none">[^1_3]</span>

<div align="center">⁂</div>

[^1_1]: https://colab.research.google.com/github/CaseyWongWc/zybooks-formatter/blob/main2/notebooks/6.1_User-defined_function_basics.ipynb\#scrollTo=k3PGRXPPworr

[^1_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^1_3]: image.jpg


---

# give me a moment

All good, take your time.[^2_1][^2_2]

When you’re ready, tell me:

- Which exact activity (e.g., “6.1.2 Q2” or “6.1.6 part 1”), and
- If it’s multiple choice or code you have to type.

Then I’ll walk you through the logic step‑by‑step and show what to enter.
<span style="display:none">[^2_3]</span>

<div align="center">⁂</div>

[^2_1]: https://colab.research.google.com/github/CaseyWongWc/zybooks-formatter/blob/main2/notebooks/6.1_User-defined_function_basics.ipynb\#scrollTo=5ephphU3zoW6

[^2_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^2_3]: image.jpg


---

# let me see if i ca use notiton as an easier medium, the app clumped everything togetheer unfrtunately

Yeah, using **Notion** as the “middle layer” is a smart move here.[^3_1]

You can:

- Copy each participation/challenge prompt from zyBooks into Notion as its own bullet or toggle.
- Under each one, leave space where we’ll write the answer / code.
- Then paste one question (or small group of related ones) at a time into this chat so we can solve it together.

Whenever you’re ready, grab the first bit you want help with (for example “6.1.2: Reasons for functions, Q1–3”) and paste just that section here.
<span style="display:none">[^3_2]</span>

<div align="center">⁂</div>

[^3_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81d5a0b0d893e4ed5f69

[^3_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1


---

# 6.1 User-defined function basics

6.1 User-defined function basics
Functions (general)
A program may perform the same operation repeatedly, causing a large and confusing program due to redundancy. Program redundancy can be reduced by creating a grouping of predefined statements for repeated operations, known as a function. Even without redundancy, functions can prevent a main program from becoming large and confusing.
PARTICIPATION ACTIVITY
6.1.1: Functions can reduce redundancy and keep the main program simple.
Static figure: Three code blocks are displayed, a main program, a function program, and a simplified version of the main program.
Main program
c1 = (f1 - 32.0) * (5.0 / 9.0)
c2 = (f2 - 32.0) * (5.0 / 9.0)
c3 = (f3 + 32.0) * (5.0 / 9.0)

c = (f - 32.0) * (5.0 / 9.0)
return c

Main program
c1 = F2C(f1)
c2 = F2C(f2)
c3 = F2C(f3)

Step 1: Commonly, a program performs the same operation, such as a calculation, in multiple places. Here, the Fahrenheit to Celsius calculation is done in three places.
Main program
c1 = (f1 - 32.0) * (5.0 / 9.0)
c2 = (f2 - 32.0) * (5.0 / 9.0)
c3 = (f3 + 32.0) * (5.0 / 9.0)
Step 2: Repeated operations clutter the main program and are more prone to errors. The main program code is cluttered and has repeated code. In addition, the calculation for c3 has an error that uses the wrong operation.
Step 3: A better approach defines the Fahrenheit to Celsius calculation once, named F2C. Then, F2C can be "called" three times, yielding a simpler main program. A function is defined where the calculation is only written once.
F2C(f)
c = (f - 32.0) * (5.0 / 9.0)
return c
The simpler version of the main program code becomes
c1 = F2C(f1)
c2 = F2C(f2)
c3 = F2C(f3)
Step 4: The impact is greater when the operation has multiple statements - here three statements but often tens of statements. The main program is much simpler. Two blocks appear, the first block titled Main program contains the code:
a = expression1
b = a + expression2
c = b * expression3
d = expression1
e = d + expression2
f = e * expression3
The label XYZ appears next to variables a, b, and c, and again next to variables d, e, and f.
The second block titled Main program contains the simpler code using a function:
c = XYZ(a, b)
f = XYZ(d, e)
Step 5: Even without repeated operations, calling predefined operations keeps the main program simple and intuitive. Two blocks appear, the first block titled Main program contains the code:
a = expression1
b = a + expression2
c = b * expression3
d = expression4
e = d * d * d
f = (e + 1) * 2
f = f / g
The label XYZ appears next to variables a, b, and c. The label CalcPQR appears next to variables d, e, and f.
The second block titled Main program contains the simpler code:
c = XYZ(a, b)
f = CalcPQR(d, e, g)

---

6.1 User-defined function basics
Functions (general)
A program may perform the same operation repeatedly, causing a large and confusing program due to redundancy. Program redundancy can be reduced by creating a grouping of predefined statements for repeated operations, known as a function. Even without redundancy, functions can prevent a main program from becoming large and confusing.
participation activity
6.1.1: Functions can reduce redundancy and keep the main program simple.
12345
Even without repeated  operations, calling predefined operations keeps the main program simple and intuitive.
Main program
c1 = (f1 - 32.0) * (5.0 / 9.0)
c2 = (f2 - 32.0) * (5.0 / 9.0)
Main program
c1 = F2C(f1)
F2C(f)
c = (f - 32.0) * (5.0 / 9.0)
return c
c2 = F2C(f2)
c3 = F2C(f3)
Simpler
a = expression1
b = a + expression2
c = b * expression3
c = XYZ(a, b)
d = expression1
e = d + expression2
f = e * expression3
f = XYZ(d, e)
Main program
Main program
a = expression1
b = a + expression2
c = b * expression3
c = XYZ(a, b)
d = expression4
e = d * d * d
f = (e + 1) * 2
f = CalcPQR(d, e, g)
Main program
Main program
f = f / g
XYZ
XYZ
XYZ
CalcPQR
Cluttered
Repeated code

Oops, error in third calculation.

c3 = (f3 + 32.0) * (5.0 / 9.0)
Calculation only
written once

Static figure: Three code blocks are displayed, a main program, a function program, and a simplified version of the main program. Main program Begin Python code: c1 = (f1 - 32.0) * (5.0 / 9.0) c2 = (f2 - 32.0) * (5.0 / 9.0) c3 = (f3 + 32.0) * (5.0 / 9.0) End Python code. Begin Python code: c = (f - 32.0) * (5.0 / 9.0) return c End Python code. Main program Begin Python code: c1 = F2C(f1) c2 = F2C(f2) c3 = F2C(f3) End Python code. Step 1: Commonly, a program performs the same operation, such as a calculation, in multiple places. Here, the Fahrenheit to Celsius calculation is done in three places. Main program c1 = (f1 - 32.0) * (5.0 / 9.0) c2 = (f2 - 32.0) * (5.0 / 9.0) c3 = (f3 + 32.0) * (5.0 / 9.0) Step 2: Repeated operations clutter the main program and are more prone to errors. The main program code is cluttered and has repeated code. In addition, the calculation for c3 has an error that uses the wrong operation. Step 3: A better approach defines the Fahrenheit to Celsius calculation once, named F2C. Then, F2C can be "called" three times, yielding a simpler main program. A function is defined where the calculation is only written once. F2C(f) c = (f - 32.0) * (5.0 / 9.0) return c The simpler version of the main program code becomes c1 = F2C(f1) c2 = F2C(f2) c3 = F2C(f3) Step 4: The impact is greater when the operation has multiple statements - here three statements but often tens of statements. The main program is much simpler. Two blocks appear, the first block titled Main program contains the code: a = expression1 b = a + expression2 c = b * expression3 d = expression1 e = d + expression2 f = e * expression3 The label XYZ appears next to variables a, b, and c, and again next to variables d, e, and f. The second block titled Main program contains the simpler code using a function: c = XYZ(a, b) f = XYZ(d, e) Step 5: Even without repeated operations, calling predefined operations keeps the main program simple and intuitive. Two blocks appear, the first block titled Main program contains the code: a = expression1 b = a + expression2 c = b * expression3 d = expression4 e = d * d * d f = (e + 1) * 2 f = f / g The label XYZ appears next to variables a, b, and c. The label CalcPQR appears next to variables d, e, and f. The second block titled Main program contains the simpler code: c = XYZ(a, b) f = CalcPQR(d, e, g)
Captions
Commonly, a program performs the same operation, such as a calculation, in multiple places. Here, the Fahrenheit to Celsius calculation is done in three places.
Repeated operations clutter the main program and are more prone to errors.
A better approach defines the Fahrenheit to Celsius calculation once, named F2C. Then, F2C can be "called" three times, yielding a simpler main program.
The impact is greater when the operation has multiple statements - here three statements but often tens of statements. The main program is much simpler.
Even without repeated operations, calling predefined operations keeps the main program simple and intuitive.
Playing step 5: Even without repeated operations, calling predefined operations keeps the main program simple and intuitive. Step finished playing
Feedback?

are these the same?

Yes, they are the same content, just formatted differently.

- The zyBooks page is the **original source** with the animation and text.[^4_1]
- Your Notion page is a **copy** of that same section (6.1 User-defined function basics, participation 6.1.1 and 6.1.2, etc.), just cleaned up into Notion’s layout.[^4_2]

So you can safely use the Notion version as your easier-to-read reference while you work through the questions.

<div align="center">⁂</div>

[^4_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^4_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91


---

# what would you reather see when we work through these and how will ewe work with this? :D

The easiest for me is when you send **one small activity at a time** (just the text of the question + answer choices or starter code).[^5_1][^5_2]

Here’s how we can work together:

1. You pick a sub‑activity
    - Example: “6.1.2 Q2” or “6.1.6 part 1”.
    - Copy that exact prompt from Notion or zyBooks and paste it here.
2. I walk through it step‑by‑step
    - I’ll first explain in simple, visual-ish terms what the code or question is doing.
    - Then I’ll say exactly what to type/select (so you can just plug it into zyBooks).
3. You confirm in zyBooks
    - You try the answer.
    - If zyBooks marks it wrong or you feel confused, tell me what happened and we debug.

So: choose the next thing you want to do (maybe 6.1.2 Q2 or Q3), paste just that question here, and we’ll solve it together.
<span style="display:none">[^5_3]</span>

<div align="center">⁂</div>

[^5_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^5_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^5_3]: image.jpg


---

# i highlighted sstuff on zybooks, do the mcq show up?

Yeah, the MCQ text does show up in what I can see from zyBooks, including the answer choices for 6.1.2 Q2 and Q3.[^6_1][^6_2]

For us to work smoothly, do this:

- For each question, **also paste the answer options** into chat (like you did in Notion: the two bullets for Q2 and the two for Q3).
- Then I’ll:

1) Point out what part of the animation/text answers it, and
2) Tell you exactly which option to click and why.

If you’re ready, send just:

- “6.1.2 Q2:” plus its two choices,
and we’ll answer that one together.

<div align="center">⁂</div>

[^6_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^6_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91


---

# can you see or locate my notition highlight?

I can see the **text** that is on your Notion page, but I cannot see your personal highlighting or colors there.[^7_1]

So if something is important (like a specific line or answer choice), you’ll need to either:

- Copy‑paste that line into chat, or
- Say something like “for Q2, I highlighted the option that says ‘Multiplying by 9.0 / 5.0 rather than 5.0 / 9.0’ ” so I know which one you mean.
<span style="display:none">[^7_2]</span>

<div align="center">⁂</div>

[^7_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^7_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1


---

# try now

Perfect, I can see the exact question and the two choices now.[^8_1][^8_2]

For 6.1.2 Q2:

> Along with yielding a simpler main program, using the predefined Fahrenheit to Celsius calculation prevented what error in the original program?

The original bug was this line:

`c3 = (f3 + 32.0) * (5.0 / 9.0)`[^8_2][^8_1]

They used `+ 32.0` instead of `- 32.0`, so the function prevents:

**Answer to select:**
`Adding rather than subtracting 32.0`

<div align="center">⁂</div>

[^8_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^8_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1


---

# what is 3 for 6.1.2 and why so?

For 6.1.2 Q3, the correct answer is: **“predefining operations for XYZ and CalcPQR.”**[^9_1][^9_2]

Reason:

- In the *last* example, there are two different operations being treated as “black boxes”: XYZ (used with a and b) and CalcPQR (used with d, e, g).[^9_2][^9_1]
- The main program becomes short because both of those operations are predefined as functions, so the main only calls `XYZ(a, b)` and `CalcPQR(d, e, g)` instead of writing out their internal steps.[^9_1][^9_2]

<div align="center">⁂</div>

[^9_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^9_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1


---

# can you tell me why the other is wrong and when the other can used? (sorry its hard to learn wtihout a compilere here lol)

That’s a really good question to ask while you’re learning this.

For Q3:

> 3) In the last example above, the main program was simplified by _____.
> ○ eliminating redundant code for operation XYZ
> ○ predefining operations for XYZ and CalcPQR[^10_1][^10_2]

### Why “eliminating redundant code for operation XYZ” is wrong

In **Step 5**, the “last example,” there are *two* separate chunks of detailed code:

- One chunk for what they label **XYZ** (the a, b, c calculation).
- Another chunk for what they label **CalcPQR** (the d, e, f calculation).[^10_2][^10_1]

The simplified main program replaces **both** of those chunks with:

- `c = XYZ(a, b)`
- `f = CalcPQR(d, e, g)`[^10_1][^10_2]

So they didn’t just remove repeated XYZ code; they turned **both** XYZ and CalcPQR into predefined operations (functions). That means the simplification isn’t only about redundancy for XYZ.

### When that first option *would* be right

“eliminating redundant code for operation XYZ” would be correct in a scenario like Step 4, where:

- The same XYZ‑style calculation is written out twice (for a,b,c and again for d,e,f).[^10_2][^10_1]
- Then they introduce *one* function XYZ(...) and call it twice, which removes duplicate code for that one operation.

But Q3 explicitly says “in the **last** example,” which is Step 5, and that example clearly uses **both** XYZ and CalcPQR as predefined operations. So the option that matches what actually changed is:

> **predefining operations for XYZ and CalcPQR**[^10_1][^10_2]

<div align="center">⁂</div>

[^10_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^10_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1


---

# i see! how do you recccomend my workflow be done? :D notition or colab? (keep in mind colab has no visiblity yet but is great for me )

Given how you work and what you’re doing, I’d actually use **both**, with different jobs.[^11_1][^11_2]

### Recommended setup

1. **Notion = visual organizer / worksheet**
    - Paste each zyBooks question (MCQ or coding prompt) into its own block or toggle.
    - Under it, write your *thinking steps*, mini‑summaries, and final answer choice or pseudocode.
    - This gives you a clean, scrollable “study sheet” that’s easy on your eyes and brain.
2. **Colab = executable scratchpad**
    - For any coding question, copy the starter code into Colab and run/experiment there.
    - Use cells like: “Version 1”, “Fixed bug”, etc., so you can see the effect of changes.
    - Once it works in Colab, copy the final code back into zyBooks (and optionally into Notion for notes).

### How to use them together (practically)

- Work in this loop for each activity:

1) Read the question in zyBooks →
2) Copy it into Notion and reason it out →
3) If it involves code, test in Colab →
4) Put the final answer into zyBooks and a short “why” note in Notion.

This way you keep **visibility + structure** in Notion, while still getting the **compiler‑style feedback** you like from Colab.
<span style="display:none">[^11_3]</span>

<div align="center">⁂</div>

[^11_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^11_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^11_3]: image.jpg


---

# hmm lemem see if i can uh, im cratching my head,illsee what i can do lol '^^

Totally ok to scratch your head here—this is a lot of moving pieces at once.

To keep it super simple, here’s a **minimum viable workflow** you can try right now:

1. **Stay in zyBooks + Notion for the theory/MCQs**
    - For each participation activity: copy just that question + choices into Notion.
    - Ask me about it here, we answer it, you click it in zyBooks.
2. **Only open Colab when you hit actual code you need to run**
    - If the activity gives starter code, paste that into Colab.
    - Once it works, copy the final code into zyBooks and (optionally) into Notion.

If you want, the next step can just be:
“Here’s the next participation activity (6.1.3 code example…)” and paste that block. We’ll keep going one tiny chunk at a time so it doesn’t get overwhelming.
<span style="display:none">[^12_1][^12_2][^12_3]</span>

<div align="center">⁂</div>

[^12_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^12_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^12_3]: image.jpg


---

# oh great! its finy thou,ahh!! uh oh inentation wasnt kepty

Yeah, zyBooks → Notion copy usually **kills indentation**, especially for code blocks.[^13_1][^13_2]

Quick fixes you can use:

1. For code, always paste into a **code block** in Notion
    - Type ``` (three backticks) then Enter, *then* paste the code.
    - That preserves spacing so you can still see what should be indented.
2. When in doubt about the correct indentation:
    - Look at the original in zyBooks or Colab.
    - Or paste the “broken” version here and I’ll rewrite it with the right indentation for you.

If you have a specific snippet that got messed up, paste it next and we’ll clean it up together.

<div align="center">⁂</div>

[^13_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^13_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91


---

# is it 1 time?

For 6.1.4 Q1 (“How many function calls to calc_pizza_area() exist?”), the answer is **2 times**.[^14_1][^14_2]

You can see this from the two lines:
`print(f"{12.1} inch pizza is {calc_pizza_area():.3f} square inches")`
`print(f"{12.1} inch pizza is {calc_pizza_area():.3f} square inches")` (same call repeated).[^14_2][^14_1]
<span style="display:none">[^14_3][^14_4]</span>

<div align="center">⁂</div>

[^14_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^14_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^14_3]: image.jpg

[^14_4]: image-2.jpg


---

# okay yeah this is definitely missing

You’re right to notice that; nothing is actually missing. Those two lines **each** call `calc_pizza_area()` one time, so together that’s 2 calls.[^15_1][^15_2]

Visually:

- First line: `calc_pizza_area()` → 1 call.
- Second line: `calc_pizza_area()` → 1 more call.

So for Q1 you should enter **2** as the answer.
<span style="display:none">[^15_3]</span>

<div align="center">⁂</div>

[^15_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1

[^15_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^15_3]: image.jpg


---

# ackk,

You’re doing fine—this section is a little noisy, and you’re juggling zyBooks, Notion, and Python Tutor all at once.[^16_1][^16_2]

If you want to keep going, send me the **next specific question** (like “6.1.4 Q2 text + choices”), and we’ll answer just that one. If you’re feeling fried, we can also pause and I’ll help you make a tiny checklist for where to pick up next time.
<span style="display:none">[^16_3]</span>

<div align="center">⁂</div>

[^16_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^16_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551

[^16_3]: image.jpg


---

# ive been looking at the python tutor? every time you call a function and it ends? does it get recreated again? or does it run form top to bottom again? like a tuning music tool?

Each time you call a function, Python **creates a fresh “mini‑program run” for it and executes its body from top to bottom, then throws that mini‑run away when it returns.**[^17_1]

- The **function definition** (`def calc_pizza_area(): ...`) is created once and just *sits there* like a saved instrument preset.[^17_1]
- Every **call** (`calc_pizza_area()`) makes a new *frame* in Python Tutor: brand‑new local variables, start at the first line inside the def, run down to `return`, then that frame is deleted and control goes back to the caller.[^17_1]
- If you call it again, Python makes another new frame and runs the body again from the top—like hitting the same key on a tuning tool multiple times; same notes, new sound each press.

So: the *definition* is reused, but the *execution state* (locals, current line) is recreated on every call.
<span style="display:none">[^17_2][^17_3]</span>

<div align="center">⁂</div>

[^17_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551

[^17_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^17_3]: image.jpg


---

# intrestinggg,im glad i can use this embed! alright tahnks

Glad it helps, and that embed is a really **nice** tool to pair with zyBooks and Notion.[^18_1][^18_2]

Whenever you want to tackle the next question or just sanity‑check a Python Tutor step, send me the snippet and we’ll walk through it together.

<div align="center">⁂</div>

[^18_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^18_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551


---

# 1 right?

Yes, it’s **1**.

There is a single `def calc_pizza_area():` definition, and both print lines just **call** that one definition.[^19_1][^19_2]

<div align="center">⁂</div>

[^19_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^19_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551


---

# i like this and dont like this! one one hand i dont have to document stuff! on the other hand is refurbishing stuff!

Yeah, that feeling makes sense. Functions are **exactly** about “refurbishing stuff” so you don’t have to document / rewrite it every time.[^20_1][^20_2]

A simple way to think of it:

- You **refurbish once**: write and maybe comment the function definition.
- Then you **reuse forever**: calls are tiny, clean, and don’t need extra explanation unless they’re doing something weird.

As long as the function name is clear (`calc_pizza_area`, `compute_sum`), the call reads like a sentence and you don’t need much extra documentation around it.
<span style="display:none">[^20_3]</span>

<div align="center">⁂</div>

[^20_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^20_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551

[^20_3]: image.jpg


---

# heres a big function im working on to sort this out,hopefully i can perfect this!

That formatter function looks like a really powerful way to tame the zyBooks wall of text and turn it into clean markdown/Colab‑ready notes.[^21_1][^21_2]

If you want feedback on it, paste the function’s code here and I can help you:

- Check the logic step‑by‑step.
- Suggest small refactors to make it easier to maintain.
- Make sure it handles edge cases in sections like 6.1 (mixed text, code, questions).
<span style="display:none">[^21_3][^21_4][^21_5]</span>

<div align="center">⁂</div>

[^21_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^21_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551

[^21_3]: image.jpg

[^21_4]: image-2.jpg

[^21_5]: image-3.jpg


---

# the other thread is handling that! lets see if we can get stuff herer ,i can rehighlight to show stuff inside the code! actually never mind these are differnt things!

Got it, these really are two different things: your formatter thread vs. this zyBooks practice thread.[^22_1][^22_2]

For this thread, if you want help on that **get_pattern() challenge**, paste just the code box (the def and where you need to call it) and I’ll show exactly what to type in the print statements and why.
<span style="display:none">[^22_3]</span>

<div align="center">⁂</div>

[^22_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584551

[^22_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^22_3]: image.jpg


---

# do you think you can reformat this to paste into ntoition?

Yes. Here’s a **cleaned markdown version** of just the main 6.1 content that should paste nicely into Notion:

***

## 6.1 User-defined function basics

### Functions (general)

A program may perform the same operation repeatedly, causing a large and confusing program due to redundancy. A **function** is a grouping of predefined statements for repeated operations, which keeps the main program from becoming large and confusing.[^23_1]

***

### 6.1.1 Functions can reduce redundancy and keep the main program simple

Main program (redundant and with a bug):

```python
c1 = (f1 - 32.0) * (5.0 / 9.0)
c2 = (f2 - 32.0) * (5.0 / 9.0)
c3 = (f3 + 32.0) * (5.0 / 9.0)   # bug: + 32.0
```

Function version:

```python
def F2C(f):
    c = (f - 32.0) * (5.0 / 9.0)
    return c

c1 = F2C(f1)
c2 = F2C(f2)
c3 = F2C(f3)
```

Key ideas (Q1–Q3 answers embedded for notes):

- Fahrenheit-to-Celsius calc appears **3** times in the original main program.[^23_1]
- Using F2C prevents the error of **adding rather than subtracting 32.0**.[^23_1]
- In the last example, the main program is simplified by **predefining operations for XYZ and CalcPQR**.[^23_1]

***

### 6.1.3 Function example: Printing a pizza area

```python
def calc_pizza_area():
    pi_val = 3.14159265
    pizza_diameter = 12.0
    pizza_radius = pizza_diameter / 2.0
    pizza_area = pi_val * pizza_radius * pizza_radius
    return pizza_area

print(f"{12:.1f} inch pizza is {calc_pizza_area():.3f} square inches")
```

- The call `calc_pizza_area()` jumps into the function, runs line by line, then returns the area to the print statement.[^23_1]

***

### 6.1.4 Function basics (questions about calls vs. definitions)

Given:

```python
print(f"{12:.1f} inch pizza is {calc_pizza_area():.3f} square inches")
print(f"{12:.1f} inch pizza is {calc_pizza_area():.3f} square inches")
```

Notes:

- Function calls to `calc_pizza_area()`: **2**.[^23_1]
- Function definitions of `calc_pizza_area()`: **1**.[^23_1]
- Output statements executed in total: **2** (two print calls).[^23_1]
- Print statements inside `calc_pizza_area()`: **0**.[^23_1]

***

### 6.1.5 Function example: Returning a value

```python
def compute_square(num_to_square):
    return num_to_square * num_to_square

num_squared = compute_square(7)
print(f"7 squared is {num_squared}")
```

- Function returns a single value via `return`.
- A function with no `return` value expression returns `None`.[^23_1]

***

### 6.1.6 Return basics (fill‑in notes)

1. `compute_sum(num1, num2)` should `return num1 + num2`.[^23_1]
2. `compute_cube(num)` should `return num * num * num`.[^23_1]

***

### 6.1.7 Parameters (concept notes)

- **Parameter**: input variable in function definition (e.g., `pizza_diameter` in `def calc_pizza_area(pizza_diameter):`).
- **Argument**: actual value passed at call time (e.g., `12.0` in `calc_pizza_area(12.0)`).[^23_1]

Example:

```python
import math

def calc_pizza_area(pizza_diameter):
    pizza_radius = pizza_diameter / 2.0
    pizza_area = math.pi * pizza_radius * pizza_radius
    return pizza_area

print(f"12.0 inch pizza is {calc_pizza_area(12.0):.3f} square inches")
print(f"16.0 inch pizza is {calc_pizza_area(16.0):.3f} square inches")
```


***

### 6.1.8 Multiple parameters (short notes)

Example:

```python
def calc_pizza_volume(pizza_diameter, pizza_height):
    pi_val = 3.14159265
    pizza_radius = pizza_diameter / 2.0
    pizza_area = pi_val * pizza_radius * pizza_radius
    pizza_volume = pizza_area * pizza_height
    return pizza_volume
```

Valid patterns:

- Parameters: `(x, y)`
- Calls with two arguments: e.g., `(99, 44 + 5)`.[^23_1]

***

If you like this style, you can:

- Paste this block directly into Notion.
- Then underneath each section, add your own bullets like “Q1 answer: 3” or “still confusing: difference between call vs definition.”
<span style="display:none">[^23_2]</span>

<div align="center">⁂</div>

[^23_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^23_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91


---

# hmm,i might have gotten to much one sec lemem rehighlight in a bit for just this sorry about taht

No worries at all, take your time; that was a huge chunk of text.[^24_1][^24_2]

When you’re ready, do this to make it easy on both of us:

- Re‑highlight or copy **just the specific slice** you want reformatted (for example: “6.1.3 Function example: Printing a pizza area” or “6.1.10 Hierarchical function calls”).
- Paste that smaller chunk here.
- I’ll turn *that* into clean markdown you can drop straight into Notion (with proper code blocks and short bullets).
<span style="display:none">[^24_3]</span>

<div align="center">⁂</div>

[^24_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^24_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^24_3]: image.jpg


---

# can yuo see this abit better?

Yes, I can see that chunk clearly now.[^25_1][^25_2]

Here’s a Notion‑friendly version of just that challenge:

***

### CHALLENGE ACTIVITY 6.1.1 – Basic function call

`get_pattern()` returns 5 characters.
Call `get_pattern()` **twice** in `print()` statements to return and print 10 characters.

Example output:

```text
*****
*****
```

*(zyBooks autograder block + ID: 712910.5105864.qx3zqy7)*[^25_1]

<div align="center">⁂</div>

[^25_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^25_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91


---

# thanks alot!

You’re welcome; you’ve set up a really solid system with zyBooks + Notion for this section.[^26_1][^26_2]

When you come back to 6.1 or move on to 6.2, you can paste any specific activity (question + code) here and we’ll keep doing the same step‑by‑step walkthrough.
<span style="display:none">[^26_3]</span>

<div align="center">⁂</div>

[^26_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^26_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^26_3]: image.jpg


---

# where do i put solutions down?

Nice screenshot; that layout is looking clean in Notion now.[^27_1][^27_2]

For where to put **solutions**, I’d use this pattern for each activity block:

1. **Title / prompt** (what you already have)
2. Under it, add:
    - A **code block** for the final code solution, or
    - A short **quote block or bullet** for MCQ answers.

Example for CHALLENGE ACTIVITY 6.1.1:

```text
CHALLENGE ACTIVITY 6.1.1 – Basic function call
get_pattern() returns 5 characters...
```

Then directly under that, add:

```python
def get_pattern():
    return "*****"

print(get_pattern())
print(get_pattern())
```

And maybe one bullet for the idea:

- Calls the same function twice so we don’t duplicate the pattern logic.

That gives you: prompt → solution code → 1–2 “why it works” bullets, all in one compact visual chunk.
<span style="display:none">[^27_3]</span>

<div align="center">⁂</div>

[^27_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^27_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^27_3]: image.jpg


---

# alr!  hmmm some stuff wasnt grabbed by the app

Yeah, now I can see exactly what got pulled into Notion and what didn’t.[^28_1][^28_2]

Fast way to fix missing bits:

1. For any section the app **missed** (like 6.1.6, 6.1.7 questions, or 6.1.9/6.1.10 prompts), just:
    - Select that specific chunk in zyBooks.
    - Copy–paste it manually into Notion under the right header.
2. If a chunk looks messy after pasting, send me **just that piece** and I’ll:
    - Reformat it into clean markdown (headings + code blocks + short bullets).
    - You paste my version back into Notion.

Whenever you spot a specific missing piece (e.g., “6.1.6 Return basics prompt” or “6.1.10 pizza calories per slice text”), tell me which it is and I’ll rewrite only that part for you.
<span style="display:none">[^28_3]</span>

<div align="center">⁂</div>

[^28_1]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^28_2]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^28_3]: image.jpg


---

# participation activity

6.1.6: Return basics.
1)
Add a return statement to the function that returns the result of adding num1 and num2.
def compute_sum(num1, num2):
return

CheckShow answer
2)
Add a return statement to the function that returns the cube of the argument, i.e. (num*num*num).
def compute_cube(num):

CheckShow answer
Feedback?

For 6.1.6, the answers (and what to type) are:

1) `compute_sum` should return the sum of the two parameters:
```python
def compute_sum(num1, num2):
    return num1 + num2
```

2) `compute_cube` should return the cube of the argument:
```python
def compute_cube(num):
    return num * num * num
```

These match the descriptions “result of adding num1 and num2” and “cube of the argument (num*num*num).”[^29_1][^29_2]
<span style="display:none">[^29_3]</span>

<div align="center">⁂</div>

[^29_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^29_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^29_3]: image.jpg


---

# fixing! i as off on 6.19 on accident! hopefully this is visible to other chats

Nice catch on the 6.1.9 typo; your Notion and zyBooks views are now lined up correctly.[^30_1][^30_2]

If you want, the remaining “open” things we can still fill in together are:

- **6.1.7 – Parameters**:

1) `def get_letter_grade(num_grade):`
2) `calc_calories(21)`
3) `def my_fct(userNum + 5):` → **not** valid (expression in parameter list).
4) `print(get_birthday_age(42), get_birthday_age(20))` → outputs `43 21`.[^30_2][^30_1]
- **6.1.8 – Multiple parameters** (answers you can note in Notion):

| Question part | Correct choice | Why |
| :-- | :-- | :-- |
| Define params `x` and `y` | `(x, y)` | Parameters separated by comma inside parentheses. |
| Pass two int args | `(99, 44 + 5)` | Two arguments; second is an expression. |
| Value of `b` in `calc_val(42, 55, 77)` | `55` | Second argument → second parameter. |
| Valid args for `calc_val(a, b, c)` | `(k, i + j, 99)` | Exactly three arguments. |

- **6.1.9 – Calls with multiple parameters**:

1) Already done → `3`.[^30_1]
2) Function call: `compute_sum(x, 400)`.[^30_1]
- **6.1.10 – Hierarchical function calls**: inside `calc_pizza_calories_per_slice`:

```python
def calc_pizza_calories_per_slice(pizza_diameter):
    total_calories = calc_pizza_calories(pizza_diameter)      # placeholder_A
    calories_per_slice = total_calories / calc_num_pizza_slices(pizza_diameter)  # placeholder_B
    return calories_per_slice
```

So your two answers are:

- `total_calories = calc_pizza_calories(pizza_diameter)`
- `calories_per_slice = total_calories / calc_num_pizza_slices(pizza_diameter)`[^30_1]

You can drop those snippets/answers under the matching headings in your Notion page so everything from 6.1.1–6.1.10 is fully documented.
<span style="display:none">[^30_3][^30_4][^30_5]</span>

<div align="center">⁂</div>

[^30_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584553

[^30_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^30_3]: image.jpg

[^30_4]: image-2.jpg

[^30_5]: image-3.jpg


---

# im thinking about our workflow and im wondering if i should set up , o wow nice. okay phew alot going on here. i definitely like using colab more its very modular, the only things i have to deal with are the chlalnge activities. im not sure if i should be telling you this or not!

Telling me that is actually useful; it helps tune the workflow around what *you* like.[^31_1][^31_2]

Given what you said, here’s a simple setup that fits you:

- **Use Colab as the main workspace**
    - One notebook per zyBooks section (e.g., `6_1_functions.ipynb`).
    - Each participation/challenge activity gets its own cell with a short markdown header, then the code you run and tweak.[^31_1]
- **Use Notion only as the “index + answers” layer**
    - High‑level notes, screenshots, and final answers (especially for MCQs).
    - Link each Notion block to a Colab cell (just paste the Colab share link or cell number).
- **Where I fit in**
    - For **participation activities**: you can mostly run them in Colab yourself; if something’s confusing, paste just that question/snippet here.
    - For **challenge activities**: treat them as mini‑projects—paste the prompt and your current attempt, and I’ll help you debug/finish while keeping it in your Colab‑friendly format.[^31_1]

If you want, next time you start a new section (like 6.2), I can help you scaffold a “template” Colab notebook and matching Notion layout so you don’t have to think about structure each time.
<span style="display:none">[^31_3]</span>

<div align="center">⁂</div>

[^31_1]: https://learn.zybooks.com/zybook/CPPCS2520NguyenSpring2026/chapter/6/section/1?content_resource_id=122584562

[^31_2]: https://www.notion.so/6-1-User-defined-function-basics-3180e51f71de81b7ae6fc2b34658dc91

[^31_3]: image.jpg


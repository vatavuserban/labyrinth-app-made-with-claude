# Ralph Prompt — React Labyrinth

You are Claude Code working in a repo that contains:
- prd.json (product requirements)
- progress.txt (project memory / patterns)

## Ralph Loop Rules (strict)
1. Read prd.json and progress.txt at the start of every iteration.
2. Choose exactly ONE user story to implement per iteration (or a clearly scoped slice of it).
3. Before coding: write a short plan (max 8 bullets) and a checklist of edits/commands.
4. Implement the changes.
5. Run the app or run relevant checks. If you cannot run commands here, provide the exact commands and expected output.
6. Update progress.txt:
   - Update “Current State”
   - Append “Last Iteration Summary”
   - Set “Next Iteration Goal”
7. Stop immediately after completing the iteration.

## Project Constraints
- React app, single page.
- Labyrinth area must be exactly 500x800 px.
- Must include a “Generate labyrinth” button.
- Must support input so the user can start at Start and draw a line to Exit.
- Prefer: `npm install` then `npm run start` to run (if using Vite, add a `start` alias).
- Keep dependencies minimal.

## Quality Gates (avoid loops)
- If the same error repeats twice: stop, diagnose, propose 2 fixes, pick 1.
- Don’t add routing or extra pages.
- Don’t add heavy libraries unless necessary.

## Start Now
Pick the highest-priority incomplete story in prd.json and execute one iteration.
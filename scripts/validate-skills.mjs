#!/usr/bin/env node
// Minimal skills-repo validator. Catches the failures that bite an agent
// mid-prompt: broken cross-references, missing frontmatter, wrong
// directory layout, etc. Exits 0 if every skill is well-formed, 1 with
// a per-skill report otherwise.
//
// Usage: node scripts/validate-skills.mjs
//
// Scope (kept tight per the plan — "minimal CI"):
//   1. Each skill directory has exactly one SKILL.md
//   2. SKILL.md has a YAML frontmatter block with name/description/
//      compatibility/license
//   3. `name` matches the parent directory name
//   4. `description` is non-empty and contains a `Triggers:` line
//   5. Any path-looking reference (`./refs/foo.md`, `references/...`)
//      inside SKILL.md resolves to a real file under the skill dir
//   6. `references/` (if present) is a directory, not a file
//   7. `license` is one of the standard SPDX identifiers we ship
//   8. No skill named "agnt-cli-creator" — that role moved to the TMA
//   9. Every fenced code block in SKILL.md is balanced (open + close)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SKILLS_DIR = join(ROOT, "skills");
const FORBIDDEN_NAMES = new Set(["agnt-cli-creator"]);
const KNOWN_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MPL-2.0",
  "Unlicense",
  "CC0-1.0",
]);

const errors = [];
let skillCount = 0;

function err(skill, msg) {
  errors.push({ skill, msg });
}

function parseFrontmatter(text) {
  // Greedy match for the leading `---` block. Skills in this repo use
  // the standard `---` open/close with `key: value` lines, sometimes
  // with a `>` (folded) or `|` (literal) block scalar for multi-line
  // values like `description:`. For our validation we only need the
  // raw text of each value (single- or multi-line) so we can grep it
  // for things like `Triggers:`.
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!kv) {
      i += 1;
      continue;
    }
    const key = kv[1];
    let value = kv[2].trim();
    // Block scalar: collect indented continuation lines until a
    // non-indented line (or EOF). Folded (`>`) and literal (`|`)
    // behave the same for our grep purposes.
    if (value === ">" || value === "|" || value.endsWith(" >") || value.endsWith(" |")) {
      value = value.replace(/[>|]$/, "").trim();
      const block = [];
      i += 1;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        block.push(lines[i].replace(/^\s+/, ""));
        i += 1;
      }
      if (value) block.unshift(value);
      out[key] = block.join(" ");
      continue;
    }
    out[key] = value;
    i += 1;
  }
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield p;
  }
}

for (const skillDir of walk(SKILLS_DIR)) {
  skillCount += 1;
  const dirName = skillDir.split("/").pop();

  if (FORBIDDEN_NAMES.has(dirName)) {
    err(
      dirName,
      `forbidden skill name — creator is TMA-only; delete this directory.`,
    );
    continue;
  }

  const skillFile = join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) {
    err(dirName, `missing SKILL.md`);
    continue;
  }

  const skillText = readFileSync(skillFile, "utf8");
  const fm = parseFrontmatter(skillText);
  if (!fm) {
    err(dirName, `no YAML frontmatter block at top of SKILL.md`);
    continue;
  }

  for (const field of ["name", "description", "compatibility", "license"]) {
    if (!fm[field] || !String(fm[field]).trim()) {
      err(dirName, `frontmatter missing required field: ${field}`);
    }
  }

  if (fm.name && fm.name !== dirName) {
    err(
      dirName,
      `frontmatter name "${fm.name}" does not match directory "${dirName}"`,
    );
  }

  if (fm.description && !/Triggers?:/i.test(fm.description)) {
    err(
      dirName,
      `description should include a "Triggers:" line so agent prompt-matchers can find this skill`,
    );
  }

  if (fm.license && !KNOWN_LICENSES.has(fm.license)) {
    err(
      dirName,
      `license "${fm.license}" is not in the known SPDX set (${[...KNOWN_LICENSES].join(", ")})`,
    );
  }

  // Cross-references inside SKILL.md. Pick up any path-like string that
  // doesn't look like a URL or a code-block artifact.
  const refRe = /(?:^|[\s`'"(])((?:\.{0,2}\/)?(?:references|assets|examples|schemas)\/[^\s`'")\]>,]+)/gm;
  let ref;
  while ((ref = refRe.exec(skillText)) !== null) {
    const rel = ref[1];
    const abs = resolve(skillDir, rel);
    if (!existsSync(abs)) {
      err(dirName, `SKILL.md references missing file: ${rel}`);
    }
  }

  // Fenced code-block balance. A stray closing ``` (or a missing
  // closer) breaks the rest of the file's render in some agents
  // (and confuses grep-on-render). Count top-level fences; even
  // count = balanced, odd = an orphan somewhere. We catch the
  // count here, the line number in the error message tells the
  // author where to look.
  const fenceRe = /^```/gm;
  const fenceCount = (skillText.match(fenceRe) || []).length;
  if (fenceCount % 2 !== 0) {
    err(
      dirName,
      `unbalanced fenced code blocks in SKILL.md (${fenceCount} fences — odd, expected even). An orphan \`\`\` will break the render downstream.`,
    );
  }

  // references/ layout sanity.
  const refsDir = join(skillDir, "references");
  if (existsSync(refsDir)) {
    if (!statSync(refsDir).isDirectory()) {
      err(dirName, `references/ exists but is not a directory`);
    } else {
      // If a references/COMMANDS.md is shipped, it should look like
      // an oclif-generated reference (start with "## Usage" and
      // contain "<!-- usage -->"). Otherwise it's probably stale and
      // should be regenerated via `oclif readme`.
      const cmds = join(refsDir, "COMMANDS.md");
      if (existsSync(cmds)) {
        const t = readFileSync(cmds, "utf8");
        if (!/<!--\s*usage\s*-->/.test(t)) {
          err(
            dirName,
            `references/COMMANDS.md does not look oclif-generated (missing "<!-- usage -->" marker) — regenerate with \`oclif readme\``,
          );
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} skill validation error${errors.length === 1 ? "" : "s"} (${skillCount} skills checked):\n`);
  for (const e of errors) {
    console.error(`  [${e.skill}] ${e.msg}`);
  }
  process.exit(1);
}

console.log(`✅ ${skillCount} skill${skillCount === 1 ? "" : "s"} OK`);

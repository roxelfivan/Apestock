import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();
const DIRS = [join(ROOT, "docs"), join(ROOT, "func_spec")];

/** Mirror of slugify() in frontend/src/docs/markdown.tsx. */
function slugsFor(md) {
  const seen = new Map();
  const out = new Set();
  for (const line of md.split("\n")) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[2]
      .replace(/`/g, "")
      .replace(/\*\*?/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .trim();
    const base = text.toLowerCase().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

const problems = [];
let files = 0;
let internal = 0;
let external = 0;

for (const dir of DIRS) {
  const names = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const byFile = new Map(names.map((f) => [f, slugsFor(readFileSync(join(dir, f), "utf8"))]));
  files += names.length;

  for (const f of names) {
    const md = readFileSync(join(dir, f), "utf8");
    const bad = [...md].filter((c) => {
      const n = c.charCodeAt(0);
      return n < 9 || (n > 10 && n < 32 && n !== 13);
    });
    if (bad.length) problems.push(`CONTROL ${dir}/${f}: ${bad.length} control char(s)`);

    const re = /\]\(([^)\s]+)\)/g;
    let m;
    while ((m = re.exec(md))) {
      const href = m[1];
      if (/^(https?:|mailto:)/.test(href)) {
        external += 1;
        continue;
      }

      const [rel, anchor] = href.split("#");
      if (!rel) {
        internal += 1;
        if (!byFile.get(f).has(decodeURIComponent(anchor ?? ""))) {
          problems.push(`ANCHOR  ${f} -> #${anchor}`);
        }
        continue;
      }

      internal += 1;
      const target = resolve(dirname(join(dir, f)), rel);
      if (!existsSync(target)) {
        problems.push(`PATH    ${f} -> ${href}`);
        continue;
      }
      if (anchor && statSync(target).isFile() && rel.endsWith(".md")) {
        const tf = rel.split("/").pop();
        const targetDir = dirname(target);
        const targetSlugs = slugsFor(readFileSync(target, "utf8"));
        if (targetDir === dir && byFile.get(tf) && !byFile.get(tf).has(decodeURIComponent(anchor))) {
          problems.push(`ANCHOR  ${f} -> ${href}  (missing in ${tf})`);
        } else if (!targetSlugs.has(decodeURIComponent(anchor))) {
          problems.push(`ANCHOR  ${f} -> ${href}  (missing in ${tf})`);
        }
      }
    }
  }
}

for (const p of problems) console.log(p);
console.log(`\nfiles=${files} internal_links=${internal} external_links=${external} problems=${problems.length}`);
process.exit(problems.length ? 1 : 0);

import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const targetPath = join(projectRoot, "static", "resume.pdf");
const arguments_ = Bun.argv.slice(2);

if (arguments_.includes("--help") || arguments_.includes("-h")) {
  console.log(`Usage: bun run sync:resume [path-to-pdf]

Copies the latest locally built résumé into static/resume.pdf.

Default source: ~/Projects/resume/industry/main.pdf
Override repo:  RESUME_REPO_PATH=/path/to/resume bun run sync:resume`);
  process.exit(0);
}

if (arguments_.length > 1) {
  throw new Error("Expected at most one PDF path. Run with --help for usage.");
}

const resumeRepoPath = resolve(
  process.env.RESUME_REPO_PATH ?? join(homedir(), "Projects", "resume"),
);
const sourcePath = arguments_[0]
  ? resolve(arguments_[0])
  : join(resumeRepoPath, "industry", "main.pdf");

const sourceFile = Bun.file(sourcePath);
if (!(await sourceFile.exists())) {
  throw new Error(`Résumé PDF not found: ${sourcePath}`);
}

if (!sourcePath.toLowerCase().endsWith(".pdf")) {
  throw new Error(`Résumé source must be a PDF: ${sourcePath}`);
}

const texPath = join(dirname(sourcePath), basename(sourcePath).replace(/\.pdf$/i, ".tex"));
const [sourceStat, texStat] = await Promise.all([
  stat(sourcePath),
  stat(texPath).catch(() => null),
]);

if (texStat && texStat.mtimeMs > sourceStat.mtimeMs + 1_000) {
  throw new Error(`Résumé PDF is older than its TeX source.
Build ${texPath} first, then run this command again.`);
}

const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
const header = new TextDecoder("ascii").decode(sourceBytes.subarray(0, 5));
const trailer = new TextDecoder("ascii").decode(sourceBytes.subarray(-1_024));

if (header !== "%PDF-" || !trailer.includes("%%EOF")) {
  throw new Error(`Résumé source is not a complete PDF: ${sourcePath}`);
}

const targetFile = Bun.file(targetPath);
if (await targetFile.exists()) {
  const targetBytes = new Uint8Array(await targetFile.arrayBuffer());
  const unchanged =
    sourceBytes.length === targetBytes.length &&
    sourceBytes.every((byte, index) => byte === targetBytes[index]);

  if (unchanged) {
    console.log(`Résumé already up to date: ${targetPath}`);
    process.exit(0);
  }
}

await Bun.write(targetPath, sourceBytes);
console.log(`Updated ${targetPath}`);
console.log(`Source: ${sourcePath}`);
console.log("Review and commit static/resume.pdf with the site changes that should publish it.");

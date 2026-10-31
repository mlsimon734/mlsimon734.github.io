import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const documents = {
  resume: { name: "Résumé", source: join("industry", "main.pdf"), target: "resume.pdf" },
  cv: { name: "CV", source: join("academia", "cv.pdf"), target: "cv.pdf" },
} as const;
type DocumentKind = keyof typeof documents;

const projectRoot = resolve(import.meta.dir, "..");
const arguments_ = Bun.argv.slice(2);

if (arguments_.includes("--help") || arguments_.includes("-h") || arguments_.length === 0) {
  console.log(`Usage: bun run sync:resume [path-to-pdf]
       bun run sync:cv [path-to-pdf]

Copies the latest locally built résumé or CV into static/.

Default sources: ~/Projects/resume/industry/main.pdf -> static/resume.pdf
                 ~/Projects/resume/academia/cv.pdf  -> static/cv.pdf
Override repo:   RESUME_REPO_PATH=/path/to/resume bun run sync:cv`);
  process.exit(0);
}

const [kind, pdfArgument, ...extra] = arguments_;
if (!(kind in documents)) {
  throw new Error(
    `Unknown document "${kind}". Expected one of: ${Object.keys(documents).join(", ")}.`,
  );
}
if (extra.length > 0) {
  throw new Error("Expected at most one PDF path. Run with --help for usage.");
}
const document = documents[kind as DocumentKind];
const targetPath = join(projectRoot, "static", document.target);

const resumeRepoPath = resolve(
  process.env.RESUME_REPO_PATH ?? join(homedir(), "Projects", "resume"),
);
const sourcePath = pdfArgument ? resolve(pdfArgument) : join(resumeRepoPath, document.source);

const sourceFile = Bun.file(sourcePath);
if (!(await sourceFile.exists())) {
  throw new Error(`${document.name} PDF not found: ${sourcePath}`);
}

if (!sourcePath.toLowerCase().endsWith(".pdf")) {
  throw new Error(`${document.name} source must be a PDF: ${sourcePath}`);
}

const texPath = join(dirname(sourcePath), basename(sourcePath).replace(/\.pdf$/i, ".tex"));
const [sourceStat, texStat] = await Promise.all([
  stat(sourcePath),
  stat(texPath).catch(() => null),
]);

if (texStat && texStat.mtimeMs > sourceStat.mtimeMs + 1_000) {
  throw new Error(`${document.name} PDF is older than its TeX source.
Build ${texPath} first, then run this command again.`);
}

const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
const header = new TextDecoder("ascii").decode(sourceBytes.subarray(0, 5));
const trailer = new TextDecoder("ascii").decode(sourceBytes.subarray(-1_024));

if (header !== "%PDF-" || !trailer.includes("%%EOF")) {
  throw new Error(`${document.name} source is not a complete PDF: ${sourcePath}`);
}

const targetFile = Bun.file(targetPath);
if (await targetFile.exists()) {
  const targetBytes = new Uint8Array(await targetFile.arrayBuffer());
  const unchanged =
    sourceBytes.length === targetBytes.length &&
    sourceBytes.every((byte, index) => byte === targetBytes[index]);

  if (unchanged) {
    console.log(`${document.name} already up to date: ${targetPath}`);
    process.exit(0);
  }
}

await Bun.write(targetPath, sourceBytes);
console.log(`Updated ${targetPath}`);
console.log(`Source: ${sourcePath}`);
console.log(
  `Review and commit static/${document.target} with the site changes that should publish it.`,
);

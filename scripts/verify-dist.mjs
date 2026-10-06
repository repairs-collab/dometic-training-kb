import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CUSTOM_DOMAIN = 'dometic.motts.com.au';

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function requireFile(filePath, label) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`missing ${label}: ${filePath}`);
  }
}

export async function verifyDist(rootValue) {
  const root = path.resolve(rootValue);
  await requireFile(path.join(root, 'index.html'), 'index.html');
  const customDomainPath = path.join(root, 'CNAME');
  await requireFile(customDomainPath, 'CNAME');
  const customDomain = (await readFile(customDomainPath, 'utf8')).trim();
  if (customDomain !== CUSTOM_DOMAIN) {
    throw new Error(`unexpected custom domain: ${customDomain}`);
  }
  const assetFiles = await readdir(path.join(root, 'assets'));
  if (assetFiles.length === 0) throw new Error('dist assets directory is empty');

  const dataRoot = path.join(root, 'data');
  const manuals = await readJson(path.join(dataRoot, 'manuals.json'));
  const pages = await readJson(path.join(dataRoot, 'pages.json'));
  const knowledge = await readJson(path.join(dataRoot, 'knowledge.json'));
  await readJson(path.join(dataRoot, 'aliases.json'));
  if (manuals.length !== 18) throw new Error(`expected 18 manuals, found ${manuals.length}`);
  if (pages.length !== 217) throw new Error(`expected 217 pages, found ${pages.length}`);
  if (knowledge.length < 45) {
    throw new Error(`expected at least 45 knowledge entries, found ${knowledge.length}`);
  }

  const manualById = new Map(manuals.map((manual) => [manual.id, manual]));
  const manualRoot = path.join(root, 'manuals');
  const pdfFiles = (await readdir(manualRoot)).filter((name) => name.toLowerCase().endsWith('.pdf'));
  if (pdfFiles.length !== 18) throw new Error(`expected 18 PDFs, found ${pdfFiles.length}`);
  for (const manual of manuals) {
    await requireFile(path.join(manualRoot, manual.filename), 'PDF');
  }

  for (const page of pages) {
    const manual = manualById.get(page.manualId);
    if (!manual) throw new Error(`page ${page.id} references unknown manual ${page.manualId}`);
    if (!Number.isInteger(page.pageNumber) || page.pageNumber < 1 || page.pageNumber > manual.pageCount) {
      throw new Error(`page ${page.id} is outside manual bounds`);
    }
    const [urlPath, fragment] = String(page.sourceUrl).split('#page=');
    if (!urlPath || Number(fragment) !== page.pageNumber) {
      throw new Error(`page ${page.id} has an invalid source URL`);
    }
    const relativePath = decodeURIComponent(urlPath.replace(/^\.\//, ''));
    const resolved = path.resolve(root, relativePath);
    if (!resolved.startsWith(`${manualRoot}${path.sep}`)) {
      throw new Error(`page ${page.id} source URL leaves the manuals directory`);
    }
    await requireFile(resolved, 'PDF');
  }

  for (const entry of knowledge) {
    for (const source of entry.sourceRefs ?? []) {
      const manual = manualById.get(source.manualId);
      if (!manual) throw new Error(`knowledge ${entry.id} references unknown manual`);
      if (!Number.isInteger(source.pageNumber) || source.pageNumber < 1 || source.pageNumber > manual.pageCount) {
        throw new Error(`knowledge ${entry.id} is outside manual bounds`);
      }
    }
  }

  return { manuals: manuals.length, pages: pages.length, knowledge: knowledge.length, pdfs: pdfFiles.length };
}

const scriptPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (scriptPath === import.meta.url) {
  const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  verifyDist(root)
    .then((result) => {
      process.stdout.write(
        `Verified ${result.manuals} manuals, ${result.pages} pages, ${result.knowledge} knowledge entries and ${result.pdfs} PDFs\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}

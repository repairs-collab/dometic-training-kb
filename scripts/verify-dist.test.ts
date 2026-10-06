import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { verifyDist } from './verify-dist.mjs';

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dometic-dist-'));
  await mkdir(join(root, 'assets'));
  await mkdir(join(root, 'data'));
  await mkdir(join(root, 'manuals'));
  await writeFile(join(root, 'CNAME'), 'dometic.motts.com.au\n');
  await writeFile(join(root, 'index.html'), '<script src="./assets/app.js"></script>');
  await writeFile(join(root, 'manuals.html'), '<script src="./assets/manuals.js"></script>');
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("ok")');
  await writeFile(join(root, 'assets', 'manuals.js'), 'console.log("manuals")');
  const manuals = Array.from({ length: 18 }, (_, index) => ({
    id: `manual-${index + 1}`,
    filename: `Manual ${index + 1}.pdf`,
    pageCount: index === 0 ? 200 : 1,
  }));
  const pages = Array.from({ length: 217 }, (_, index) => ({
    id: `page-${index + 1}`,
    manualId: index < 200 ? 'manual-1' : `manual-${index - 198}`,
    pageNumber: index < 200 ? index + 1 : 1,
    sourceUrl:
      index < 200
        ? `./manuals/Manual%201.pdf#page=${index + 1}`
        : `./manuals/Manual%20${index - 198}.pdf#page=1`,
  }));
  const knowledge = Array.from({ length: 45 }, (_, index) => ({
    id: `knowledge-${index + 1}`,
    sourceRefs: [{ manualId: 'manual-1', pageNumber: 1 }],
  }));
  for (const manual of manuals) {
    await writeFile(join(root, 'manuals', manual.filename), '%PDF fixture');
  }
  await writeFile(join(root, 'data', 'manuals.json'), JSON.stringify(manuals));
  await writeFile(join(root, 'data', 'pages.json'), JSON.stringify(pages));
  await writeFile(join(root, 'data', 'knowledge.json'), JSON.stringify(knowledge));
  await writeFile(join(root, 'data', 'aliases.json'), '{}');
  return root;
}

describe('production build verification', () => {
  test('accepts a complete static package', async () => {
    const result = await verifyDist(await fixture());

    expect(result.manuals).toBe(18);
    expect(result.pages).toBe(217);
    expect(result.pdfs).toBe(18);
  });

  test('rejects a source URL whose PDF is missing', async () => {
    const root = await fixture();
    const pages = JSON.parse(await (await import('node:fs/promises')).readFile(join(root, 'data', 'pages.json'), 'utf8'));
    pages[0].sourceUrl = './manuals/Missing.pdf#page=1';
    await writeFile(join(root, 'data', 'pages.json'), JSON.stringify(pages));

    await expect(verifyDist(root)).rejects.toThrow('missing PDF');
  });

  test('rejects a package without the configured custom domain', async () => {
    const root = await fixture();
    await rm(join(root, 'CNAME'));

    await expect(verifyDist(root)).rejects.toThrow('missing CNAME');
  });

  test('rejects a package without the manuals page', async () => {
    const root = await fixture();
    await rm(join(root, 'manuals.html'));

    await expect(verifyDist(root)).rejects.toThrow('missing manuals.html');
  });

  test('rejects a package configured for a different custom domain', async () => {
    const root = await fixture();
    await writeFile(join(root, 'CNAME'), 'example.com\n');

    await expect(verifyDist(root)).rejects.toThrow('unexpected custom domain');
  });
});

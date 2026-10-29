import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { verifyDist } from './verify-dist.mjs';

const AUTH_GATE_MARKER = '<meta name="dometic-auth-gate" content="required">';

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dometic-dist-'));
  await mkdir(join(root, 'assets'));
  await mkdir(join(root, 'data'));
  await mkdir(join(root, 'dometic'));
  await mkdir(join(root, 'manuals'));
  await writeFile(join(root, 'CNAME'), 'training.motts.com.au\n');
  await writeFile(join(root, 'index.html'), `${AUTH_GATE_MARKER}<script src="./assets/app.js"></script>`);
  await writeFile(join(root, 'manuals.html'), `${AUTH_GATE_MARKER}<script src="./assets/manuals.js"></script>`);
  await writeFile(join(root, 'dometic', 'index.html'), `${AUTH_GATE_MARKER}<script src="../assets/app.js"></script>`);
  await writeFile(join(root, 'dometic', 'manuals.html'), `${AUTH_GATE_MARKER}<script src="../assets/manuals.js"></script>`);
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("ok")');
  await writeFile(join(root, 'assets', 'manuals.js'), 'console.log("manuals")');
  const manuals: Array<{
    id: string;
    filename: string;
    pageCount: number;
    format?: 'xlsx';
    sheetCount?: number;
  }> = [
    ...Array.from({ length: 19 }, (_, index) => ({
      id: `manual-${index + 1}`,
      filename: `Manual ${index + 1}.pdf`,
      pageCount: index === 0 ? 200 : index === 18 ? 3 : 1,
    })),
    {
      id: 'manual-20',
      filename: 'Thermistor chart.xlsx',
      pageCount: 1,
      format: 'xlsx',
      sheetCount: 5,
    },
  ];
  const pages = manuals.flatMap((manual) =>
    Array.from({ length: manual.pageCount }, (_, index) => ({
      id: `${manual.id}-p${index + 1}`,
      manualId: manual.id,
      pageNumber: index + 1,
      sourceUrl: manual.format === 'xlsx'
        ? './manuals/Thermistor%20chart.xlsx'
        : `./manuals/${encodeURIComponent(manual.filename)}#page=${index + 1}`,
    })),
  );
  const knowledge = Array.from({ length: 87 }, (_, index) => ({
    id: `knowledge-${index + 1}`,
    sourceRefs: [{ manualId: 'manual-1', pageNumber: 1 }],
  }));
  for (const manual of manuals) {
    await writeFile(
      join(root, 'manuals', manual.filename),
      manual.format === 'xlsx' ? 'spreadsheet fixture' : '%PDF fixture',
    );
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

    expect(result.manuals).toBe(20);
    expect(result.pages).toBe(221);
    expect(result.resources).toBe(20);
    expect(result.pdfs).toBe(19);
    expect(result.spreadsheets).toBe(1);
  });

  test.each([86, 88])('rejects a package with %i knowledge entries', async (count) => {
    const root = await fixture();
    const knowledge = Array.from({ length: count }, (_, index) => ({
      id: `knowledge-${index + 1}`,
      sourceRefs: [{ manualId: 'manual-1', pageNumber: 1 }],
    }));
    await writeFile(join(root, 'data', 'knowledge.json'), JSON.stringify(knowledge));

    await expect(verifyDist(root)).rejects.toThrow(`expected 87 knowledge entries, found ${count}`);
  });

  test('rejects a source URL whose PDF is missing', async () => {
    const root = await fixture();
    const pages = JSON.parse(await (await import('node:fs/promises')).readFile(join(root, 'data', 'pages.json'), 'utf8'));
    pages[0].sourceUrl = './manuals/Missing.pdf#page=1';
    await writeFile(join(root, 'data', 'pages.json'), JSON.stringify(pages));

    await expect(verifyDist(root)).rejects.toThrow('missing resource');
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

  test.each(['dometic/index.html', 'dometic/manuals.html'])(
    'rejects a package without %s',
    async (entry) => {
      const root = await fixture();
      await rm(join(root, ...entry.split('/')));

      await expect(verifyDist(root)).rejects.toThrow(`missing ${entry}`);
    },
  );

  test('rejects a package configured for a different custom domain', async () => {
    const root = await fixture();
    await writeFile(join(root, 'CNAME'), 'example.com\n');

    await expect(verifyDist(root)).rejects.toThrow('unexpected custom domain');
  });

  test.each(['index.html', 'manuals.html', 'dometic/index.html', 'dometic/manuals.html'])(
    'rejects %s without the authentication gate marker',
    async (entry) => {
      const root = await fixture();
      await writeFile(join(root, ...entry.split('/')), '<script src="./assets/app.js"></script>');

      await expect(verifyDist(root)).rejects.toThrow(`missing authentication gate marker in ${entry}`);
    },
  );
});

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('GitHub Pages workflow', () => {
  test('tests, builds, verifies and deploys only from main', async () => {
    const workflow = await readFile(resolve('.github/workflows/pages.yml'), 'utf8');

    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('pnpm/action-setup');
    expect(workflow).toContain('actions/setup-node');
    expect(workflow).toContain('actions/setup-python');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('python -m pip install -e ".[dev]"');
    expect(workflow).toContain('pnpm exec playwright install --with-deps chromium');
    expect(workflow).toContain('pnpm test');
    expect(workflow).toContain('python -m pytest -v');
    expect(workflow).toContain('pnpm build:data');
    expect(workflow).toContain('pnpm build');
    expect(workflow).toContain('pnpm verify:dist');
    expect(workflow).toContain('pnpm test:e2e');
    expect(workflow).toContain('actions/upload-pages-artifact');
    expect(workflow).toContain('actions/deploy-pages');
  });
});

import {
  ENTRY_KINDS,
  EXTRACTION_STATUSES,
  PRODUCT_CATEGORIES,
  type KnowledgeEntry,
  type ManualRecord,
  type PageRecord,
} from './types';

export interface CatalogValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function idOf(record: Record<string, unknown>): string {
  return typeof record.id === 'string' ? record.id : '<missing-id>';
}

function duplicateErrors(kind: string, items: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const reported = new Set<string>();
  const errors: string[] = [];

  for (const item of items) {
    const id = idOf(item);
    if (seen.has(id) && !reported.has(id)) {
      errors.push(`${kind} id ${id} is duplicated`);
      reported.add(id);
    }
    seen.add(id);
  }

  return errors;
}

export function validateCatalogs(
  manualsValue: unknown,
  pagesValue: unknown,
  knowledgeValue: unknown,
): CatalogValidationResult {
  const manuals = records(manualsValue);
  const pages = records(pagesValue);
  const knowledge = records(knowledgeValue);
  const errors = [
    ...duplicateErrors('manual', manuals),
    ...duplicateErrors('page', pages),
    ...duplicateErrors('knowledge', knowledge),
  ];

  const manualById = new Map(
    manuals.map((manual) => [idOf(manual), manual as unknown as ManualRecord]),
  );

  for (const manual of manuals) {
    const id = idOf(manual);
    if (!PRODUCT_CATEGORIES.includes(manual.category as never)) {
      errors.push(`manual ${id} has unknown category ${String(manual.category)}`);
    }
    if (!Number.isInteger(manual.pageCount) || Number(manual.pageCount) < 1) {
      errors.push(`manual ${id} must have a positive pageCount`);
    }
  }

  for (const page of pages) {
    const id = idOf(page);
    const pageNumber = Number(page.pageNumber);
    const manualId = String(page.manualId);
    const manual = manualById.get(manualId);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      errors.push(`page ${id} must use a one-based pageNumber`);
    }
    if (!PRODUCT_CATEGORIES.includes(page.category as never)) {
      errors.push(`page ${id} has unknown category ${String(page.category)}`);
    }
    if (!EXTRACTION_STATUSES.includes(page.extractionStatus as never)) {
      errors.push(`page ${id} has unknown extractionStatus ${String(page.extractionStatus)}`);
    }
    if (!manual) {
      errors.push(`page ${id} references unknown manual ${manualId}`);
    } else if (pageNumber > manual.pageCount) {
      errors.push(`page ${id} references page ${pageNumber} outside ${manualId}`);
    }
  }

  for (const entry of knowledge) {
    const id = idOf(entry);
    if (!PRODUCT_CATEGORIES.includes(entry.category as never)) {
      errors.push(`knowledge ${id} has unknown category ${String(entry.category)}`);
    }
    if (!ENTRY_KINDS.includes(entry.kind as never)) {
      errors.push(`knowledge ${id} has unknown kind ${String(entry.kind)}`);
    }

    const typedEntry = entry as unknown as KnowledgeEntry;
    if (!Array.isArray(typedEntry.sourceRefs) || typedEntry.sourceRefs.length === 0) {
      errors.push(`knowledge ${id} must include at least one source reference`);
      continue;
    }

    for (const sourceRef of typedEntry.sourceRefs) {
      const manual = manualById.get(sourceRef.manualId);
      if (!manual) {
        errors.push(`knowledge ${id} references unknown manual ${sourceRef.manualId}`);
      } else if (
        !Number.isInteger(sourceRef.pageNumber) ||
        sourceRef.pageNumber < 1 ||
        sourceRef.pageNumber > manual.pageCount
      ) {
        errors.push(
          `knowledge ${id} references page ${sourceRef.pageNumber} outside ${sourceRef.manualId}`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

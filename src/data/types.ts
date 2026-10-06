export const PRODUCT_CATEGORIES = [
  'air-conditioner',
  'upright-refrigerator',
  'portable-refrigerator',
  'awning',
  'cooker',
  'general',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const EXTRACTION_STATUSES = [
  'embedded-text',
  'ocr',
  'manual-transcription',
  'visual-only',
  'excluded',
] as const;

export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

export const ENTRY_KINDS = [
  'error-code',
  'symptom',
  'procedure',
  'part',
  'specification',
  'training',
  'safety',
] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export interface SourceRef {
  manualId: string;
  pageNumber: number;
  label?: string;
}

export interface ManualRecord {
  id: string;
  title: string;
  filename: string;
  pageCount: number;
  category: ProductCategory;
  productFamilies: string[];
  documentDate?: string;
  sha256?: string;
  duplicateGroup?: string;
}

export interface PageRecord {
  id: string;
  manualId: string;
  pageNumber: number;
  category: ProductCategory;
  productFamilies: string[];
  models: string[];
  text: string;
  excerpt: string;
  aliases: string[];
  sourceUrl: string;
  extractionStatus: ExtractionStatus;
  duplicateGroup?: string;
  reviewNote?: string;
}

export interface PartReference {
  number: string;
  description: string;
}

export interface SpecificationValue {
  label: string;
  value: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  kind: EntryKind;
  category: ProductCategory;
  productFamilies: string[];
  models: string[];
  codes: string[];
  symptoms: string[];
  aliases: string[];
  summary: string;
  steps: string[];
  warnings: string[];
  parts: PartReference[];
  specifications: SpecificationValue[];
  sourceRefs: SourceRef[];
  searchText: string;
}

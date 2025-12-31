import { z } from "zod";
import { DraftSummarySchema } from "../../../lib/makerworld-client";

export type DraftSummary = z.infer<typeof DraftSummarySchema>;

// Design details from PubMan (for merge preview)
export interface PubmanDesignDetails {
  id: number;
  name: string;
  description: string;
  license: string;
  category: string;
  tags: string[];
}

// Field comparison for merge preview
export interface FieldComparison {
  name: { current: string; new: string; changed: boolean };
  description: { current: string; new: string; changed: boolean };
  license: { current: string; new: string; changed: boolean };
  category: { current: string; new: string; changed: boolean };
  tags: { current: string[]; new: string[]; added: string[]; removed: string[] };
}

// Info about a name match for merge preview
export interface NameMatchInfo {
  makerWorldDesignId: number;
  pubmanDesignId: number;
  pubmanDesignName: string;
  pubmanDetails: PubmanDesignDetails;
  fieldComparison: FieldComparison;
}

// User's merge configuration for a design
export interface MergeConfig {
  syncName: boolean;
  syncDescription: boolean;
  syncLicense: boolean;
  syncCategory: boolean;
  syncTags: boolean;
  appendTags: boolean;
  syncAssets: boolean;
  skip: boolean;
}

// MakerWorld design details (cached from API)
export interface MWDesignDetails {
  summary: string;
  categoryName: string;
  license: string;
  tags: string[];
}

/**
 * Normalize HTML content from MakerWorld
 * - Single paragraphs with no block elements: unwrap <p> tag
 * - Multi-paragraph or complex content: keep HTML structure
 * - Strip inline styles and MakerWorld-specific attributes
 */
export function normalizeDescription(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // No HTML tags? Return as-is
  const hasHtmlTags = /<[^>]+>/.test(html);
  if (!hasHtmlTags) {
    return html.trim();
  }

  try {
    // Clean up: strip inline styles and class attributes
    const cleaned = html
      .replace(/\s*style="[^"]*"/gi, '')
      .replace(/\s*class="[^"]*"/gi, '')
      .trim();

    // Check if content is a single paragraph with no nested block elements
    // Use [\s\S] instead of . with 's' flag for cross-line matching
    const singleParagraphMatch = cleaned.match(/^<p>([\s\S]+)<\/p>$/);
    if (singleParagraphMatch) {
      const innerContent = singleParagraphMatch[1];
      // If inner content has no block elements, unwrap the <p>
      const hasBlockElements = /<(p|div|ul|ol|li|h[1-6]|blockquote|pre)/i.test(innerContent);
      if (!hasBlockElements) {
        return innerContent.trim();
      }
    }

    return cleaned;
  } catch {
    return html.replace(/<[^>]+>/g, '').trim(); // Fallback: strip all tags
  }
}

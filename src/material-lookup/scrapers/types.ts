import type { CheerioAPI } from 'cheerio';

export interface ScrapedMaterial {
  name: string;
  image?: string;
  price?: number;
  category?: string;
  brand?: string;
}

export interface MaterialScraper {
  /** Friendly supplier name shown to the user (e.g. "Leroy Merlin"). */
  supplierName: string;
  /** Hostnames this scraper handles, without a leading "www." (e.g. "leroymerlin.com.br"). */
  hostnames: string[];
  /** Returns null when the page loaded but didn't have the expected shape
   * (e.g. not actually a product page) — the caller turns that into a
   * "couldn't read this product" error rather than a 500. */
  extract($: CheerioAPI, url: string): ScrapedMaterial | null;
}

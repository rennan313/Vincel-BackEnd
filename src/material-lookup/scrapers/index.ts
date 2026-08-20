import type { MaterialScraper } from './types';

/**
 * One entry per supplier site we know how to scrape. A pasted URL whose
 * hostname doesn't match any entry here surfaces a "fornecedor ainda não
 * cadastrado, acione o suporte" error instead of guessing at a generic
 * scrape — different sites structure product pages too differently for a
 * one-size-fits-all extractor (Open Graph tags, JSON-LD, plain HTML...) to
 * be reliable across all of them.
 *
 * To support a new supplier: add an entry here with its hostname(s) and an
 * `extract()` that reads name/price/image (and category/brand if present)
 * from that specific site's product page, tested against a real URL.
 */
export const MATERIAL_SCRAPERS: MaterialScraper[] = [];

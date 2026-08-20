import { BadGatewayException, Injectable } from '@nestjs/common';

const SEARCH_URL =
  'https://www.telhanorte.com.br/api/io/_v/api/intelligent-search/product_search/';

// Only the top-level shape this service reads — the real VTEX payload has
// many more fields, left untyped since the frontend is what normalizes a
// raw product into our own material draft shape.
interface TelhaNorteSearchResponse {
  products?: unknown[];
  recordsFiltered?: number;
}

/**
 * Thin proxy over Telha Norte's public VTEX Intelligent Search API —
 * called server-side to avoid a browser CORS round-trip and keep this
 * partner's API shape as an implementation detail. Returns the response
 * close to as-is (just unwrapped to `products` + `total`); the frontend
 * is what normalizes each raw VTEX product into a material draft.
 */
@Injectable()
export class TelhaNorteService {
  async searchProducts(query: string, count: number, page: number) {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('simulationBehavior', 'default');
    url.searchParams.set('count', String(count));
    url.searchParams.set('page', String(page));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new BadGatewayException(
        'Não foi possível consultar os produtos da Telha Norte.',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        'Não foi possível consultar os produtos da Telha Norte.',
      );
    }

    const data = (await response.json()) as TelhaNorteSearchResponse;
    return {
      products: data.products ?? [],
      total: data.recordsFiltered ?? 0,
    };
  }
}

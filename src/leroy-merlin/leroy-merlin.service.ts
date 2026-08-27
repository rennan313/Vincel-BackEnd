import { BadGatewayException, Injectable } from '@nestjs/common';

const ALGOLIA_APPLICATION_ID = '1CF3ZT43ZU';
const ALGOLIA_API_KEY = '28e054533dcdd3d71379fc3f38e78f1e';
const ALGOLIA_URL = `https://${ALGOLIA_APPLICATION_ID.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`;
const ALGOLIA_INDEX = 'production_products_retail_media';
const ALGOLIA_REGION = 'grande_sao_paulo';

// Only the top-level shape this service reads — the real Algolia hit has
// many more fields, left untyped since the frontend is what normalizes a
// raw product into our own material draft shape.
interface AlgoliaSearchResponse {
  results?: Array<{
    hits?: unknown[];
    nbHits?: number;
  }>;
}

@Injectable()
export class LeroyMerlinService {
  async searchProducts(query: string, count: number, page: number) {
    const url = new URL(ALGOLIA_URL);
    url.searchParams.set('x-algolia-agent', 'Vincel Studio Server');
    url.searchParams.set('x-algolia-api-key', ALGOLIA_API_KEY);
    url.searchParams.set('x-algolia-application-id', ALGOLIA_APPLICATION_ID);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', Accept: 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              indexName: ALGOLIA_INDEX,
              query,
              hitsPerPage: count,
              page: page - 1,
              filters: `regionalAttributes.${ALGOLIA_REGION}.promotionalPrice>0 AND regionalAttributes.${ALGOLIA_REGION}.available=1`,
            },
          ],
        }),
      });
    } catch {
      throw new BadGatewayException(
        'Não foi possível consultar os produtos da Leroy Merlin.',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        'Não foi possível consultar os produtos da Leroy Merlin.',
      );
    }

    const data = (await response.json()) as AlgoliaSearchResponse;
    const result = data.results?.[0];
    return {
      products: result?.hits ?? [],
      total: result?.nbHits ?? 0,
    };
  }
}

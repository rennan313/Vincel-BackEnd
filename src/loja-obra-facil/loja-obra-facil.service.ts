import { BadGatewayException, Injectable } from '@nestjs/common';

const SEARCH_URL =
  'https://lojaobrafacil.com.br/index.php?route=extension/module/enhanced_search/autocomplete';

// Only the top-level shape this service reads — the frontend is what
// normalizes a raw product into our own material draft shape.
interface LojaObraFacilSearchResponse {
  products?: unknown[];
}

@Injectable()
export class LojaObraFacilService {
  async searchProducts(query: string) {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('q', query);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new BadGatewayException(
        'Não foi possível consultar os produtos da Loja Obra Fácil.',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        'Não foi possível consultar os produtos da Loja Obra Fácil.',
      );
    }

    const data = (await response.json()) as LojaObraFacilSearchResponse;
    const products = data.products ?? [];
    return {
      products,
      total: products.length,
    };
  }
}

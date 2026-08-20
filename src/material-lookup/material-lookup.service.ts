import {
  BadGatewayException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import { MATERIAL_SCRAPERS } from './scrapers';
import type { ScrapedMaterial } from './scrapers/types';

export interface MaterialLookupResult extends ScrapedMaterial {
  supplier: string;
  sourceUrl: string;
}

const NOT_REGISTERED_MESSAGE =
  'Esse fornecedor de materiais ainda não está cadastrado. Entre em contato com o suporte para solicitar o cadastro.';

@Injectable()
export class MaterialLookupService {
  async lookup(url: string): Promise<MaterialLookupResult> {
    const hostname = this.parseHostname(url);
    const scraper = MATERIAL_SCRAPERS.find((candidate) =>
      candidate.hostnames.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`),
      ),
    );

    if (!scraper) {
      throw new UnprocessableEntityException(NOT_REGISTERED_MESSAGE);
    }

    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);
    const extracted = scraper.extract($, url);

    if (!extracted) {
      throw new UnprocessableEntityException(
        'Não foi possível ler os dados desse produto — confira se o link aponta para uma página de produto válida.',
      );
    }

    return { ...extracted, supplier: scraper.supplierName, sourceUrl: url };
  }

  private parseHostname(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      throw new UnprocessableEntityException('URL inválida.');
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VincelBot/1.0)' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch {
      throw new BadGatewayException(
        'Não foi possível acessar o link informado.',
      );
    }
  }
}

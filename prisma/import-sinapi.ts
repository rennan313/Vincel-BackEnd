import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

interface SinapiRow {
  codigo: string;
  descricao: string;
  unidade: string;
  informacoes_gerais: string | null;
}

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const existing = await prisma.product.count({
    where: { sku: { startsWith: 'SINAPI-' } },
  });
  if (existing > 0) {
    console.log(`${existing} SINAPI products already imported — skipping (not idempotent by design, run against an empty catalog).`);
    return;
  }

  const filePath = join(__dirname, 'data', 'sinapi-insumos.json');
  const rows = JSON.parse(readFileSync(filePath, 'utf-8')) as SinapiRow[];
  console.log(`Read ${rows.length} SINAPI insumos from ${filePath}.`);

  const products = rows
    .filter((row) => row.codigo && row.descricao && row.unidade)
    .map((row) => ({
      sku: `SINAPI-${row.codigo}`,
      name: row.descricao,
      unit: row.unidade,
      description: row.informacoes_gerais || undefined,
      active: true,
      deletedAt: null,
    }));

  let created = 0;
  for (const batch of chunk(products, CHUNK_SIZE)) {
    const result = await prisma.product.createMany({
      data: batch,
    });
    created += result.count;
    console.log(`Inserted ${created}/${products.length}...`);
  }

  console.log(`Done. ${created} products created (duplicates by sku skipped).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

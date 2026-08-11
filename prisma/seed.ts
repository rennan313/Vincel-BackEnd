import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Matches vincel-front's PROJECT_TYPE_LABELS/PROJECT_TYPE_ICONS
// (src/features/projects/create/serviceCatalog.ts) exactly — the front's
// wizard resolves these catalog entries back to its internal fixed keys by
// name, so the seeded names must stay in sync with that file.
const PROJECT_TYPES = [
  { name: 'Residencial', icon: 'Home' },
  { name: 'Comercial', icon: 'Building2' },
  { name: 'Industrial', icon: 'Factory' },
  { name: 'Interiores', icon: 'Sofa' },
  { name: 'Paisagismo', icon: 'Trees' },
  { name: 'Urbanismo', icon: 'Map' },
  { name: 'Outro', icon: 'Sparkles' },
];

// Matches SERVICE_LABELS in the same file.
const SERVICES = [
  'Estudo preliminar',
  'Anteprojeto',
  'Projeto legal',
  'Projeto executivo',
  'Projeto estrutural',
  'Projeto elétrico',
  'Projeto hidráulico',
  'Luminotécnico',
  'Projeto de interiores',
  'Paisagismo',
  'Compatibilização',
  'Acomp. de obra',
  'Consultoria',
  'Outro',
];

async function main() {
  for (const projectType of PROJECT_TYPES) {
    await prisma.projectType.upsert({
      where: { name: projectType.name },
      update: { icon: projectType.icon },
      create: { ...projectType, deletedAt: null },
    });
  }
  console.log(`Seeded ${PROJECT_TYPES.length} project types.`);

  for (const name of SERVICES) {
    await prisma.service.upsert({
      where: { name },
      update: {},
      create: { name, deletedAt: null },
    });
  }
  console.log(`Seeded ${SERVICES.length} services.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

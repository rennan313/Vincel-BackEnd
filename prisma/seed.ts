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

// Matches MOST_USED_COMPONENTS in componentCatalog.ts.
const MOST_USED_COMPONENTS = [
  'Área estimada',
  'Área construída',
  'Nº pavimentos',
  'Vagas',
  'Quartos',
  'Suítes',
  'Banheiros',
  'Piscina',
  'Área gourmet',
  'Escritório',
];

// Subscription tiers. "Solo" is isDefault: true — every new company is
// auto-trialed into it at signup (see AuthService.startTrialSubscription).
// Not synced to any acquirer here — that only happens via PlansService,
// once an acquirer is actually enabled.
const PLANS = [
  {
    name: 'Solo',
    description: 'Para arquitetos autônomos administrando poucos projetos.',
    price: 149.9,
    trialDays: 0,
    isDefault: true,
  },
  {
    name: 'Escritório',
    description:
      'Para escritórios pequenos e médios com múltiplos projetos ativos.',
    price: 349.9,
    trialDays: 0,
    isDefault: false,
  },
  {
    name: 'Studio',
    description:
      'Para escritórios maiores com várias equipes e alto volume de projetos.',
    price: 699.9,
    trialDays: 0,
    isDefault: false,
  },
];

// Matches COMPONENT_CATEGORIES in the same file.
const COMPONENT_CATEGORIES = [
  {
    label: 'Características do imóvel',
    items: [
      'Sala de estar',
      'Sala de jantar',
      'Cozinha',
      'Lavanderia',
      'Closet',
      'Varanda',
      'Home theater',
    ],
  },
  {
    label: 'Infraestrutura',
    items: [
      'Gerador',
      'Cisterna',
      'Painel solar',
      'Elevador',
      'Automação residencial',
      'Sistema de segurança',
    ],
  },
  {
    label: 'Acabamentos',
    items: [
      'Piso porcelanato',
      'Piso laminado',
      'Forro de gesso',
      'Iluminação especial',
      'Marcenaria planejada',
    ],
  },
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

  for (const name of MOST_USED_COMPONENTS) {
    await prisma.projectComponent.upsert({
      where: { name },
      update: { mostUsed: true },
      create: { name, mostUsed: true, deletedAt: null },
    });
  }
  let componentCount = MOST_USED_COMPONENTS.length;
  for (const category of COMPONENT_CATEGORIES) {
    for (const name of category.items) {
      await prisma.projectComponent.upsert({
        where: { name },
        update: { category: category.label },
        create: { name, category: category.label, deletedAt: null },
      });
      componentCount += 1;
    }
  }
  console.log(`Seeded ${componentCount} project components.`);

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        description: plan.description,
        price: plan.price,
        trialDays: plan.trialDays,
        isDefault: plan.isDefault,
      },
      create: { ...plan, deletedAt: null },
    });
  }
  console.log(`Seeded ${PLANS.length} plans.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

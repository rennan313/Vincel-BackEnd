import { BillingInterval, PrismaClient } from '@prisma/client';

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

// A single product (Vincel), offered at three billing cadences — not three
// feature tiers. Each row is still its own Plan (see the billingInterval
// comment on the schema) so it gets its own acquirerRefs/checkout through
// the existing Plan/Subscription machinery, no special-casing needed.
// "Mensal" is isDefault: true — every new company is auto-trialed into it
// at signup (see AuthService.startTrialSubscription). Not synced to any
// acquirer here — that only happens via PlansService, once an acquirer is
// actually enabled.
const MONTHLY_PRICE = 79.0;
const QUARTERLY_DISCOUNT = 0.15;
const YEARLY_DISCOUNT = 0.2;

const PLANS = [
  {
    name: 'Mensal',
    description: 'Cobrança mensal, sem compromisso de permanência.',
    price: MONTHLY_PRICE,
    billingInterval: BillingInterval.MONTHLY,
    trialDays: 0,
    isDefault: true,
  },
  {
    name: 'Trimestral',
    description: 'Cobrança a cada 3 meses — 15% de desconto sobre o mensal.',
    price: round2(MONTHLY_PRICE * 3 * (1 - QUARTERLY_DISCOUNT)),
    billingInterval: BillingInterval.QUARTERLY,
    trialDays: 0,
    isDefault: false,
  },
  {
    name: 'Anual',
    description: 'Cobrança anual — 20% de desconto sobre o mensal.',
    price: round2(MONTHLY_PRICE * 12 * (1 - YEARLY_DISCOUNT)),
    billingInterval: BillingInterval.YEARLY,
    trialDays: 0,
    isDefault: false,
  },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        description: plan.description,
        price: plan.price,
        billingInterval: plan.billingInterval,
        trialDays: plan.trialDays,
        isDefault: plan.isDefault,
      },
      create: { ...plan, deletedAt: null },
    });
  }
  console.log(`Seeded ${PLANS.length} plans.`);

  // Retired tier-based plans (Solo/Escritório/Studio), superseded by the
  // single mensal/trimestral/anual product above — soft-deleted, not
  // dropped, so existing Subscription rows still resolve their plan (join
  // isn't deletedAt-filtered) even though the catalog no longer offers them.
  const retiredPlanNames = ['Solo', 'Escritório', 'Studio'];
  const { count: retiredCount } = await prisma.plan.updateMany({
    where: { name: { in: retiredPlanNames }, deletedAt: null },
    data: { deletedAt: new Date(), isDefault: false, active: false },
  });
  if (retiredCount > 0) {
    console.log(`Retired ${retiredCount} superseded plan(s).`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import {
  PrismaClient,
  UserRole,
  ReferralStatus,
  RewardStatus,
  RestaurantStatus,
  PipelineStatus,
  PipelineEventType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function hoursAfter(base: Date, h: number): Date {
  return new Date(base.getTime() + h * 3_600_000);
}

function minutesAfter(base: Date, m: number): Date {
  return new Date(base.getTime() + m * 60_000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // Clean slate
  await prisma.pipelineEvent.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.user.deleteMany();

  const pw = await bcrypt.hash('password123', 10);
  const adminPw = await bcrypt.hash('admin123', 10);

  // ══════════════════════════════════════════════════════════
  //  USERS (30)
  // ══════════════════════════════════════════════════════════
  const usersData = [
    { email: 'admin@justo.mx', name: 'Admin Justo', role: UserRole.ADMIN, password: adminPw },
    { email: 'soporte@justo.mx', name: 'Soporte Justo', role: UserRole.ADMIN, password: adminPw },
    { email: 'alice@example.com', name: 'Alice Martinez', role: UserRole.USER, password: pw },
    { email: 'bob@example.com', name: 'Roberto Sanchez', role: UserRole.USER, password: pw },
    { email: 'carol@example.com', name: 'Carolina Lopez', role: UserRole.USER, password: pw },
    { email: 'david@example.com', name: 'David Hernandez', role: UserRole.USER, password: pw },
    { email: 'elena@example.com', name: 'Elena Ramirez', role: UserRole.USER, password: pw },
    { email: 'fernando@example.com', name: 'Fernando Gomez', role: UserRole.USER, password: pw },
    { email: 'gabriela@example.com', name: 'Gabriela Torres', role: UserRole.USER, password: pw },
    { email: 'hugo@example.com', name: 'Hugo Morales', role: UserRole.USER, password: pw },
    { email: 'isabel@example.com', name: 'Isabel Fuentes', role: UserRole.USER, password: pw },
    { email: 'jorge@example.com', name: 'Jorge Pavez', role: UserRole.USER, password: pw },
    { email: 'karen@example.com', name: 'Karen Soto', role: UserRole.USER, password: pw },
    { email: 'luis@example.com', name: 'Luis Arriagada', role: UserRole.USER, password: pw },
    { email: 'monica@example.com', name: 'Monica Bravo', role: UserRole.USER, password: pw },
    { email: 'nicolas@example.com', name: 'Nicolas Paredes', role: UserRole.USER, password: pw },
    { email: 'olivia@example.com', name: 'Olivia Munoz', role: UserRole.USER, password: pw },
    { email: 'pablo@example.com', name: 'Pablo Figueroa', role: UserRole.USER, password: pw },
    { email: 'rosa@example.com', name: 'Rosa Valenzuela', role: UserRole.USER, password: pw },
    { email: 'sergio@example.com', name: 'Sergio Contreras', role: UserRole.USER, password: pw },
    { email: 'tamara@example.com', name: 'Tamara Espinoza', role: UserRole.USER, password: pw },
    { email: 'ulises@example.com', name: 'Ulises Rojas', role: UserRole.USER, password: pw },
    { email: 'valentina@example.com', name: 'Valentina Castro', role: UserRole.USER, password: pw },
    { email: 'walter@example.com', name: 'Walter Diaz', role: UserRole.USER, password: pw },
    { email: 'ximena@example.com', name: 'Ximena Pizarro', role: UserRole.USER, password: pw },
    { email: 'yolanda@example.com', name: 'Yolanda Riquelme', role: UserRole.USER, password: pw },
    { email: 'andres@example.com', name: 'Andres Sepulveda', role: UserRole.USER, password: pw },
    { email: 'beatriz@example.com', name: 'Beatriz Navarro', role: UserRole.USER, password: pw },
    { email: 'cristian@example.com', name: 'Cristian Vera', role: UserRole.USER, password: pw },
    { email: 'daniela@example.com', name: 'Daniela Orellana', role: UserRole.USER, password: pw },
  ];

  const users: Record<string, { id: string; email: string; name: string }> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        createdAt: daysAgo(Math.floor(Math.random() * 180) + 10),
      },
    });
    users[u.email] = created;
  }
  console.log(`Users created: ${usersData.length}`);

  // ══════════════════════════════════════════════════════════
  //  REFERRAL CODES (12)
  // ══════════════════════════════════════════════════════════
  const codesData = [
    { code: 'JUSTO-ADMIN1', email: 'admin@justo.mx', uses: 3 },
    { code: 'JUSTO-ALICE1', email: 'alice@example.com', uses: 6 },
    { code: 'JUSTO-ROBER1', email: 'bob@example.com', uses: 4 },
    { code: 'JUSTO-CAROL1', email: 'carol@example.com', uses: 3 },
    { code: 'JUSTO-DAVID1', email: 'david@example.com', uses: 2 },
    { code: 'JUSTO-ELENA1', email: 'elena@example.com', uses: 2 },
    { code: 'JUSTO-JORGE1', email: 'jorge@example.com', uses: 1 },
    { code: 'JUSTO-KAREN1', email: 'karen@example.com', uses: 1 },
    { code: 'JUSTO-LUIS01', email: 'luis@example.com', uses: 1 },
    { code: 'JUSTO-MONIC1', email: 'monica@example.com', uses: 0 },
    { code: 'JUSTO-PABLO1', email: 'pablo@example.com', uses: 0 },
    { code: 'JUSTO-TAMA01', email: 'tamara@example.com', uses: 0 },
  ];

  const codes: Record<string, { id: string; code: string }> = {};
  for (const c of codesData) {
    const created = await prisma.referralCode.create({
      data: {
        code: c.code,
        referrerUserId: users[c.email].id,
        useCount: c.uses,
        createdAt: daysAgo(Math.floor(Math.random() * 120) + 30),
      },
    });
    codes[c.code] = created;
  }
  console.log(`Referral codes created: ${codesData.length}`);

  // ══════════════════════════════════════════════════════════
  //  RESTAURANTS + REFERRALS (25 restaurants, 23 with referrals, 2 direct)
  // ══════════════════════════════════════════════════════════

  interface RestEntry {
    name: string;
    ownerEmail: string;
    status: RestaurantStatus;
    referralCode?: string;
    refStatus?: ReferralStatus;
    refDaysAgo?: number;
    // Restaurant v2 fields
    city: string;
    numLocations: number;
    currentPos: string;
    deliveryPct: number;
    ownerWhatsapp: string;
    // Pipeline v2 mapping
    pipelineStatus?: PipelineStatus;
    // Scoring v2
    scoreFit?: number;
    scoreIntent?: number;
    scoreEngage?: number;
    // Engagement signals v2
    usedCalculator?: boolean;
    usedDiagnostic?: boolean;
    requestedDemo?: boolean;
    fromMetaAd?: boolean;
    respondedWa?: boolean;
    openedMessages?: number;
    responseTimeMin?: number;
  }

  const restaurantsData: RestEntry[] = [
    // ── Alice referrals (6) ──────────────────────
    {
      name: 'Tacos El Patron', ownerEmail: 'bob@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 75,
      city: 'Santiago', numLocations: 2, currentPos: 'none', deliveryPct: 25, ownerWhatsapp: '+56912345601',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 32, scoreIntent: 24, scoreEngage: 26,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 6, responseTimeMin: 8,
    },
    {
      name: 'Sushi Tokio Express', ownerEmail: 'david@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 60,
      city: 'Santiago', numLocations: 3, currentPos: 'toteat', deliveryPct: 40, ownerWhatsapp: '+56912345602',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 36, scoreIntent: 22, scoreEngage: 24,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 5, responseTimeMin: 12,
    },
    {
      name: 'Cafe La Esquina', ownerEmail: 'elena@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 30,
      city: 'Valparaiso', numLocations: 1, currentPos: 'none', deliveryPct: 15, ownerWhatsapp: '+56912345603',
      pipelineStatus: PipelineStatus.DEMO_SCHEDULED,
      scoreFit: 22, scoreIntent: 18, scoreEngage: 16,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 3, responseTimeMin: 25,
    },
    {
      name: 'Pizzeria Napoli', ownerEmail: 'fernando@example.com',
      status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ALICE1',
      refStatus: ReferralStatus.PENDING, refDaysAgo: 5,
      city: 'Santiago', numLocations: 1, currentPos: 'none', deliveryPct: 30, ownerWhatsapp: '+56912345604',
      pipelineStatus: PipelineStatus.PENDING,
      scoreFit: 20, scoreIntent: 5, scoreEngage: 2,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 1, responseTimeMin: undefined,
    },
    {
      name: 'Mariscos El Puerto', ownerEmail: 'hugo@example.com',
      status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ALICE1',
      refStatus: ReferralStatus.EXPIRED, refDaysAgo: 120,
      city: 'Concepcion', numLocations: 1, currentPos: 'square', deliveryPct: 10, ownerWhatsapp: '+56912345605',
      pipelineStatus: PipelineStatus.DEAD,
      scoreFit: 14, scoreIntent: 5, scoreEngage: 2,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 0, responseTimeMin: undefined,
    },
    {
      name: 'La Vega Gourmet', ownerEmail: 'isabel@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 18,
      city: 'Santiago', numLocations: 2, currentPos: 'fudo', deliveryPct: 35, ownerWhatsapp: '+56912345606',
      pipelineStatus: PipelineStatus.MEETING_HELD,
      scoreFit: 30, scoreIntent: 20, scoreEngage: 22,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 5, responseTimeMin: 10,
    },

    // ── Bob referrals (4) ────────────────────────
    {
      name: 'Birria Don Caro', ownerEmail: 'carol@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ROBER1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 45,
      city: 'Santiago', numLocations: 1, currentPos: 'none', deliveryPct: 20, ownerWhatsapp: '+56912345607',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 28, scoreIntent: 20, scoreEngage: 22,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 4, responseTimeMin: 15,
    },
    {
      name: 'Comedor Casero Gaby', ownerEmail: 'gabriela@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ROBER1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 20,
      city: 'Temuco', numLocations: 1, currentPos: 'none', deliveryPct: 5, ownerWhatsapp: '+56912345608',
      pipelineStatus: PipelineStatus.DEMO_SCHEDULED,
      scoreFit: 18, scoreIntent: 15, scoreEngage: 14,
      usedCalculator: false, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 3, responseTimeMin: 35,
    },
    {
      name: 'Empanadas La Tia', ownerEmail: 'karen@example.com',
      status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ROBER1',
      refStatus: ReferralStatus.PENDING, refDaysAgo: 3,
      city: 'Santiago', numLocations: 1, currentPos: 'none', deliveryPct: 45, ownerWhatsapp: '+56912345609',
      pipelineStatus: PipelineStatus.PENDING,
      scoreFit: 24, scoreIntent: 8, scoreEngage: 3,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 0, responseTimeMin: undefined,
    },
    {
      name: 'Wok Express', ownerEmail: 'nicolas@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ROBER1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 55,
      city: 'Antofagasta', numLocations: 4, currentPos: 'toteat', deliveryPct: 55, ownerWhatsapp: '+56912345610',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 38, scoreIntent: 26, scoreEngage: 28,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 8, responseTimeMin: 5,
    },

    // ── Carol referrals (3) ──────────────────────
    {
      name: 'Antojitos Hugo', ownerEmail: 'hugo@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-CAROL1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 35,
      city: 'Santiago', numLocations: 2, currentPos: 'fudo', deliveryPct: 30, ownerWhatsapp: '+56912345611',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 30, scoreIntent: 22, scoreEngage: 24,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 6, responseTimeMin: 10,
    },
    {
      name: 'Sabor Criollo', ownerEmail: 'olivia@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-CAROL1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 12,
      city: 'Valparaiso', numLocations: 1, currentPos: 'none', deliveryPct: 20, ownerWhatsapp: '+56912345612',
      pipelineStatus: PipelineStatus.LOST,
      scoreFit: 18, scoreIntent: 14, scoreEngage: 10,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 2, responseTimeMin: 45,
    },
    {
      name: 'Pollo Asado Don Luis', ownerEmail: 'luis@example.com',
      status: RestaurantStatus.SUSPENDED, referralCode: 'JUSTO-CAROL1',
      refStatus: ReferralStatus.EXPIRED, refDaysAgo: 100,
      city: 'Concepcion', numLocations: 1, currentPos: 'otro', deliveryPct: 15, ownerWhatsapp: '+56912345613',
      pipelineStatus: PipelineStatus.DEAD,
      scoreFit: 12, scoreIntent: 4, scoreEngage: 3,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 1, responseTimeMin: undefined,
    },

    // ── David referrals (2) ──────────────────────
    {
      name: 'Taqueria El Sol', ownerEmail: 'pablo@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-DAVID1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 40,
      city: 'Santiago', numLocations: 3, currentPos: 'toteat', deliveryPct: 50, ownerWhatsapp: '+56912345614',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 35, scoreIntent: 25, scoreEngage: 26,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 7, responseTimeMin: 7,
    },
    {
      name: 'Cevicheria Peruana', ownerEmail: 'rosa@example.com',
      status: RestaurantStatus.PENDING, referralCode: 'JUSTO-DAVID1',
      refStatus: ReferralStatus.PENDING, refDaysAgo: 7,
      city: 'Temuco', numLocations: 1, currentPos: 'none', deliveryPct: 10, ownerWhatsapp: '+56912345615',
      pipelineStatus: PipelineStatus.PENDING,
      scoreFit: 15, scoreIntent: 3, scoreEngage: 1,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 0, responseTimeMin: undefined,
    },

    // ── Elena referrals (2) ──────────────────────
    {
      name: 'BBQ House Santiago', ownerEmail: 'sergio@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ELENA1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 15,
      city: 'Santiago', numLocations: 2, currentPos: 'square', deliveryPct: 35, ownerWhatsapp: '+56912345616',
      pipelineStatus: PipelineStatus.NO_SHOW,
      scoreFit: 26, scoreIntent: 16, scoreEngage: 8,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: false, openedMessages: 2, responseTimeMin: 90,
    },
    {
      name: 'Pasteleria Dulce Hogar', ownerEmail: 'tamara@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ELENA1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 50,
      city: 'Santiago', numLocations: 1, currentPos: 'none', deliveryPct: 5, ownerWhatsapp: '+56912345617',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 24, scoreIntent: 20, scoreEngage: 22,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 4, responseTimeMin: 18,
    },

    // ── Admin referrals (3) ──────────────────────
    {
      name: 'La Cocina de Alice', ownerEmail: 'alice@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ADMIN1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 90,
      city: 'Santiago', numLocations: 6, currentPos: 'toteat', deliveryPct: 60, ownerWhatsapp: '+56912345618',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 40, scoreIntent: 28, scoreEngage: 27,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 7, responseTimeMin: 3,
    },
    {
      name: 'Arepas Venezolanas', ownerEmail: 'ulises@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ADMIN1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 25,
      city: 'Antofagasta', numLocations: 1, currentPos: 'none', deliveryPct: 25, ownerWhatsapp: '+56912345619',
      pipelineStatus: PipelineStatus.MEETING_HELD,
      scoreFit: 22, scoreIntent: 18, scoreEngage: 20,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 4, responseTimeMin: 15,
    },
    {
      name: 'Burger Lab', ownerEmail: 'walter@example.com',
      status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ADMIN1',
      refStatus: ReferralStatus.PENDING, refDaysAgo: 2,
      city: 'Santiago', numLocations: 2, currentPos: 'fudo', deliveryPct: 45, ownerWhatsapp: '+56912345620',
      pipelineStatus: PipelineStatus.PENDING,
      scoreFit: 28, scoreIntent: 6, scoreEngage: 2,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 1, responseTimeMin: undefined,
    },

    // ── Jorge referral (1) ───────────────────────
    {
      name: 'Parrilla Don Matias', ownerEmail: 'andres@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-JORGE1',
      refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 10,
      city: 'Santiago', numLocations: 1, currentPos: 'none', deliveryPct: 15, ownerWhatsapp: '+56912345621',
      pipelineStatus: PipelineStatus.DEMO_SCHEDULED,
      scoreFit: 20, scoreIntent: 16, scoreEngage: 15,
      usedCalculator: true, usedDiagnostic: false, requestedDemo: true, respondedWa: true, openedMessages: 3, responseTimeMin: 20,
    },

    // ── Karen referral (1) ───────────────────────
    {
      name: 'Helados Artesanales', ownerEmail: 'beatriz@example.com',
      status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-KAREN1',
      refStatus: ReferralStatus.REWARDED, refDaysAgo: 38,
      city: 'Valparaiso', numLocations: 3, currentPos: 'toteat', deliveryPct: 40, ownerWhatsapp: '+56912345622',
      pipelineStatus: PipelineStatus.WON,
      scoreFit: 34, scoreIntent: 24, scoreEngage: 25,
      usedCalculator: true, usedDiagnostic: true, requestedDemo: true, respondedWa: true, openedMessages: 5, responseTimeMin: 9,
    },

    // ── Luis referral (1) ────────────────────────
    {
      name: 'Ramen Ichiban', ownerEmail: 'cristian@example.com',
      status: RestaurantStatus.PENDING, referralCode: 'JUSTO-LUIS01',
      refStatus: ReferralStatus.PENDING, refDaysAgo: 1,
      city: 'Santiago', numLocations: 1, currentPos: 'none', deliveryPct: 30, ownerWhatsapp: '+56912345623',
      pipelineStatus: PipelineStatus.PENDING,
      scoreFit: 18, scoreIntent: 2, scoreEngage: 0,
      usedCalculator: false, usedDiagnostic: false, requestedDemo: false, respondedWa: false, openedMessages: 0, responseTimeMin: undefined,
    },

    // ── Direct registrations (no referral) ───────
    {
      name: 'Sandwicheria El Rapido', ownerEmail: 'daniela@example.com',
      status: RestaurantStatus.ACTIVE,
      city: 'Santiago', numLocations: 2, currentPos: 'square', deliveryPct: 50, ownerWhatsapp: '+56912345624',
    },
    {
      name: 'Jugos Naturales Vida', ownerEmail: 'ximena@example.com',
      status: RestaurantStatus.CANCELLED,
      city: 'Temuco', numLocations: 1, currentPos: 'none', deliveryPct: 0, ownerWhatsapp: '+56912345625',
    },
  ];

  const restaurants: Record<string, { id: string; name: string; ownerId: string }> = {};
  const referrals: Record<string, { id: string; createdAt: Date; qualifiedAt?: Date }> = {};

  for (const r of restaurantsData) {
    const rest = await prisma.restaurant.create({
      data: {
        name: r.name,
        ownerId: users[r.ownerEmail].id,
        status: r.status,
        createdAt: daysAgo(r.refDaysAgo ?? Math.floor(Math.random() * 60) + 10),
        // Restaurant v2 fields
        city: r.city,
        numLocations: r.numLocations,
        currentPos: r.currentPos,
        deliveryPct: r.deliveryPct,
        ownerWhatsapp: r.ownerWhatsapp,
        ownerEmail: r.ownerEmail,
      },
    });
    restaurants[r.name] = rest;

    if (r.referralCode && r.refStatus != null && r.refDaysAgo != null) {
      const createdAt = daysAgo(r.refDaysAgo);
      const qualifiedAt = r.refStatus !== ReferralStatus.PENDING
        ? new Date(createdAt.getTime() + 3 * 86_400_000)
        : undefined;
      const rewardedAt = r.refStatus === ReferralStatus.REWARDED
        ? new Date(createdAt.getTime() + 5 * 86_400_000)
        : undefined;

      // Compute sdrContactedAt: qualifiedAt + random 3-15 minutes (for non-PENDING)
      const sdrContactedAt = qualifiedAt
        ? minutesAfter(qualifiedAt, 3 + Math.floor(Math.random() * 13))
        : undefined;

      // Compute pipeline timestamps based on pipeline status
      const ps = r.pipelineStatus ?? PipelineStatus.PENDING;
      const needsDemo = (
        ps === PipelineStatus.DEMO_SCHEDULED || ps === PipelineStatus.MEETING_HELD ||
        ps === PipelineStatus.WON || ps === PipelineStatus.LOST || ps === PipelineStatus.NO_SHOW
      );
      const needsMeeting = (
        ps === PipelineStatus.MEETING_HELD || ps === PipelineStatus.WON || ps === PipelineStatus.LOST
      );

      const demoScheduledAt = needsDemo && qualifiedAt
        ? hoursAfter(qualifiedAt, 24 + Math.floor(Math.random() * 48))
        : undefined;
      const meetingHeldAt = needsMeeting && demoScheduledAt
        ? hoursAfter(demoScheduledAt, 48 + Math.floor(Math.random() * 72))
        : undefined;

      const scoreTotal = (r.scoreFit ?? 0) + (r.scoreIntent ?? 0) + (r.scoreEngage ?? 0);

      const ref = await prisma.referral.create({
        data: {
          referralCodeId: codes[r.referralCode].id,
          referredRestaurantId: rest.id,
          status: r.refStatus,
          createdAt,
          qualifiedAt,
          rewardedAt,
          // Scoring v2
          scoreFit: r.scoreFit ?? null,
          scoreIntent: r.scoreIntent ?? null,
          scoreEngage: r.scoreEngage ?? null,
          scoreTotal: scoreTotal > 0 ? scoreTotal : null,
          scoredAt: scoreTotal > 0 ? createdAt : null,
          // Engagement signals v2
          usedCalculator: r.usedCalculator ?? false,
          usedDiagnostic: r.usedDiagnostic ?? false,
          requestedDemo: r.requestedDemo ?? false,
          fromMetaAd: r.fromMetaAd ?? false,
          respondedWa: r.respondedWa ?? false,
          openedMessages: r.openedMessages ?? 0,
          responseTimeMin: r.responseTimeMin ?? null,
          // Pipeline v2
          pipelineStatus: ps,
          demoScheduledAt,
          meetingHeldAt,
          meetingOutcome: ps === PipelineStatus.WON ? 'Cerrado - contrato firmado'
            : ps === PipelineStatus.LOST ? 'No le convencio el precio'
            : ps === PipelineStatus.NO_SHOW ? 'No se presento a la demo'
            : null,
          // SLA tracking
          sdrContactedAt,
        },
      });
      referrals[r.name] = { id: ref.id, createdAt, qualifiedAt };
    }
  }
  console.log(`Restaurants created: ${restaurantsData.length}`);
  console.log(`Referrals created: ${Object.keys(referrals).length}`);

  // ══════════════════════════════════════════════════════════
  //  PIPELINE EVENTS (for non-PENDING referrals)
  // ══════════════════════════════════════════════════════════
  let eventCount = 0;

  for (const r of restaurantsData) {
    if (!r.referralCode || r.refStatus == null || r.refDaysAgo == null) continue;
    const ps = r.pipelineStatus ?? PipelineStatus.PENDING;
    if (ps === PipelineStatus.PENDING) continue;

    const refRecord = referrals[r.name];
    if (!refRecord) continue;

    const { id: referralId, createdAt, qualifiedAt } = refRecord;
    if (!qualifiedAt) continue;

    const events: Array<{
      eventType: PipelineEventType;
      fromStatus?: PipelineStatus;
      toStatus?: PipelineStatus;
      note?: string;
      createdAt: Date;
    }> = [];

    // Event 1: AUTO_QUALIFIED — PENDING → QUALIFIED
    events.push({
      eventType: PipelineEventType.AUTO_QUALIFIED,
      fromStatus: PipelineStatus.PENDING,
      toStatus: PipelineStatus.QUALIFIED,
      note: 'Lead auto-calificado por score',
      createdAt: qualifiedAt,
    });

    // Event 2: CONTACT_ATTEMPT — SDR contacted
    events.push({
      eventType: PipelineEventType.CONTACT_ATTEMPT,
      note: 'SDR contacto por WhatsApp',
      createdAt: minutesAfter(qualifiedAt, 5 + Math.floor(Math.random() * 10)),
    });

    // Event 3: SCORE_UPDATE
    events.push({
      eventType: PipelineEventType.SCORE_UPDATE,
      note: `Score actualizado: fit=${r.scoreFit} intent=${r.scoreIntent} engage=${r.scoreEngage}`,
      createdAt: minutesAfter(qualifiedAt, 15 + Math.floor(Math.random() * 30)),
    });

    const needsDemo = (
      ps === PipelineStatus.DEMO_SCHEDULED || ps === PipelineStatus.MEETING_HELD ||
      ps === PipelineStatus.WON || ps === PipelineStatus.LOST || ps === PipelineStatus.NO_SHOW
    );

    if (needsDemo) {
      // Event 4: STATUS_CHANGE — QUALIFIED → DEMO_SCHEDULED
      events.push({
        eventType: PipelineEventType.STATUS_CHANGE,
        fromStatus: PipelineStatus.QUALIFIED,
        toStatus: PipelineStatus.DEMO_SCHEDULED,
        note: 'Demo agendada con el restaurante',
        createdAt: hoursAfter(qualifiedAt, 24 + Math.floor(Math.random() * 24)),
      });

      // Event 5: DEMO_SCHEDULED event
      events.push({
        eventType: PipelineEventType.DEMO_SCHEDULED,
        note: 'Demo confirmada',
        createdAt: hoursAfter(qualifiedAt, 26 + Math.floor(Math.random() * 24)),
      });
    }

    const needsMeeting = (
      ps === PipelineStatus.MEETING_HELD || ps === PipelineStatus.WON || ps === PipelineStatus.LOST
    );

    if (needsMeeting) {
      // Event 6: STATUS_CHANGE — DEMO_SCHEDULED → MEETING_HELD
      events.push({
        eventType: PipelineEventType.STATUS_CHANGE,
        fromStatus: PipelineStatus.DEMO_SCHEDULED,
        toStatus: PipelineStatus.MEETING_HELD,
        note: 'Reunion realizada con el dueno',
        createdAt: hoursAfter(qualifiedAt, 96 + Math.floor(Math.random() * 48)),
      });

      // Event 7: MEETING_HELD event
      events.push({
        eventType: PipelineEventType.MEETING_HELD,
        note: 'Reunion completada exitosamente',
        createdAt: hoursAfter(qualifiedAt, 98 + Math.floor(Math.random() * 48)),
      });
    }

    if (ps === PipelineStatus.NO_SHOW) {
      // Event: DEMO_SCHEDULED → NO_SHOW
      events.push({
        eventType: PipelineEventType.STATUS_CHANGE,
        fromStatus: PipelineStatus.DEMO_SCHEDULED,
        toStatus: PipelineStatus.NO_SHOW,
        note: 'Restaurante no se presento a la demo programada',
        createdAt: hoursAfter(qualifiedAt, 72 + Math.floor(Math.random() * 24)),
      });
    }

    if (ps === PipelineStatus.WON) {
      // Event: MEETING_HELD → WON
      events.push({
        eventType: PipelineEventType.STATUS_CHANGE,
        fromStatus: PipelineStatus.MEETING_HELD,
        toStatus: PipelineStatus.WON,
        note: 'Contrato firmado - restaurante integrado',
        createdAt: hoursAfter(qualifiedAt, 144 + Math.floor(Math.random() * 48)),
      });
    }

    if (ps === PipelineStatus.LOST) {
      // Event: MEETING_HELD → LOST
      events.push({
        eventType: PipelineEventType.STATUS_CHANGE,
        fromStatus: PipelineStatus.MEETING_HELD,
        toStatus: PipelineStatus.LOST,
        note: 'Restaurante decidio no continuar - precio',
        createdAt: hoursAfter(qualifiedAt, 120 + Math.floor(Math.random() * 48)),
      });
    }

    if (ps === PipelineStatus.DEAD) {
      // Event: QUALIFIED → DEAD (expired, never responded)
      events.push({
        eventType: PipelineEventType.STATUS_CHANGE,
        fromStatus: PipelineStatus.QUALIFIED,
        toStatus: PipelineStatus.DEAD,
        note: 'Lead sin respuesta - marcado como muerto',
        createdAt: hoursAfter(qualifiedAt, 336 + Math.floor(Math.random() * 168)),
      });
    }

    // Persist all events for this referral
    for (const evt of events) {
      await prisma.pipelineEvent.create({
        data: {
          referralId,
          eventType: evt.eventType,
          fromStatus: evt.fromStatus ?? null,
          toStatus: evt.toStatus ?? null,
          note: evt.note ?? null,
          createdAt: evt.createdAt,
        },
      });
      eventCount++;
    }
  }
  console.log(`Pipeline events created: ${eventCount}`);

  // ══════════════════════════════════════════════════════════
  //  REWARDS (~44)
  // ══════════════════════════════════════════════════════════
  // For each REWARDED or QUALIFIED referral, create referrer + referred rewards

  interface RewardEntry {
    restName: string;
    beneficiaryEmail: string;
    beneficiaryType: 'REFERRER' | 'REFERRED';
    rewardType: 'CREDITS' | 'DISCOUNT' | 'FEE_WAIVER' | 'CUSTOM';
    amount: number | null;
    description: string;
    status: RewardStatus;
    expiryDays: number;
  }

  const rewardsData: RewardEntry[] = [
    // ── Alice's referrals rewards ──
    // Tacos El Patron (REWARDED) — Alice referrer, Bob referred
    { restName: 'Tacos El Patron', beneficiaryEmail: 'alice@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Tacos El Patron', status: RewardStatus.REDEEMED, expiryDays: 30 },
    { restName: 'Tacos El Patron', beneficiaryEmail: 'bob@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.REDEEMED, expiryDays: 60 },

    // Sushi Tokio Express (REWARDED) — Alice referrer, David referred
    { restName: 'Sushi Tokio Express', beneficiaryEmail: 'alice@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Sushi Tokio Express', status: RewardStatus.REDEEMED, expiryDays: 30 },
    { restName: 'Sushi Tokio Express', beneficiaryEmail: 'david@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 45 },

    // Cafe La Esquina (QUALIFIED) — Alice referrer, Elena referred
    { restName: 'Cafe La Esquina', beneficiaryEmail: 'alice@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Cafe La Esquina', status: RewardStatus.ISSUED, expiryDays: 60 },
    { restName: 'Cafe La Esquina', beneficiaryEmail: 'elena@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 60 },

    // La Vega Gourmet (QUALIFIED) — Alice referrer, Isabel referred
    { restName: 'La Vega Gourmet', beneficiaryEmail: 'alice@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir La Vega Gourmet', status: RewardStatus.ISSUED, expiryDays: 55 },
    { restName: 'La Vega Gourmet', beneficiaryEmail: 'isabel@example.com', beneficiaryType: 'REFERRED', rewardType: 'FEE_WAIVER', amount: 75000, description: 'Exencion de comision primer mes', status: RewardStatus.ISSUED, expiryDays: 45 },

    // ── Bob's referrals rewards ──
    // Birria Don Caro (REWARDED) — Bob referrer, Carol referred
    { restName: 'Birria Don Caro', beneficiaryEmail: 'bob@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Birria Don Caro', status: RewardStatus.ISSUED, expiryDays: 50 },
    { restName: 'Birria Don Caro', beneficiaryEmail: 'carol@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.REDEEMED, expiryDays: 60 },

    // Comedor Casero Gaby (QUALIFIED) — Bob referrer, Gabriela referred
    { restName: 'Comedor Casero Gaby', beneficiaryEmail: 'bob@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Comedor Casero Gaby', status: RewardStatus.ISSUED, expiryDays: 45 },
    { restName: 'Comedor Casero Gaby', beneficiaryEmail: 'gabriela@example.com', beneficiaryType: 'REFERRED', rewardType: 'FEE_WAIVER', amount: 75000, description: 'Exencion de comision primer mes', status: RewardStatus.ISSUED, expiryDays: 40 },

    // Wok Express (REWARDED) — Bob referrer, Nicolas referred
    { restName: 'Wok Express', beneficiaryEmail: 'bob@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Wok Express', status: RewardStatus.REDEEMED, expiryDays: 30 },
    { restName: 'Wok Express', beneficiaryEmail: 'nicolas@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 60 },

    // ── Carol's referrals rewards ──
    // Antojitos Hugo (REWARDED) — Carol referrer, Hugo referred
    { restName: 'Antojitos Hugo', beneficiaryEmail: 'carol@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Antojitos Hugo', status: RewardStatus.ISSUED, expiryDays: 60 },
    { restName: 'Antojitos Hugo', beneficiaryEmail: 'hugo@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 50 },

    // Sabor Criollo (QUALIFIED) — Carol referrer, Olivia referred
    { restName: 'Sabor Criollo', beneficiaryEmail: 'carol@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Sabor Criollo', status: RewardStatus.ISSUED, expiryDays: 45 },
    { restName: 'Sabor Criollo', beneficiaryEmail: 'olivia@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 50 },

    // ── David's referrals rewards ──
    // Taqueria El Sol (REWARDED) — David referrer, Pablo referred
    { restName: 'Taqueria El Sol', beneficiaryEmail: 'david@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Taqueria El Sol', status: RewardStatus.ISSUED, expiryDays: 40 },
    { restName: 'Taqueria El Sol', beneficiaryEmail: 'pablo@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.REDEEMED, expiryDays: 60 },

    // ── Elena's referrals rewards ──
    // BBQ House Santiago (QUALIFIED) — Elena referrer, Sergio referred
    { restName: 'BBQ House Santiago', beneficiaryEmail: 'elena@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir BBQ House Santiago', status: RewardStatus.ISSUED, expiryDays: 55 },
    { restName: 'BBQ House Santiago', beneficiaryEmail: 'sergio@example.com', beneficiaryType: 'REFERRED', rewardType: 'FEE_WAIVER', amount: 75000, description: 'Exencion de comision primer mes', status: RewardStatus.ISSUED, expiryDays: 45 },

    // Pasteleria Dulce Hogar (REWARDED) — Elena referrer, Tamara referred
    { restName: 'Pasteleria Dulce Hogar', beneficiaryEmail: 'elena@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Pasteleria Dulce Hogar', status: RewardStatus.REDEEMED, expiryDays: 30 },
    { restName: 'Pasteleria Dulce Hogar', beneficiaryEmail: 'tamara@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.REDEEMED, expiryDays: 60 },

    // ── Admin's referrals rewards ──
    // La Cocina de Alice (REWARDED) — Admin referrer, Alice referred
    { restName: 'La Cocina de Alice', beneficiaryEmail: 'admin@justo.mx', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir La Cocina de Alice', status: RewardStatus.ISSUED, expiryDays: 30 },
    { restName: 'La Cocina de Alice', beneficiaryEmail: 'alice@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.REDEEMED, expiryDays: 60 },

    // Arepas Venezolanas (QUALIFIED) — Admin referrer, Ulises referred
    { restName: 'Arepas Venezolanas', beneficiaryEmail: 'admin@justo.mx', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Arepas Venezolanas', status: RewardStatus.ISSUED, expiryDays: 55 },
    { restName: 'Arepas Venezolanas', beneficiaryEmail: 'ulises@example.com', beneficiaryType: 'REFERRED', rewardType: 'FEE_WAIVER', amount: 75000, description: 'Exencion de comision primer mes', status: RewardStatus.ISSUED, expiryDays: 45 },

    // ── Jorge's referral reward ──
    // Parrilla Don Matias (QUALIFIED) — Jorge referrer, Andres referred
    { restName: 'Parrilla Don Matias', beneficiaryEmail: 'jorge@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Parrilla Don Matias', status: RewardStatus.ISSUED, expiryDays: 60 },
    { restName: 'Parrilla Don Matias', beneficiaryEmail: 'andres@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 50 },

    // ── Karen's referral reward ──
    // Helados Artesanales (REWARDED) — Karen referrer, Beatriz referred
    { restName: 'Helados Artesanales', beneficiaryEmail: 'karen@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos por referir Helados Artesanales', status: RewardStatus.REDEEMED, expiryDays: 20 },
    { restName: 'Helados Artesanales', beneficiaryEmail: 'beatriz@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento segundo mes', status: RewardStatus.ISSUED, expiryDays: 50 },

    // ── Some expired rewards for realism ──
    { restName: 'Pollo Asado Don Luis', beneficiaryEmail: 'carol@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos (expirado)', status: RewardStatus.EXPIRED, expiryDays: -10 },
    { restName: 'Pollo Asado Don Luis', beneficiaryEmail: 'luis@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento (expirado)', status: RewardStatus.EXPIRED, expiryDays: -15 },
    { restName: 'Mariscos El Puerto', beneficiaryEmail: 'alice@example.com', beneficiaryType: 'REFERRER', rewardType: 'CREDITS', amount: 50000, description: '$50.000 CLP en creditos (expirado)', status: RewardStatus.EXPIRED, expiryDays: -30 },
    { restName: 'Mariscos El Puerto', beneficiaryEmail: 'hugo@example.com', beneficiaryType: 'REFERRED', rewardType: 'DISCOUNT', amount: 100000, description: '$100.000 CLP descuento (expirado)', status: RewardStatus.EXPIRED, expiryDays: -25 },

    // ── CUSTOM reward for a promotion ──
    { restName: 'Tacos El Patron', beneficiaryEmail: 'bob@example.com', beneficiaryType: 'REFERRED', rewardType: 'CUSTOM', amount: null, description: 'Mencion en redes sociales de Justo', status: RewardStatus.ISSUED, expiryDays: 90 },
    { restName: 'Helados Artesanales', beneficiaryEmail: 'beatriz@example.com', beneficiaryType: 'REFERRED', rewardType: 'CUSTOM', amount: null, description: 'Sesion fotografica profesional gratis', status: RewardStatus.REDEEMED, expiryDays: 30 },
  ];

  let rewardCount = 0;
  for (const rw of rewardsData) {
    const ref = referrals[rw.restName];
    if (!ref) {
      console.warn(`  Skipping reward for "${rw.restName}" — no referral found`);
      continue;
    }

    await prisma.reward.create({
      data: {
        referralId: ref.id,
        beneficiaryId: users[rw.beneficiaryEmail].id,
        beneficiaryType: rw.beneficiaryType,
        rewardType: rw.rewardType,
        amount: rw.amount,
        description: rw.description,
        status: rw.status,
        issuedAt: rw.status !== RewardStatus.PENDING ? daysAgo(Math.floor(Math.random() * 30) + 1) : undefined,
        redeemedAt: rw.status === RewardStatus.REDEEMED ? daysAgo(Math.floor(Math.random() * 10)) : undefined,
        expiresAt: rw.expiryDays >= 0 ? daysFromNow(rw.expiryDays) : daysAgo(Math.abs(rw.expiryDays)),
      },
    });
    rewardCount++;
  }
  console.log(`Rewards created: ${rewardCount}`);

  // ══════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════
  const userCount = await prisma.user.count();
  const codeCount = await prisma.referralCode.count();
  const restCount = await prisma.restaurant.count();
  const refCount = await prisma.referral.count();
  const rwCount = await prisma.reward.count();
  const evtCount = await prisma.pipelineEvent.count();

  console.log('\n=== Seed Summary ===');
  console.log(`Users:           ${userCount} (2 admins + ${userCount - 2} users)`);
  console.log(`Referral codes:  ${codeCount}`);
  console.log(`Restaurants:     ${restCount}`);
  console.log(`Referrals:       ${refCount}`);
  console.log(`Rewards:         ${rwCount}`);
  console.log(`Pipeline events: ${evtCount}`);
  console.log('\nLogin credentials:');
  console.log('  Admin:     admin@justo.mx / admin123');
  console.log('  Soporte:   soporte@justo.mx / admin123');
  console.log('  Alice:     alice@example.com / password123 (top referrer, 6 sent)');
  console.log('  Bob:       bob@example.com / password123 (4 referrals sent)');
  console.log('  Carol:     carol@example.com / password123 (3 referrals sent)');
  console.log('  Any user:  <email> / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

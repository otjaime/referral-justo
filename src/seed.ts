import {
  PrismaClient,
  UserRole,
  ReferralStatus,
  RewardStatus,
  RestaurantStatus,
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // Clean slate
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
  }

  const restaurantsData: RestEntry[] = [
    // Alice referrals (6)
    { name: 'Tacos El Patron', ownerEmail: 'bob@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 75 },
    { name: 'Sushi Tokio Express', ownerEmail: 'david@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 60 },
    { name: 'Cafe La Esquina', ownerEmail: 'elena@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 30 },
    { name: 'Pizzeria Napoli', ownerEmail: 'fernando@example.com', status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ALICE1', refStatus: ReferralStatus.PENDING, refDaysAgo: 5 },
    { name: 'Mariscos El Puerto', ownerEmail: 'hugo@example.com', status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ALICE1', refStatus: ReferralStatus.EXPIRED, refDaysAgo: 120 },
    { name: 'La Vega Gourmet', ownerEmail: 'isabel@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ALICE1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 18 },

    // Bob referrals (4)
    { name: 'Birria Don Caro', ownerEmail: 'carol@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ROBER1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 45 },
    { name: 'Comedor Casero Gaby', ownerEmail: 'gabriela@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ROBER1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 20 },
    { name: 'Empanadas La Tia', ownerEmail: 'karen@example.com', status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ROBER1', refStatus: ReferralStatus.PENDING, refDaysAgo: 3 },
    { name: 'Wok Express', ownerEmail: 'nicolas@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ROBER1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 55 },

    // Carol referrals (3)
    { name: 'Antojitos Hugo', ownerEmail: 'hugo@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-CAROL1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 35 },
    { name: 'Sabor Criollo', ownerEmail: 'olivia@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-CAROL1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 12 },
    { name: 'Pollo Asado Don Luis', ownerEmail: 'luis@example.com', status: RestaurantStatus.SUSPENDED, referralCode: 'JUSTO-CAROL1', refStatus: ReferralStatus.EXPIRED, refDaysAgo: 100 },

    // David referrals (2)
    { name: 'Taqueria El Sol', ownerEmail: 'pablo@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-DAVID1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 40 },
    { name: 'Cevicheria Peruana', ownerEmail: 'rosa@example.com', status: RestaurantStatus.PENDING, referralCode: 'JUSTO-DAVID1', refStatus: ReferralStatus.PENDING, refDaysAgo: 7 },

    // Elena referrals (2)
    { name: 'BBQ House Santiago', ownerEmail: 'sergio@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ELENA1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 15 },
    { name: 'Pasteleria Dulce Hogar', ownerEmail: 'tamara@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ELENA1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 50 },

    // Admin referrals (3)
    { name: 'La Cocina de Alice', ownerEmail: 'alice@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ADMIN1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 90 },
    { name: 'Arepas Venezolanas', ownerEmail: 'ulises@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-ADMIN1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 25 },
    { name: 'Burger Lab', ownerEmail: 'walter@example.com', status: RestaurantStatus.PENDING, referralCode: 'JUSTO-ADMIN1', refStatus: ReferralStatus.PENDING, refDaysAgo: 2 },

    // Jorge referral (1)
    { name: 'Parrilla Don Matias', ownerEmail: 'andres@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-JORGE1', refStatus: ReferralStatus.QUALIFIED, refDaysAgo: 10 },

    // Karen referral (1)
    { name: 'Helados Artesanales', ownerEmail: 'beatriz@example.com', status: RestaurantStatus.ACTIVE, referralCode: 'JUSTO-KAREN1', refStatus: ReferralStatus.REWARDED, refDaysAgo: 38 },

    // Luis referral (1)
    { name: 'Ramen Ichiban', ownerEmail: 'cristian@example.com', status: RestaurantStatus.PENDING, referralCode: 'JUSTO-LUIS01', refStatus: ReferralStatus.PENDING, refDaysAgo: 1 },

    // Direct registrations (no referral)
    { name: 'Sandwicheria El Rapido', ownerEmail: 'daniela@example.com', status: RestaurantStatus.ACTIVE },
    { name: 'Jugos Naturales Vida', ownerEmail: 'ximena@example.com', status: RestaurantStatus.CANCELLED },
  ];

  const restaurants: Record<string, { id: string; name: string; ownerId: string }> = {};
  const referrals: Record<string, { id: string }> = {};

  for (const r of restaurantsData) {
    const rest = await prisma.restaurant.create({
      data: {
        name: r.name,
        ownerId: users[r.ownerEmail].id,
        status: r.status,
        createdAt: daysAgo(r.refDaysAgo ?? Math.floor(Math.random() * 60) + 10),
      },
    });
    restaurants[r.name] = rest;

    if (r.referralCode && r.refStatus != null && r.refDaysAgo != null) {
      const createdAt = daysAgo(r.refDaysAgo);
      const ref = await prisma.referral.create({
        data: {
          referralCodeId: codes[r.referralCode].id,
          referredRestaurantId: rest.id,
          status: r.refStatus,
          createdAt,
          qualifiedAt: r.refStatus !== ReferralStatus.PENDING
            ? new Date(createdAt.getTime() + 3 * 86_400_000)
            : undefined,
          rewardedAt: r.refStatus === ReferralStatus.REWARDED
            ? new Date(createdAt.getTime() + 5 * 86_400_000)
            : undefined,
        },
      });
      referrals[r.name] = ref;
    }
  }
  console.log(`Restaurants created: ${restaurantsData.length}`);
  console.log(`Referrals created: ${Object.keys(referrals).length}`);

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

    const now = new Date();
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

  console.log('\n=== Seed Summary ===');
  console.log(`Users:          ${userCount} (2 admins + ${userCount - 2} users)`);
  console.log(`Referral codes: ${codeCount}`);
  console.log(`Restaurants:    ${restCount}`);
  console.log(`Referrals:      ${refCount}`);
  console.log(`Rewards:        ${rwCount}`);
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

import prisma from '../../config/prisma';

interface TopReferrer {
  id: string;
  name: string;
  email: string;
  totalReferrals: number;
  qualifiedCount: number;
  totalEarned: number;
}

interface NetworkEdge {
  referrerId: string;
  referrerName: string;
  referredId: string;
  referredName: string;
  restaurantName: string;
  status: string;
  createdAt: Date;
}

interface TimelineEntry {
  month: string;
  total: number;
  qualified: number;
  rewarded: number;
}

interface CodePerformance {
  code: string;
  referrerName: string;
  useCount: number;
  totalReferrals: number;
  qualifiedCount: number;
  conversionRate: number;
}

interface RankEntry {
  id: string;
  qualifiedCount: number;
}

interface KFactorData {
  usersWithCodes: number;
  activeReferrers: number;
  totalReferralsAll: number;
  qualifiedAll: number;
  referrals30d: number;
  qualified30d: number;
  activeReferrers30d: number;
}

interface CycleTimeEntry {
  id: string;
  cycleDays: number;
}

interface WeeklyVelocity {
  week: string;
  total: number;
  qualified: number;
}

// Business assumptions for revenue impact estimates
const ASSUMED_MONTHLY_REVENUE_PER_RESTAURANT = 3000000; // $3M CLP
const ASSUMED_COMMISSION_RATE = 0.15; // 15%

export class AnalyticsService {
  async getDashboardAnalytics() {
    const [
      userCount,
      restaurantCount,
      referralCount,
      rewardCount,
      referralsByStatus,
      rewardsByStatus,
      rewardAmounts,
      redeemedAmounts,
      topReferrers,
      timeToQualifyData,
      networkEdges,
      timeline,
      codePerformance,
      kFactorDataArr,
      cycleTimeEntries,
      weeklyVelocity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.referral.count(),
      prisma.reward.count(),

      prisma.referral.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.reward.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.reward.aggregate({
        where: { status: { in: ['ISSUED', 'REDEEMED'] } },
        _sum: { amount: true },
      }),

      prisma.reward.aggregate({
        where: { status: 'REDEEMED' },
        _sum: { amount: true },
      }),

      prisma.$queryRaw<TopReferrer[]>`
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(r.id)::int AS "totalReferrals",
          COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::int AS "qualifiedCount",
          COALESCE(SUM(rw.amount) FILTER (WHERE rw.beneficiary_type = 'REFERRER' AND rw.status IN ('ISSUED', 'REDEEMED')), 0)::int AS "totalEarned"
        FROM users u
        INNER JOIN referral_codes rc ON rc.referrer_user_id = u.id
        INNER JOIN referrals r ON r.referral_code_id = rc.id
        LEFT JOIN rewards rw ON rw.referral_id = r.id AND rw.beneficiary_id = u.id
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(r.id) > 0
        ORDER BY "qualifiedCount" DESC, "totalEarned" DESC
        LIMIT 5
      `,

      prisma.referral.findMany({
        where: { qualifiedAt: { not: null } },
        select: { createdAt: true, qualifiedAt: true },
      }),

      // Network edges for viral tree
      prisma.$queryRaw<NetworkEdge[]>`
        SELECT
          referrer.id AS "referrerId",
          referrer.name AS "referrerName",
          referred_user.id AS "referredId",
          referred_user.name AS "referredName",
          rest.name AS "restaurantName",
          r.status::text AS "status",
          r.created_at AS "createdAt"
        FROM referrals r
        INNER JOIN referral_codes rc ON rc.id = r.referral_code_id
        INNER JOIN users referrer ON referrer.id = rc.referrer_user_id
        INNER JOIN restaurants rest ON rest.id = r.referred_restaurant_id
        INNER JOIN users referred_user ON referred_user.id = rest.owner_id
        ORDER BY r.created_at ASC
      `,

      // Timeline by month
      prisma.$queryRaw<TimelineEntry[]>`
        SELECT
          TO_CHAR(r.created_at, 'YYYY-MM') AS "month",
          COUNT(r.id)::int AS "total",
          COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::int AS "qualified",
          COUNT(r.id) FILTER (WHERE r.status = 'REWARDED')::int AS "rewarded"
        FROM referrals r
        GROUP BY TO_CHAR(r.created_at, 'YYYY-MM')
        ORDER BY "month" ASC
      `,

      // Code performance
      prisma.$queryRaw<CodePerformance[]>`
        SELECT
          rc.code,
          u.name AS "referrerName",
          rc.use_count::int AS "useCount",
          COUNT(r.id)::int AS "totalReferrals",
          COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::int AS "qualifiedCount",
          CASE WHEN COUNT(r.id) > 0
            THEN ROUND(COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::numeric / COUNT(r.id) * 100)::int
            ELSE 0 END AS "conversionRate"
        FROM referral_codes rc
        INNER JOIN users u ON u.id = rc.referrer_user_id
        LEFT JOIN referrals r ON r.referral_code_id = rc.id
        GROUP BY rc.id, rc.code, u.name, rc.use_count
        HAVING COUNT(r.id) > 0
        ORDER BY "qualifiedCount" DESC
      `,

      // K-factor components
      prisma.$queryRaw<KFactorData[]>`
        SELECT
          COUNT(DISTINCT rc.referrer_user_id)::int AS "usersWithCodes",
          COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN rc.referrer_user_id END)::int AS "activeReferrers",
          COUNT(r.id)::int AS "totalReferralsAll",
          COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::int AS "qualifiedAll",
          COUNT(r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '30 days')::int AS "referrals30d",
          COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED') AND r.created_at > NOW() - INTERVAL '30 days')::int AS "qualified30d",
          COUNT(DISTINCT CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN rc.referrer_user_id END)::int AS "activeReferrers30d"
        FROM referral_codes rc
        LEFT JOIN referrals r ON r.referral_code_id = rc.id
      `,

      // Viral cycle time: time from being referred to first outbound referral
      prisma.$queryRaw<CycleTimeEntry[]>`
        SELECT
          referred_user.id,
          EXTRACT(EPOCH FROM (MIN(r_outbound.created_at) - MIN(r_inbound.created_at))) / 86400 AS "cycleDays"
        FROM users referred_user
        INNER JOIN restaurants rest ON rest.owner_id = referred_user.id
        INNER JOIN referrals r_inbound ON r_inbound.referred_restaurant_id = rest.id
        INNER JOIN referral_codes rc_out ON rc_out.referrer_user_id = referred_user.id
        INNER JOIN referrals r_outbound ON r_outbound.referral_code_id = rc_out.id
        GROUP BY referred_user.id
      `,

      // Weekly referral velocity (last 12 weeks)
      prisma.$queryRaw<WeeklyVelocity[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('week', r.created_at), 'YYYY-MM-DD') AS "week",
          COUNT(r.id)::int AS "total",
          COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::int AS "qualified"
        FROM referrals r
        WHERE r.created_at > NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', r.created_at)
        ORDER BY "week" ASC
      `,
    ]);

    // Referral funnel
    const funnelMap: Record<string, number> = {};
    for (const row of referralsByStatus) {
      funnelMap[row.status] = row._count.id;
    }
    const pending = funnelMap['PENDING'] || 0;
    const qualified = funnelMap['QUALIFIED'] || 0;
    const rewarded = funnelMap['REWARDED'] || 0;
    const expired = funnelMap['EXPIRED'] || 0;

    // Reward status counts
    const rewardStatusMap: Record<string, number> = {};
    for (const row of rewardsByStatus) {
      rewardStatusMap[row.status] = row._count.id;
    }
    const issuedCount = (rewardStatusMap['ISSUED'] || 0) + (rewardStatusMap['REDEEMED'] || 0);
    const redeemedCount = rewardStatusMap['REDEEMED'] || 0;

    // Rates
    const convertedReferrals = qualified + rewarded;
    const conversionRate = referralCount > 0
      ? Math.round((convertedReferrals / referralCount) * 1000) / 10
      : 0;

    const redemptionRate = issuedCount > 0
      ? Math.round((redeemedCount / issuedCount) * 1000) / 10
      : 0;

    // Average time-to-qualify (days)
    let avgTimeToQualifyDays = 0;
    if (timeToQualifyData.length > 0) {
      const totalMs = timeToQualifyData.reduce((sum, r) => {
        return sum + (new Date(r.qualifiedAt!).getTime() - new Date(r.createdAt).getTime());
      }, 0);
      avgTimeToQualifyDays = Math.round((totalMs / timeToQualifyData.length / 86400000) * 10) / 10;
    }

    // Unit economics
    const totalProgramSpend = rewardAmounts._sum.amount || 0;
    const costPerQualified = convertedReferrals > 0
      ? Math.round(totalProgramSpend / convertedReferrals)
      : 0;
    const avgRewardPerReferral = referralCount > 0
      ? Math.round(totalProgramSpend / referralCount)
      : 0;

    // ── Growth Metrics ──────────────────────────────────
    const kData = kFactorDataArr[0] || {
      usersWithCodes: 0, activeReferrers: 0, totalReferralsAll: 0,
      qualifiedAll: 0, referrals30d: 0, qualified30d: 0, activeReferrers30d: 0,
    };

    // K-Factor: K = qualified_referrals / active_referrers
    const kFactorAllTime = kData.activeReferrers > 0
      ? Math.round((kData.qualifiedAll / kData.activeReferrers) * 100) / 100
      : 0;
    const kFactor30d = kData.activeReferrers30d > 0
      ? Math.round((kData.qualified30d / kData.activeReferrers30d) * 100) / 100
      : 0;

    // Viral Cycle Time
    const avgCycleTimeDays = cycleTimeEntries.length > 0
      ? Math.round(cycleTimeEntries.reduce((s, e) => s + Number(e.cycleDays), 0) / cycleTimeEntries.length * 10) / 10
      : null;

    // Growth Projections
    const currentBase = restaurantCount;
    const projections = { d30: 0, d60: 0, d90: 0 };
    if (kFactorAllTime > 0 && avgCycleTimeDays && avgCycleTimeDays > 0) {
      const cyclesIn30 = 30 / avgCycleTimeDays;
      const cyclesIn60 = 60 / avgCycleTimeDays;
      const cyclesIn90 = 90 / avgCycleTimeDays;
      projections.d30 = Math.round(currentBase * Math.pow(1 + kFactorAllTime, cyclesIn30));
      projections.d60 = Math.round(currentBase * Math.pow(1 + kFactorAllTime, cyclesIn60));
      projections.d90 = Math.round(currentBase * Math.pow(1 + kFactorAllTime, cyclesIn90));
    }

    // Revenue Impact (Estimated)
    const qualifiedRestaurants = convertedReferrals;
    const estimatedMonthlyRevenue = qualifiedRestaurants * ASSUMED_MONTHLY_REVENUE_PER_RESTAURANT * ASSUMED_COMMISSION_RATE;
    const estimatedAnnualRevenue = estimatedMonthlyRevenue * 12;
    const programROI = totalProgramSpend > 0
      ? Math.round(((estimatedAnnualRevenue - totalProgramSpend) / totalProgramSpend) * 100)
      : 0;
    const paybackDays = estimatedMonthlyRevenue > 0
      ? Math.round(totalProgramSpend / (estimatedMonthlyRevenue / 30))
      : 0;

    // Network Health
    const activationRate = kData.usersWithCodes > 0
      ? Math.round((kData.activeReferrers / kData.usersWithCodes) * 1000) / 10
      : 0;

    // Referral Velocity
    const recentWeeks = weeklyVelocity.slice(-4);
    const priorWeeks = weeklyVelocity.slice(-8, -4);
    const recentAvg = recentWeeks.length > 0
      ? recentWeeks.reduce((s, w) => s + w.total, 0) / recentWeeks.length
      : 0;
    const priorAvg = priorWeeks.length > 0
      ? priorWeeks.reduce((s, w) => s + w.total, 0) / priorWeeks.length
      : 0;
    const velocityTrend = priorAvg > 0
      ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100)
      : 0;

    return {
      totals: {
        users: userCount,
        restaurants: restaurantCount,
        referrals: referralCount,
        rewards: rewardCount,
      },
      funnel: {
        pending,
        qualified,
        rewarded,
        expired,
        total: referralCount,
        conversionRate,
      },
      rewardEconomics: {
        totalIssuedAmount: rewardAmounts._sum.amount || 0,
        totalRedeemedAmount: redeemedAmounts._sum.amount || 0,
        issuedCount,
        redeemedCount,
        redemptionRate,
      },
      unitEconomics: {
        costPerQualified,
        totalProgramSpend,
        avgRewardPerReferral,
      },
      topReferrers,
      avgTimeToQualifyDays,
      networkEdges,
      timeline,
      codePerformance,
      growthMetrics: {
        kFactor: { allTime: kFactorAllTime, last30d: kFactor30d },
        viralCycleTimeDays: avgCycleTimeDays,
        projections,
        revenueImpact: {
          estimatedMonthlyRevenue,
          estimatedAnnualRevenue,
          programROI,
          paybackDays,
          qualifiedRestaurants,
          assumptions: {
            monthlyRevenuePerRestaurant: ASSUMED_MONTHLY_REVENUE_PER_RESTAURANT,
            commissionRate: ASSUMED_COMMISSION_RATE,
          },
        },
        networkHealth: {
          usersWithCodes: kData.usersWithCodes,
          activeReferrers: kData.activeReferrers,
          activationRate,
        },
        velocity: {
          weekly: weeklyVelocity,
          trend: velocityTrend,
          currentWeeklyAvg: Math.round(recentAvg * 10) / 10,
        },
      },
    };
  }

  async getUserRank(userId: string) {
    const rankings = await prisma.$queryRaw<RankEntry[]>`
      SELECT
        u.id,
        COUNT(r.id) FILTER (WHERE r.status IN ('QUALIFIED', 'REWARDED'))::int AS "qualifiedCount"
      FROM users u
      INNER JOIN referral_codes rc ON rc.referrer_user_id = u.id
      INNER JOIN referrals r ON r.referral_code_id = rc.id
      GROUP BY u.id
      HAVING COUNT(r.id) > 0
      ORDER BY "qualifiedCount" DESC
    `;
    const position = rankings.findIndex(r => r.id === userId) + 1;
    return { position: position > 0 ? position : null, total: rankings.length };
  }
}

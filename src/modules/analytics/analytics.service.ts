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

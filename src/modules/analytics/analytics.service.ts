import prisma from '../../config/prisma';

interface TopReferrer {
  id: string;
  name: string;
  email: string;
  totalReferrals: number;
  qualifiedCount: number;
  totalEarned: number;
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
      topReferrers,
      avgTimeToQualifyDays,
    };
  }
}

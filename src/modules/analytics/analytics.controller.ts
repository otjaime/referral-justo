import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getDashboard(_req: Request, res: Response) {
    const data = await analyticsService.getDashboardAnalytics();
    res.json(data);
  }

  async getMyRank(req: Request, res: Response) {
    const data = await analyticsService.getUserRank(req.user!.userId);
    res.json(data);
  }
}

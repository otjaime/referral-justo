import { Request, Response } from 'express';
import { RewardService } from './reward.service';

const rewardService = new RewardService();

export class RewardController {
  async getMyRewards(req: Request, res: Response) {
    const rewards = await rewardService.getUserRewards(req.user!.userId);
    res.json(rewards);
  }

  async redeem(req: Request, res: Response) {
    const reward = await rewardService.redeemReward(req.params.id as string, req.user!.userId);
    res.json(reward);
  }

  async getAll(_req: Request, res: Response) {
    const rewards = await rewardService.getAllRewards();
    res.json(rewards);
  }
}

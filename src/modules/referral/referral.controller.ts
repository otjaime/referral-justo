import { Request, Response } from 'express';
import { ReferralService } from './referral.service';

const referralService = new ReferralService();

export class ReferralController {
  async getMyCode(req: Request, res: Response) {
    const code = await referralService.getOrCreateCode(req.user!.userId);
    res.json(code);
  }

  async validateCode(req: Request, res: Response) {
    const result = await referralService.validateCode(req.params.code as string);
    res.json(result);
  }

  async qualify(req: Request, res: Response) {
    const referral = await referralService.qualifyReferral(req.params.id as string);
    res.json(referral);
  }

  async getSent(req: Request, res: Response) {
    const referrals = await referralService.getSentReferrals(req.user!.userId);
    res.json(referrals);
  }

  async getReceived(req: Request, res: Response) {
    const referral = await referralService.getReceivedReferral(req.user!.userId);
    res.json(referral);
  }

  async getAll(_req: Request, res: Response) {
    const referrals = await referralService.getAllReferrals();
    res.json(referrals);
  }

  async getScore(req: Request, res: Response) {
    const score = await referralService.getScore(req.params.id as string);
    res.json(score);
  }

  async updatePipeline(req: Request, res: Response) {
    const referral = await referralService.updatePipeline(
      req.params.id as string,
      req.body,
      req.user!.userId,
    );
    res.json(referral);
  }

  async getTimeline(req: Request, res: Response) {
    const events = await referralService.getTimeline(req.params.id as string);
    res.json(events);
  }
}

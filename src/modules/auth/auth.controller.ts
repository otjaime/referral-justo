import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterInput, LoginInput, RegisterWithReferralInput } from './auth.schema';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body as LoginInput);
    res.json(result);
  }

  async registerWithReferral(req: Request, res: Response) {
    const result = await authService.registerWithReferral(req.body as RegisterWithReferralInput);
    res.status(201).json(result);
  }

  async getAllUsers(_req: Request, res: Response) {
    const users = await authService.getAllUsers();
    res.json(users);
  }
}

import { Request, Response } from 'express';
import { RestaurantService } from './restaurant.service';
import { RegisterRestaurantInput } from './restaurant.schema';

const restaurantService = new RestaurantService();

export class RestaurantController {
  async register(req: Request, res: Response) {
    const result = await restaurantService.register({
      ...(req.body as RegisterRestaurantInput),
      ownerId: req.user!.userId,
    });
    res.status(201).json(result);
  }

  async getAll(_req: Request, res: Response) {
    const restaurants = await restaurantService.getAllRestaurants();
    res.json(restaurants);
  }
}

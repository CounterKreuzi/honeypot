import { Router } from 'express';
import {
  listBeekeepers,
  getBeekeeperById,
  createBeekeeper,
  updateBeekeeper,
} from '../controllers/admin.controller';

const router = Router();

router.get('/beekeepers', listBeekeepers);
router.get('/beekeepers/:id', getBeekeeperById);
router.post('/beekeepers', createBeekeeper);
router.put('/beekeepers/:id', updateBeekeeper);

export default router;

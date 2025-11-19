import { Router } from 'express';
import {
  listBeekeepers,
  getBeekeeperById,
  createBeekeeper,
  updateBeekeeper,
  deleteBeekeeper,
} from '../controllers/admin.controller';

const router = Router();

router.get('/beekeepers', listBeekeepers);
router.get('/beekeepers/:id', getBeekeeperById);
router.post('/beekeepers', createBeekeeper);
router.put('/beekeepers/:id', updateBeekeeper);
router.delete('/beekeepers/:id', deleteBeekeeper);

export default router;

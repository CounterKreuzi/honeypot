import { Router } from 'express';
import {
  listBeekeepers,
  getBeekeeperById,
  createBeekeeper,
  updateBeekeeper,
  deleteBeekeeper,
  addHoneyTypeForBeekeeper,
  updateHoneyTypeForBeekeeper,
  deleteHoneyTypeForBeekeeper,
} from '../controllers/admin.controller';

const router = Router();

router.get('/beekeepers', listBeekeepers);
router.get('/beekeepers/:id', getBeekeeperById);
router.post('/beekeepers', createBeekeeper);
router.put('/beekeepers/:id', updateBeekeeper);
router.delete('/beekeepers/:id', deleteBeekeeper);
router.post('/beekeepers/:beekeeperId/honey-types', addHoneyTypeForBeekeeper);
router.put('/beekeepers/:beekeeperId/honey-types/:honeyTypeId', updateHoneyTypeForBeekeeper);
router.delete('/beekeepers/:beekeeperId/honey-types/:honeyTypeId', deleteHoneyTypeForBeekeeper);

export default router;

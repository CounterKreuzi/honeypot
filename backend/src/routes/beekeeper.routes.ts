import { Router } from 'express';
import {
  updateProfile,
  getMyProfile,
  addHoneyType,
  updateHoneyType,
  deleteHoneyType,
  getAllBeekeepers,
  getBeekeeperById,
  searchNearby,
} from '../controllers/beekeeper.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes (require authentication)
router.get('/profile', authenticate, getMyProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/honey-types', authenticate, addHoneyType);
router.put('/honey-types/:honeyTypeId', authenticate, updateHoneyType);
router.delete('/honey-types/:honeyTypeId', authenticate, deleteHoneyType);

// Public routes
router.get('/all', getAllBeekeepers);
router.get('/search/nearby', searchNearby);
router.get('/:id', getBeekeeperById);

export default router;

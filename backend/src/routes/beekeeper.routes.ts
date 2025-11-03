import { Router } from 'express';
import {
  // Protected routes
  updateProfile,
  getMyProfile,
  addHoneyType,
  updateHoneyType,
  deleteHoneyType,
  // Public routes
  getAllBeekeepers,
  getBeekeeperById,
  searchNearby,
  // Advanced filtering (optional)
  searchWithFilters,
  getHoneyTypes,
  getCities,
} from '../controllers/beekeeper.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

router.get('/profile', authenticate, getMyProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/honey-types', authenticate, addHoneyType);
router.put('/honey-types/:honeyTypeId', authenticate, updateHoneyType);
router.delete('/honey-types/:honeyTypeId', authenticate, deleteHoneyType);

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Basic search & retrieval
router.get('/all', getAllBeekeepers);
router.get('/search/nearby', searchNearby);

// Advanced filtering (optional - for enhanced frontend)
router.get('/search/advanced', searchWithFilters);
router.get('/honey-types/list', getHoneyTypes);
router.get('/cities', getCities);

// Get single beekeeper (must be last to avoid route conflicts)
router.get('/:id', getBeekeeperById);

export default router;
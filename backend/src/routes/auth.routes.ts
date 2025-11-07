// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  registerIntent,
  registerComplete,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

router.post('/register', register);
router.post('/register-intent', registerIntent);
router.post('/register-complete', registerComplete);
router.post('/login', login);

// 🆕 E-Mail Verifizierung
router.post('/verify-email', verifyEmail);

// 🆕 Passwort zurücksetzen
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

router.get('/profile', authenticate, getProfile);

// 🆕 Verifizierungs-E-Mail erneut senden
router.post('/resend-verification', authenticate, resendVerificationEmail);

export default router;

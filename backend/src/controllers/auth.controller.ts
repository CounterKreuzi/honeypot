// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RegistrationIntent } from '../entities/RegistrationIntent';
import { Beekeeper } from '../entities/Beekeeper';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';
import { AuthRequest } from '../middleware/auth';
import { emailService } from '../services/email.service';

const userRepository = AppDataSource.getRepository(User);
const beekeeperRepository = AppDataSource.getRepository(Beekeeper);
const registrationIntentRepository = AppDataSource.getRepository(RegistrationIntent);

// ============================================================================
// GEOCODING HELPER
// ============================================================================

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeAddress(
  address: string,
  city?: string,
  postalCode?: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const searchParts = [address];
    if (city) searchParts.push(city);
    if (postalCode) searchParts.push(postalCode);
    const searchQuery = searchParts.join(', ');

    console.log('🔍 Geocoding address during registration:', searchQuery);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Honeypot-Imker-Platform/1.0',
          'Accept-Language': 'de',
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Nominatim API error:', response.status);
      return null;
    }

    const data = (await response.json()) as NominatimResult[];

    if (data && data.length > 0 && data[0]) {
      const result = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };

      console.log('✅ Registration geocoding successful:', result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('❌ Registration geocoding error:', error);
    return null;
  }
}

// ============================================================================
// HELPER: TOKEN GENERATOR
// ============================================================================

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================================================
// AUTH ROUTES
// ============================================================================

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const { email, password, name } = value;

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Ein Benutzer mit dieser E-Mail existiert bereits',
      });
      return;
    }

    const hashedPassword = await hashPassword(password);

    // 🆕 Verifizierungs-Token generieren
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24); // 24 Stunden gültig

    const user = userRepository.create({
      email,
      password: hashedPassword,
      role: 'beekeeper',
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await userRepository.save(user);

    // 🆕 Intelligente Koordinaten-Setzung
    let initialLatitude = 48.2082;
    let initialLongitude = 16.3738;
    let initialAddress = '';
    let isActive = false;

    if (req.body.address) {
      initialAddress = req.body.address;

      const geocodeResult = await geocodeAddress(
        req.body.address,
        req.body.city,
        req.body.postalCode
      );

      if (geocodeResult) {
        initialLatitude = geocodeResult.latitude;
        initialLongitude = geocodeResult.longitude;
        isActive = true;
        console.log('✅ Profile created with geocoded coordinates');
      } else {
        console.log('⚠️ Geocoding failed during registration, using fallback');
      }
    }

    const beekeeper = beekeeperRepository.create({
      user,
      name,
      latitude: initialLatitude,
      longitude: initialLongitude,
      address: initialAddress,
      city: req.body.city || '',
      postalCode: req.body.postalCode || '',
      isActive: isActive,
    });

    await beekeeperRepository.save(beekeeper);

    // 🆕 Willkommens-E-Mail mit Verifizierungslink senden
    try {
      await emailService.sendWelcomeEmail(email, name, verificationToken);
      console.log(`✅ Willkommens-E-Mail gesendet an ${email}`);
    } catch (emailError) {
      console.error('⚠️ E-Mail konnte nicht gesendet werden:', emailError);
      // Registrierung trotzdem erfolgreich, E-Mail-Fehler nicht blockieren
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        beekeeper: {
          id: beekeeper.id,
          name: beekeeper.name,
          isActive: beekeeper.isActive,
          needsProfileCompletion: !isActive,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Registrierung',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const { email, password } = value;

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Ungültige E-Mail oder Passwort',
      });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Ungültige E-Mail oder Passwort',
      });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['honeyTypes'],
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login erfolgreich',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        beekeeper: beekeeper
          ? {
              id: beekeeper.id,
              name: beekeeper.name,
              isActive: beekeeper.isActive,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Login',
    });
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich',
      });
      return;
    }

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
      relations: ['honeyTypes'],
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        beekeeper,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Profils',
    });
  }
};

// ============================================================================
// 🆕 E-MAIL VERIFIZIERUNG
// ============================================================================

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verifizierungs-Token fehlt',
      });
      return;
    }

    const user = await userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Verifizierungs-Token',
      });
      return;
    }

    // Token-Ablauf prüfen
    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Verifizierungs-Token ist abgelaufen',
      });
      return;
    }

    // E-Mail verifizieren
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await userRepository.save(user);

    res.json({
      success: true,
      message: 'E-Mail erfolgreich verifiziert! Du kannst dich jetzt anmelden.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der E-Mail-Verifizierung',
    });
  }
};

export const resendVerificationEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich',
      });
      return;
    }

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: 'E-Mail ist bereits verifiziert',
      });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
    });

    // Neuen Token generieren
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await userRepository.save(user);

    // E-Mail erneut senden
    await emailService.sendWelcomeEmail(
      user.email,
      beekeeper?.name || 'Imker',
      verificationToken
    );

    res.json({
      success: true,
      message: 'Verifizierungs-E-Mail wurde erneut gesendet',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Verifizierungs-E-Mail',
    });
  }
};

// ============================================================================
// 🆕 PASSWORT ZURÜCKSETZEN
// ============================================================================

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse fehlt',
      });
      return;
    }

    const user = await userRepository.findOne({ where: { email } });

    // 🔐 Sicherheit: Immer gleiche Antwort (verhindert E-Mail-Enumeration)
    const successMessage = 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Passwort-Reset-Link gesendet.';

    if (!user) {
      res.json({ success: true, message: successMessage });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: user.id } },
    });

    // Reset-Token generieren
    const resetToken = generateVerificationToken();
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 Stunde gültig

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpires = resetTokenExpires;
    await userRepository.save(user);

    // E-Mail senden
    try {
      await emailService.sendPasswordResetEmail(
        email,
        beekeeper?.name || 'Imker',
        resetToken
      );
    } catch (emailError) {
      console.error('⚠️ Password reset email failed:', emailError);
    }

    res.json({ success: true, message: successMessage });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Passwort-Reset-Anfrage',
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Token und neues Passwort sind erforderlich',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Passwort muss mindestens 8 Zeichen lang sein',
      });
      return;
    }

    const user = await userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Reset-Token',
      });
      return;
    }

    // Token-Ablauf prüfen
    if (user.resetPasswordTokenExpires && user.resetPasswordTokenExpires < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Reset-Token ist abgelaufen',
      });
      return;
    }

    // Neues Passwort setzen
    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await userRepository.save(user);

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen des Passworts',
    });
  }
};

// ============================================================================
// CHANGE PASSWORD (AUTHENTICATED)
// ============================================================================

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentifizierung erforderlich' });
      return;
    }
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Aktuelles und neues Passwort sind erforderlich' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'Neues Passwort muss mindestens 8 Zeichen lang sein' });
      return;
    }

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
      return;
    }

    const ok = await comparePassword(currentPassword, user.password);
    if (!ok) {
      res.status(400).json({ success: false, message: 'Aktuelles Passwort ist falsch' });
      return;
    }

    user.password = await hashPassword(newPassword);
    await userRepository.save(user);
    res.json({ success: true, message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Ändern des Passworts' });
  }
};

// ============================================================================
// CHANGE EMAIL WITH 2FA CODE (AUTHENTICATED)
// ============================================================================

export const requestChangeEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { newEmail } = req.body || {};
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentifizierung erforderlich' });
      return;
    }
    if (!newEmail) {
      res.status(400).json({ success: false, message: 'Neue E-Mail-Adresse ist erforderlich' });
      return;
    }

    const existing = await userRepository.findOne({ where: { email: newEmail } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Es existiert bereits ein Konto mit dieser E-Mail' });
      return;
    }

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    user.changeEmailCode = code;
    user.changeEmailCodeExpires = expires;
    user.changeEmailNewAddress = newEmail;
    await userRepository.save(user);

    try {
      await emailService.sendChangeEmailCode(user.email, code, newEmail);
    } catch (emailErr) {
      console.error('Change email code send error:', emailErr);
    }

    res.json({ success: true, message: 'Bestätigungscode wurde an deine aktuelle E-Mail gesendet' });
  } catch (error) {
    console.error('Request change email error:', error);
    res.status(500).json({ success: false, message: 'Fehler bei der E-Mail-Änderungsanfrage' });
  }
};

export const confirmChangeEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body || {};
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentifizierung erforderlich' });
      return;
    }
    if (!code) {
      res.status(400).json({ success: false, message: 'Bestätigungscode ist erforderlich' });
      return;
    }

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
      return;
    }

    if (!user.changeEmailCode || !user.changeEmailCodeExpires || !user.changeEmailNewAddress) {
      res.status(400).json({ success: false, message: 'Keine ausstehende E-Mail-Änderung gefunden' });
      return;
    }
    if (user.changeEmailCode !== code) {
      res.status(400).json({ success: false, message: 'Der Bestätigungscode ist ungültig' });
      return;
    }
    if (user.changeEmailCodeExpires < new Date()) {
      res.status(400).json({ success: false, message: 'Der Bestätigungscode ist abgelaufen' });
      return;
    }

    const existing = await userRepository.findOne({ where: { email: user.changeEmailNewAddress } });
    if (existing) {
      res.status(400).json({ success: false, message: 'E-Mail bereits vergeben' });
      return;
    }

    user.email = user.changeEmailNewAddress;
    user.changeEmailNewAddress = null;
    user.changeEmailCode = null;
    user.changeEmailCodeExpires = null;
    await userRepository.save(user);

    res.json({ success: true, message: 'E-Mail-Adresse erfolgreich geändert' });
  } catch (error) {
    console.error('Confirm change email error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Bestätigen der E-Mail-Änderung' });
  }
};

// ============================================================================
// REGISTRATION INTENT (Option B)
// ============================================================================

export const registerIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const email: string | undefined = req.body?.email;
    if (!email) {
      res.status(400).json({ success: false, message: 'E-Mail-Adresse fehlt' });
      return;
    }

    // Create or update intent with new token valid for 24h
    const token = generateVerificationToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    let intent = await registrationIntentRepository.findOne({ where: { email } });
    if (!intent) {
      intent = registrationIntentRepository.create({ email, token, tokenExpiresAt: expires });
    } else {
      intent.token = token;
      intent.tokenExpiresAt = expires;
    }
    await registrationIntentRepository.save(intent);

    try {
      await emailService.sendRegistrationIntentEmail(email, token);
    } catch (e) {
      // Do not reveal details to client; log on server
      console.error('Registration intent email failed:', e);
    }

    // Always generic response (prevents email enumeration)
    res.json({ success: true, message: 'Wenn diese E-Mail existiert, senden wir dir einen Bestätigungslink.' });
  } catch (error) {
    console.error('Register intent error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Anfordern des Registrierungslinks' });
  }
};

export const registerComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      token,
      password,
      name,
      address,
      city,
      postalCode,
      salutation,
      firstName,
      lastName,
      companyName,
      shortDescription,
      website,
      phoneCustomer,
      phoneAdmin,
    } = req.body || {};

    if (!token || !password || !name) {
      res.status(400).json({ success: false, message: 'Token, Passwort und Name sind erforderlich' });
      return;
    }

    // Require address data to be present
    if (!address || !city || !postalCode) {
      res.status(400).json({ success: false, message: 'Adresse, Ort und PLZ sind erforderlich' });
      return;
    }

    const intent = await registrationIntentRepository.findOne({ where: { token } });
    if (!intent) {
      res.status(400).json({ success: false, message: 'Ungültiger oder abgelaufener Token' });
      return;
    }
    if (intent.tokenExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Token ist abgelaufen' });
      return;
    }

    // If user already exists for that email, abort politely
    const existingUser = await userRepository.findOne({ where: { email: intent.email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Es existiert bereits ein Benutzer mit dieser E-Mail' });
      return;
    }

    const hashedPassword = await hashPassword(password);

    // No second email verification required: mark as verified directly
    const user = userRepository.create({
      email: intent.email,
      password: hashedPassword,
      role: 'beekeeper',
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    });
    await userRepository.save(user);

    // Initial beekeeper profile
    let initialLatitude = 48.2082;
    let initialLongitude = 16.3738;
    let initialAddress = '';

    // Optional geocode, if address info provided
    if (address || city || postalCode) {
      const coords = await geocodeAddress(address || '', city, postalCode);
      if (coords) {
        initialLatitude = coords.latitude;
        initialLongitude = coords.longitude;
        initialAddress = [address, postalCode, city].filter(Boolean).join(', ');
      }
    }

    const resolvedName = companyName?.trim()
      ? companyName.trim()
      : [firstName, lastName].filter(Boolean).join(' ') || name;

    const activeFlag =
      typeof initialLatitude === 'number' &&
      typeof initialLongitude === 'number' &&
      initialLatitude !== 0 &&
      initialLongitude !== 0;

    const beekeeper = beekeeperRepository.create({
      user,
      name: resolvedName,
      salutation: salutation || null,
      firstName: firstName || null,
      lastName: lastName || null,
      companyName: companyName || null,
      description: shortDescription || null,
      website: website || null,
      phone: phoneCustomer || null,
      customerPhone: phoneCustomer || null,
      adminPhone: phoneAdmin || null,
      isActive: activeFlag,
      latitude: initialLatitude,
      longitude: initialLongitude,
      address: initialAddress,
      city: city || null,
      postalCode: postalCode || null,
    });
    await beekeeperRepository.save(beekeeper);

    // Remove intent after successful completion (single-use)
    try {
      await registrationIntentRepository.remove(intent);
    } catch {}

    // Create auth token for immediate login
    const tokenJwt = generateToken({ userId: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Registrierung erfolgreich! Willkommen bei Honeypot.',
      data: {
        token: tokenJwt,
        user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
        beekeeper: { id: beekeeper.id, name: beekeeper.name, isActive: beekeeper.isActive },
      },
    });
  } catch (error) {
    console.error('Register complete error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abschluss der Registrierung' });
  }
};

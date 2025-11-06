import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Beekeeper } from '../entities/Beekeeper';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';
import { AuthRequest } from '../middleware/auth';

const userRepository = AppDataSource.getRepository(User);
const beekeeperRepository = AppDataSource.getRepository(Beekeeper);

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

    const user = userRepository.create({
      email,
      password: hashedPassword,
      role: 'beekeeper',
      isVerified: false,
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

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich',
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

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Beekeeper } from '../entities/Beekeeper';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';

const userRepository = AppDataSource.getRepository(User);
const beekeeperRepository = AppDataSource.getRepository(Beekeeper);

export const register = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, name } = value;

    // Check if user exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ein Benutzer mit dieser E-Mail existiert bereits',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = userRepository.create({
      email,
      password: hashedPassword,
      role: 'beekeeper',
      isVerified: false,
    });

    await userRepository.save(user);

    // Create beekeeper profile (without location for now)
    const beekeeper = beekeeperRepository.create({
      user,
      name,
      latitude: 0, // Placeholder - will be updated in profile
      longitude: 0,
      address: '',
      isActive: false, // Will be activated after profile completion
    });

    await beekeeperRepository.save(beekeeper);

    // Generate token
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

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = value;

    // Find user
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Ungültige E-Mail oder Passwort',
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Ungültige E-Mail oder Passwort',
      });
    }

    // Generate token
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

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'isVerified', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
    }

    // Get beekeeper profile if exists
    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
      relations: ['honeyTypes'],
    });

    res.json({
      success: true,
      data: {
        user,
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

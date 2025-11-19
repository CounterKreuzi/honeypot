import { Request, Response } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { Beekeeper } from '../entities/Beekeeper';
import { User } from '../entities/User';
import { hashPassword } from '../utils/password';
import { emailService } from '../services/email.service';
import {
  adminCreateBeekeeperSchema,
  adminUpdateBeekeeperSchema,
} from '../utils/adminValidation';

const beekeeperRepository = AppDataSource.getRepository(Beekeeper);
const userRepository = AppDataSource.getRepository(User);

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function geocodeAddress(
  address?: string,
  city?: string,
  postalCode?: string
): Promise<{ latitude: number; longitude: number } | null> {
  if (!address) {
    return null;
  }

  try {
    const parts = [address];
    if (postalCode) parts.push(postalCode);
    if (city) parts.push(city);
    const query = parts.filter(Boolean).join(', ');

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Honeypot-Imker-Platform/1.0',
          'Accept-Language': 'de',
        },
      }
    );

    if (!response.ok) {
      console.warn('Nominatim API returned', response.status);
      return null;
    }

    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function parseBooleanQuery(value?: string | string[]): boolean | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
}

export const listBeekeepers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const limitRaw = parseInt((req.query.limit as string) || '25', 10);
    const limit = Math.min(Math.max(limitRaw, 1), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || undefined;
    const isActiveFilter = parseBooleanQuery(req.query.isActive as string);
    const isVerifiedFilter = parseBooleanQuery(req.query.isVerified as string);

    const baseQb = beekeeperRepository.createQueryBuilder('beekeeper');

    if (search) {
      const normalized = `%${search.toLowerCase()}%`;
      baseQb.andWhere(
        '(LOWER(beekeeper.name) LIKE :search OR LOWER(beekeeper.city) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: normalized }
      );
      baseQb.leftJoin('beekeeper.user', 'user');
    } else {
      baseQb.leftJoin('beekeeper.user', 'user');
    }

    if (typeof isActiveFilter === 'boolean') {
      baseQb.andWhere('beekeeper.isActive = :isActive', { isActive: isActiveFilter });
    }

    if (typeof isVerifiedFilter === 'boolean') {
      baseQb.andWhere('beekeeper.isVerified = :isVerified', {
        isVerified: isVerifiedFilter,
      });
    }

    const total = await baseQb.getCount();

    const dataQb = baseQb
      .clone()
      .leftJoinAndSelect('beekeeper.user', 'userFull')
      .leftJoinAndSelect('beekeeper.honeyTypes', 'honeyTypes')
      .orderBy('beekeeper.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const beekeepers = await dataQb.getMany();

    res.json({
      success: true,
      data: {
        items: beekeepers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('List beekeepers error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Imker' });
  }
};

export const getBeekeeperById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const beekeeper = await beekeeperRepository.findOne({
      where: { id },
      relations: ['user', 'honeyTypes'],
    });

    if (!beekeeper) {
      res.status(404).json({ success: false, message: 'Imker nicht gefunden' });
      return;
    }

    res.json({ success: true, data: beekeeper });
  } catch (error) {
    console.error('Get beekeeper error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden des Imkers' });
  }
};

export const createBeekeeper = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { error, value } = adminCreateBeekeeperSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const existingUser = await userRepository.findOne({ where: { email: value.email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Diese E-Mail wird bereits verwendet' });
      return;
    }

    const hashedPassword = await hashPassword(value.password);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    const user = userRepository.create({
      email: value.email,
      password: hashedPassword,
      role: 'beekeeper',
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await userRepository.save(user);

    let latitude = typeof value.latitude === 'number' ? value.latitude : undefined;
    let longitude = typeof value.longitude === 'number' ? value.longitude : undefined;

    if ((!latitude || !longitude) && value.address) {
      const geocode = await geocodeAddress(value.address, value.city, value.postalCode);
      if (geocode) {
        latitude = geocode.latitude;
        longitude = geocode.longitude;
      }
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      latitude = 48.2082;
      longitude = 16.3738;
    }

    const beekeeper = beekeeperRepository.create({
      user,
      name: value.name,
      salutation: value.salutation || null,
      firstName: value.firstName || null,
      lastName: value.lastName || null,
      companyName: value.companyName || null,
      description: value.description || null,
      address: value.address,
      city: value.city || null,
      postalCode: value.postalCode || null,
      country: value.country || null,
      latitude,
      longitude,
      phone: value.phone || null,
      customerPhone: value.customerPhone || null,
      adminPhone: value.adminPhone || null,
      website: value.website || null,
      openingHours: value.openingHours || null,
      isActive:
        typeof value.isActive === 'boolean' ? value.isActive : Boolean(value.address && latitude && longitude),
      isVerified: value.isVerified ?? false,
    });

    await beekeeperRepository.save(beekeeper);

    try {
      await emailService.sendWelcomeEmail(user.email, value.name, verificationToken);
    } catch (emailError) {
      console.error('Admin create beekeeper email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Imker wurde angelegt und E-Mail gesendet',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        beekeeper,
      },
    });
  } catch (error) {
    console.error('Create beekeeper error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Anlegen des Imkers' });
  }
};

export const updateBeekeeper = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { error, value } = adminUpdateBeekeeperSchema.validate(req.body);

    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({ where: { id } });
    if (!beekeeper) {
      res.status(404).json({ success: false, message: 'Imker nicht gefunden' });
      return;
    }

    Object.assign(beekeeper, value);

    await beekeeperRepository.save(beekeeper);

    const updated = await beekeeperRepository.findOne({
      where: { id },
      relations: ['user', 'honeyTypes'],
    });

    res.json({ success: true, message: 'Imker wurde aktualisiert', data: updated });
  } catch (error) {
    console.error('Update beekeeper error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Imkers' });
  }
};

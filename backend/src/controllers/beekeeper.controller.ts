import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Beekeeper } from '../entities/Beekeeper';
import { HoneyType } from '../entities/HoneyType';
import { AuthRequest } from '../middleware/auth';
import {
  updateProfileSchema,
  addHoneyTypeSchema,
  updateHoneyTypeSchema,
  geoSearchSchema,
} from '../utils/beekeeperValidation';

const beekeeperRepository = AppDataSource.getRepository(Beekeeper);
const honeyTypeRepository = AppDataSource.getRepository(HoneyType);

// Update Beekeeper Profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!beekeeper) {
      return res.status(404).json({
        success: false,
        message: 'Imker-Profil nicht gefunden',
      });
    }

    Object.assign(beekeeper, value);

    if (value.latitude && value.longitude && value.address) {
      beekeeper.isActive = true;
    }

    await beekeeperRepository.save(beekeeper);

    res.json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      data: beekeeper,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Profils',
    });
  }
};

// Get Own Beekeeper Profile
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
      relations: ['honeyTypes'],
    });

    if (!beekeeper) {
      return res.status(404).json({
        success: false,
        message: 'Imker-Profil nicht gefunden',
      });
    }

    res.json({
      success: true,
      data: beekeeper,
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Profils',
    });
  }
};

// Add Honey Type
export const addHoneyType = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const { error, value } = addHoneyTypeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!beekeeper) {
      return res.status(404).json({
        success: false,
        message: 'Imker-Profil nicht gefunden',
      });
    }

    const honeyType = honeyTypeRepository.create({
      ...value,
      beekeeper,
    });

    await honeyTypeRepository.save(honeyType);

    res.status(201).json({
      success: true,
      message: 'Honigsorte erfolgreich hinzugefügt',
      data: honeyType,
    });
  } catch (error) {
    console.error('Add honey type error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen der Honigsorte',
    });
  }
};

// Update Honey Type
export const updateHoneyType = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { honeyTypeId } = req.params;

    const { error, value } = updateHoneyTypeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const honeyType = await honeyTypeRepository.findOne({
      where: { id: honeyTypeId },
      relations: ['beekeeper', 'beekeeper.user'],
    });

    if (!honeyType) {
      return res.status(404).json({
        success: false,
        message: 'Honigsorte nicht gefunden',
      });
    }

    if (honeyType.beekeeper.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Honigsorte',
      });
    }

    Object.assign(honeyType, value);
    await honeyTypeRepository.save(honeyType);

    res.json({
      success: true,
      message: 'Honigsorte erfolgreich aktualisiert',
      data: honeyType,
    });
  } catch (error) {
    console.error('Update honey type error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Honigsorte',
    });
  }
};

// Delete Honey Type
export const deleteHoneyType = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { honeyTypeId } = req.params;

    const honeyType = await honeyTypeRepository.findOne({
      where: { id: honeyTypeId },
      relations: ['beekeeper', 'beekeeper.user'],
    });

    if (!honeyType) {
      return res.status(404).json({
        success: false,
        message: 'Honigsorte nicht gefunden',
      });
    }

    if (honeyType.beekeeper.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Honigsorte',
      });
    }

    await honeyTypeRepository.remove(honeyType);

    res.json({
      success: true,
      message: 'Honigsorte erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Delete honey type error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Honigsorte',
    });
  }
};

// Get All Active Beekeepers (Public)
export const getAllBeekeepers = async (req: AuthRequest, res: Response) => {
  try {
    const beekeepers = await beekeeperRepository.find({
      where: { isActive: true },
      relations: ['honeyTypes'],
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        photo: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        phone: true,
        website: true,
        openingHours: true,
      },
    });

    res.json({
      success: true,
      data: beekeepers,
      count: beekeepers.length,
    });
  } catch (error) {
    console.error('Get all beekeepers error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Imker',
    });
  }
};

// Get Single Beekeeper by ID (Public)
export const getBeekeeperById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const beekeeper = await beekeeperRepository.findOne({
      where: { id, isActive: true },
      relations: ['honeyTypes'],
    });

    if (!beekeeper) {
      return res.status(404).json({
        success: false,
        message: 'Imker nicht gefunden',
      });
    }

    res.json({
      success: true,
      data: beekeeper,
    });
  } catch (error) {
    console.error('Get beekeeper by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Imkers',
    });
  }
};

// Geo Search - Find Beekeepers nearby (Public)
export const searchNearby = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = geoSearchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { latitude, longitude, radius } = value;

    // Find all active beekeepers
    const beekeepers = await beekeeperRepository.find({
      where: { isActive: true },
      relations: ['honeyTypes'],
    });

    // Calculate distance using Haversine formula
    const beekeepersWithDistance = beekeepers
      .map((beekeeper) => {
        const lat1 = latitude * (Math.PI / 180);
        const lat2 = Number(beekeeper.latitude) * (Math.PI / 180);
        const deltaLat = (Number(beekeeper.latitude) - latitude) * (Math.PI / 180);
        const deltaLng = (Number(beekeeper.longitude) - longitude) * (Math.PI / 180);

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLng / 2) *
            Math.sin(deltaLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c; // km

        return {
          ...beekeeper,
          distance: Math.round(distance * 100) / 100,
        };
      })
      .filter((beekeeper) => beekeeper.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: beekeepersWithDistance,
      count: beekeepersWithDistance.length,
      searchParams: {
        latitude,
        longitude,
        radius,
      },
    });
  } catch (error) {
    console.error('Search nearby error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

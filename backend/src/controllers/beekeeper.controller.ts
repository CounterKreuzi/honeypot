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
import Joi from 'joi';

const beekeeperRepository = AppDataSource.getRepository(Beekeeper);
const honeyTypeRepository = AppDataSource.getRepository(HoneyType);

// ============================================================================
// PROTECTED ROUTES (Require Authentication)
// ============================================================================

/**
 * Update Beekeeper Profile
 * @route PUT /api/beekeepers/profile
 * @access Private
 */
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

    // Activate profile if location is set
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

/**
 * Get Own Beekeeper Profile
 * @route GET /api/beekeepers/profile
 * @access Private
 */
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

/**
 * Add Honey Type
 * @route POST /api/beekeepers/honey-types
 * @access Private
 */
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

/**
 * Update Honey Type
 * @route PUT /api/beekeepers/honey-types/:honeyTypeId
 * @access Private
 */
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

/**
 * Delete Honey Type
 * @route DELETE /api/beekeepers/honey-types/:honeyTypeId
 * @access Private
 */
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

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * Get All Active Beekeepers
 * @route GET /api/beekeepers/all
 * @access Public
 */
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

/**
 * Get Single Beekeeper by ID
 * @route GET /api/beekeepers/:id
 * @access Public
 */
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

/**
 * Geo Search - Find Beekeepers Nearby
 * @route GET /api/beekeepers/search/nearby
 * @access Public
 */
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
        // ✅ FIXED: Convert string coordinates to numbers properly
        const beekeeperLat = parseFloat(beekeeper.latitude.toString());
        const beekeeperLng = parseFloat(beekeeper.longitude.toString());
        
        // Skip if coordinates are invalid
        if (isNaN(beekeeperLat) || isNaN(beekeeperLng)) {
          console.warn(`Invalid coordinates for beekeeper ${beekeeper.id}`);
          return null;
        }
        
        const lat1 = latitude * (Math.PI / 180);
        const lat2 = beekeeperLat * (Math.PI / 180);
        const deltaLat = (beekeeperLat - latitude) * (Math.PI / 180);
        const deltaLng = (beekeeperLng - longitude) * (Math.PI / 180);

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
      .filter((beekeeper): beekeeper is NonNullable<typeof beekeeper> => 
        beekeeper !== null && beekeeper.distance <= radius
      )
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

// ============================================================================
// ADVANCED FILTERING (Optional - for enhanced frontend filters)
// ============================================================================

// Validation schema for advanced search
const advancedSearchSchema = Joi.object({
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  radius: Joi.number().min(1).max(200).default(50),
  honeyTypes: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  hasWebsite: Joi.boolean().optional(),
  openNow: Joi.boolean().optional(),
  city: Joi.string().optional(),
  sortBy: Joi.string().valid('distance', 'name', 'price').default('distance'),
});

/**
 * Advanced Search with Filters
 * @route GET /api/beekeepers/search/advanced
 * @access Public
 */
export const searchWithFilters = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = advancedSearchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const {
      latitude,
      longitude,
      radius,
      honeyTypes,
      minPrice,
      maxPrice,
      hasWebsite,
      openNow,
      city,
      sortBy,
    } = value;

    // Build query
    let queryBuilder = beekeeperRepository
      .createQueryBuilder('beekeeper')
      .leftJoinAndSelect('beekeeper.honeyTypes', 'honeyType')
      .where('beekeeper.isActive = :isActive', { isActive: true });

    // Filter by honey types
    if (honeyTypes) {
      const honeyTypeArray = Array.isArray(honeyTypes) ? honeyTypes : [honeyTypes];
      queryBuilder = queryBuilder.andWhere(
        'honeyType.name IN (:...honeyTypes)',
        { honeyTypes: honeyTypeArray }
      );
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      if (minPrice !== undefined) {
        queryBuilder = queryBuilder.andWhere(
          'CAST(honeyType.price AS DECIMAL) >= :minPrice',
          { minPrice }
        );
      }
      if (maxPrice !== undefined) {
        queryBuilder = queryBuilder.andWhere(
          'CAST(honeyType.price AS DECIMAL) <= :maxPrice',
          { maxPrice }
        );
      }
    }

    // Filter by website availability
    if (hasWebsite === true) {
      queryBuilder = queryBuilder.andWhere('beekeeper.website IS NOT NULL');
    }

    // Filter by city
    if (city) {
      queryBuilder = queryBuilder.andWhere('beekeeper.city ILIKE :city', {
        city: `%${city}%`,
      });
    }

    // Filter by opening hours (simplified - you can enhance this)
    if (openNow === true) {
      queryBuilder = queryBuilder.andWhere('beekeeper.openingHours IS NOT NULL');
    }

    const beekeepers = await queryBuilder.getMany();

    // Calculate distance if coordinates provided
    let results = beekeepers;
    if (latitude && longitude) {
      results = beekeepers
        .map((beekeeper) => {
          // ✅ FIXED: Convert string coordinates to numbers
          const beekeeperLat = parseFloat(beekeeper.latitude.toString());
          const beekeeperLng = parseFloat(beekeeper.longitude.toString());
          
          // Skip if invalid
          if (isNaN(beekeeperLat) || isNaN(beekeeperLng)) {
            return null;
          }
          
          const lat1 = latitude * (Math.PI / 180);
          const lat2 = beekeeperLat * (Math.PI / 180);
          const deltaLat = (beekeeperLat - latitude) * (Math.PI / 180);
          const deltaLng = (beekeeperLng - longitude) * (Math.PI / 180);

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
        .filter((beekeeper): beekeeper is NonNullable<typeof beekeeper> => 
          beekeeper !== null && beekeeper.distance <= radius
        );

      // Sort by distance
      if (sortBy === 'distance') {
        results.sort((a: any, b: any) => a.distance - b.distance);
      }
    }

    // Sort by name if requested
    if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Sort by price if requested
    if (sortBy === 'price') {
      results.sort((a, b) => {
        const pricesA = a.honeyTypes
          .filter((h) => h.price != null)
          .map((h) => parseFloat(String(h.price)));
        const pricesB = b.honeyTypes
          .filter((h) => h.price != null)
          .map((h) => parseFloat(String(h.price)));
        
        const priceA = pricesA.length > 0 ? Math.min(...pricesA) : Infinity;
        const priceB = pricesB.length > 0 ? Math.min(...pricesB) : Infinity;
        
        return priceA - priceB;
      });
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: {
        honeyTypes,
        minPrice,
        maxPrice,
        hasWebsite,
        openNow,
        city,
        radius,
      },
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der erweiterten Suche',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get Unique Honey Types (for filter options)
 * @route GET /api/beekeepers/honey-types/list
 * @access Public
 */
export const getHoneyTypes = async (req: AuthRequest, res: Response) => {
  try {
    const honeyTypes = await honeyTypeRepository
      .createQueryBuilder('honeyType')
      .select('DISTINCT honeyType.name', 'name')
      .where('honeyType.available = :available', { available: true })
      .orderBy('honeyType.name', 'ASC')
      .getRawMany();

    res.json({
      success: true,
      data: honeyTypes.map((ht) => ht.name),
    });
  } catch (error) {
    console.error('Get honey types error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Honigsorten',
    });
  }
};

/**
 * Get Available Cities (for filter options)
 * @route GET /api/beekeepers/cities
 * @access Public
 */
export const getCities = async (req: AuthRequest, res: Response) => {
  try {
    const cities = await beekeeperRepository
      .createQueryBuilder('beekeeper')
      .select('DISTINCT beekeeper.city', 'city')
      .where('beekeeper.isActive = :isActive', { isActive: true })
      .andWhere('beekeeper.city IS NOT NULL')
      .orderBy('beekeeper.city', 'ASC')
      .getRawMany();

    res.json({
      success: true,
      data: cities.map((c) => c.city),
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Städte',
    });
  }
};
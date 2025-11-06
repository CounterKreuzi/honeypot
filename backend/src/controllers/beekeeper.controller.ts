import { Request, Response } from 'express';
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

// ============================================================================
// 🆕 GEOCODING HELPER
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

    console.log('🔍 Geocoding address:', searchQuery);

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

      console.log('✅ Geocoding successful:', result);
      console.log('📍 Full address:', data[0].display_name);

      return result;
    }

    console.warn('⚠️ No geocoding results found for:', searchQuery);
    return null;
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
}

// ============================================================================
// PROTECTED ROUTES
// ============================================================================

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!beekeeper) {
      res.status(404).json({
        success: false,
        message: 'Imker-Profil nicht gefunden',
      });
      return;
    }

    // 🆕 Automatisches Geocoding
    if (value.address) {
      const addressChanged = value.address !== beekeeper.address;
      const noCoordinates =
        !beekeeper.latitude ||
        !beekeeper.longitude ||
        beekeeper.latitude === 0 ||
        beekeeper.longitude === 0;

      if (addressChanged || noCoordinates) {
        console.log('🗺️ Address changed or missing coordinates - starting geocoding...');

        const geocodeResult = await geocodeAddress(
          value.address,
          value.city || beekeeper.city,
          value.postalCode || beekeeper.postalCode
        );

        if (geocodeResult) {
          value.latitude = geocodeResult.latitude;
          value.longitude = geocodeResult.longitude;
          console.log('✅ Coordinates updated:', geocodeResult);
        } else {
          console.warn('⚠️ Geocoding failed - keeping existing coordinates or using fallback');

          if (noCoordinates) {
            value.latitude = 48.2082;
            value.longitude = 16.3738;
            console.log('⚠️ Using Vienna fallback coordinates');
          }
        }
      }
    }

    Object.assign(beekeeper, value);

    if (
      value.latitude &&
      value.longitude &&
      value.address &&
      value.latitude !== 0 &&
      value.longitude !== 0
    ) {
      beekeeper.isActive = true;
      console.log('✅ Profile activated with valid location');
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

export const getMyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
      relations: ['honeyTypes'],
    });

    if (!beekeeper) {
      res.status(404).json({
        success: false,
        message: 'Imker-Profil nicht gefunden',
      });
      return;
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

export const addHoneyType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const { error, value } = addHoneyTypeSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const beekeeper = await beekeeperRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!beekeeper) {
      res.status(404).json({
        success: false,
        message: 'Imker-Profil nicht gefunden',
      });
      return;
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

export const updateHoneyType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { honeyTypeId } = req.params;

    const { error, value } = updateHoneyTypeSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const honeyType = await honeyTypeRepository.findOne({
      where: { id: honeyTypeId },
      relations: ['beekeeper', 'beekeeper.user'],
    });

    if (!honeyType) {
      res.status(404).json({
        success: false,
        message: 'Honigsorte nicht gefunden',
      });
      return;
    }

    if (honeyType.beekeeper.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Honigsorte',
      });
      return;
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

export const deleteHoneyType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { honeyTypeId } = req.params;

    const honeyType = await honeyTypeRepository.findOne({
      where: { id: honeyTypeId },
      relations: ['beekeeper', 'beekeeper.user'],
    });

    if (!honeyType) {
      res.status(404).json({
        success: false,
        message: 'Honigsorte nicht gefunden',
      });
      return;
    }

    if (honeyType.beekeeper.user.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Honigsorte',
      });
      return;
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

export const getAllBeekeepers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const beekeepers = await beekeeperRepository.find({
      where: { isActive: true },
      relations: ['honeyTypes'],
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

export const getBeekeeperById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const beekeeper = await beekeeperRepository.findOne({
      where: { id, isActive: true },
      relations: ['honeyTypes'],
    });

    if (!beekeeper) {
      res.status(404).json({
        success: false,
        message: 'Imker nicht gefunden',
      });
      return;
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

export const searchNearby = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { error, value } = geoSearchSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }

    const { latitude, longitude, radius } = value;

    const beekeepers = await beekeeperRepository.find({
      where: { isActive: true },
      relations: ['honeyTypes'],
    });

    const beekeepersWithDistance = beekeepers
      .map((beekeeper) => {
        const beekeeperLat = parseFloat(beekeeper.latitude.toString());
        const beekeeperLng = parseFloat(beekeeper.longitude.toString());

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
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c;

        return {
          ...beekeeper,
          distance: Math.round(distance * 100) / 100,
        };
      })
      .filter(
        (
          beekeeper
        ): beekeeper is Beekeeper & { distance: number } =>
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

export const searchWithFilters = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      honeyTypes,
      minPrice,
      maxPrice,
      hasWebsite,
      openNow,
      city,
      latitude,
      longitude,
      radius = 50,
      sortBy = 'distance',
    } = req.query;

    let queryBuilder = beekeeperRepository
      .createQueryBuilder('beekeeper')
      .leftJoinAndSelect('beekeeper.honeyTypes', 'honeyType')
      .where('beekeeper.isActive = :isActive', { isActive: true });

    if (honeyTypes) {
      const typesArray = Array.isArray(honeyTypes) ? honeyTypes : [honeyTypes];
      queryBuilder.andWhere('honeyType.name IN (:...types)', {
        types: typesArray,
      });
    }

    if (minPrice || maxPrice) {
      if (minPrice) {
        queryBuilder.andWhere('honeyType.price >= :minPrice', {
          minPrice: Number(minPrice),
        });
      }
      if (maxPrice) {
        queryBuilder.andWhere('honeyType.price <= :maxPrice', {
          maxPrice: Number(maxPrice),
        });
      }
    }

    if (hasWebsite === 'true') {
      queryBuilder.andWhere('beekeeper.website IS NOT NULL');
    }

    if (city) {
      queryBuilder.andWhere('beekeeper.city ILIKE :city', {
        city: `%${city}%`,
      });
    }

    if (openNow === 'true') {
      queryBuilder.andWhere('beekeeper.openingHours IS NOT NULL');
    }

    const beekeepers = await queryBuilder.getMany();

    let results: (Beekeeper & { distance?: number })[] = beekeepers;
    if (latitude && longitude) {
      const resultsWithDistance = beekeepers
        .map((beekeeper) => {
          const beekeeperLat = parseFloat(beekeeper.latitude.toString());
          const beekeeperLng = parseFloat(beekeeper.longitude.toString());

          if (isNaN(beekeeperLat) || isNaN(beekeeperLng)) {
            return null;
          }

          const lat1 = Number(latitude) * (Math.PI / 180);
          const lat2 = beekeeperLat * (Math.PI / 180);
          const deltaLat = (beekeeperLat - Number(latitude)) * (Math.PI / 180);
          const deltaLng = (beekeeperLng - Number(longitude)) * (Math.PI / 180);

          const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = 6371 * c;

          return {
            ...beekeeper,
            distance: Math.round(distance * 100) / 100,
          };
        })
        .filter(
          (
            beekeeper
          ): beekeeper is Beekeeper & { distance: number } =>
            beekeeper !== null && beekeeper.distance <= Number(radius)
        );

      if (sortBy === 'distance') {
        resultsWithDistance.sort((a, b) => a.distance - b.distance);
      }
      
      results = resultsWithDistance;
    }

    if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortBy === 'price') {
      results.sort((a, b) => {
        const pricesA = a.honeyTypes
          .filter((h: HoneyType) => h.price != null)
          .map((h: HoneyType) => parseFloat(String(h.price)));
        const pricesB = b.honeyTypes
          .filter((h: HoneyType) => h.price != null)
          .map((h: HoneyType) => parseFloat(String(h.price)));

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

export const getHoneyTypes = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const rows = await honeyTypeRepository
      .createQueryBuilder('honeyType')
      .select('DISTINCT honeyType.name', 'name')
      .where('honeyType.name IS NOT NULL')
      .orderBy('name', 'ASC')
      .getRawMany<{ name: string | null }>();

    const honeyTypes = rows
      .map((row) => row.name)
      .filter((name): name is string => Boolean(name));

    res.json({
      success: true,
      data: honeyTypes,
      count: honeyTypes.length,
    });
  } catch (error) {
    console.error('Get honey types error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Honigsorten',
    });
  }
};

export const getCities = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const rows = await beekeeperRepository
      .createQueryBuilder('beekeeper')
      .select('DISTINCT beekeeper.city', 'city')
      .where('beekeeper.isActive = :isActive', { isActive: true })
      .andWhere('beekeeper.city IS NOT NULL')
      .orderBy('city', 'ASC')
      .getRawMany<{ city: string | null }>();

    const cities = rows
      .map((row) => row.city)
      .filter((city): city is string => Boolean(city));

    res.json({
      success: true,
      data: cities,
      count: cities.length,
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Städte',
    });
  }
};

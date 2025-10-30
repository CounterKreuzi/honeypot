import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(1000).allow('', null),
  address: Joi.string().min(5).max(200),
  city: Joi.string().max(100).allow('', null),
  postalCode: Joi.string().max(20).allow('', null),
  country: Joi.string().max(100).allow('', null),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  phone: Joi.string().max(50).allow('', null),
  website: Joi.string().uri().allow('', null),
  openingHours: Joi.object({
    monday: Joi.string().allow('', null),
    tuesday: Joi.string().allow('', null),
    wednesday: Joi.string().allow('', null),
    thursday: Joi.string().allow('', null),
    friday: Joi.string().allow('', null),
    saturday: Joi.string().allow('', null),
    sunday: Joi.string().allow('', null),
  }).allow(null),
});

export const addHoneyTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Honigsorte muss mindestens 2 Zeichen lang sein',
    'any.required': 'Honigsorte ist erforderlich',
  }),
  description: Joi.string().max(500).allow('', null),
  price: Joi.number().min(0).max(999999).allow(null),
  unit: Joi.string().max(50).allow('', null),
  available: Joi.boolean().default(true),
});

export const updateHoneyTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500).allow('', null),
  price: Joi.number().min(0).max(999999).allow(null),
  unit: Joi.string().max(50).allow('', null),
  available: Joi.boolean(),
});

export const geoSearchSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(1).max(100).default(10), // km
});

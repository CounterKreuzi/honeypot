import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Bitte gib eine gültige E-Mail Adresse ein',
    'any.required': 'E-Mail ist erforderlich',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Passwort muss mindestens 8 Zeichen lang sein',
    'any.required': 'Passwort ist erforderlich',
  }),
  name: Joi.string().min(2).required().messages({
    'string.min': 'Name muss mindestens 2 Zeichen lang sein',
    'any.required': 'Name ist erforderlich',
  }),
  // 🆕 Optionale Adressdaten für Geocoding während Registrierung
  address: Joi.string().min(5).max(200).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  postalCode: Joi.string().max(20).optional().allow(''),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

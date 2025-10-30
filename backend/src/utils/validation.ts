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
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

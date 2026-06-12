import { z } from 'zod';

// Schéma de validation pour les messages
export const messageSchema = z.object({
  text: z.string()
    .min(1, 'Le message ne peut pas être vide')
    .max(1000, 'Le message ne peut pas dépasser 1000 caractères')
    .trim()
    .refine(val => val.trim().length > 0, 'Le message ne peut pas être vide'),
  image: z.string().nullable().optional(),
  replyTo: z.object({
    id: z.string().optional(),
    author_name: z.string(),
    text: z.string(),
  }).nullable().optional(),
});

// Schéma de validation pour les salons
export const salonSchema = z.object({
  id: z.string()
    .min(1, 'L\'ID du salon ne peut pas être vide')
    .max(50, 'L\'ID du salon ne peut pas dépasser 50 caractères')
    .regex(/^[a-z0-9_-]+$/, 'L\'ID ne peut contenir que des lettres minuscules, chiffres, tirets et underscores'),
  name: z.string()
    .min(1, 'Le nom du salon ne peut pas être vide')
    .max(100, 'Le nom du salon ne peut pas dépasser 100 caractères'),
  emoji: z.string()
    .max(2, 'L\'emoji ne peut pas dépasser 2 caractères')
    .optional(),
  type: z.enum(['chat', 'vocal', 'video', 'chat vocal']),
  isPrivate: z.boolean().optional(),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(50, 'Le mot de passe ne peut pas dépasser 50 caractères')
    .optional(),
});

// Schéma de validation pour les profils utilisateur
export const userProfileSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(20, 'Le nom ne peut pas dépasser 20 caractères')
    .regex(/^[a-zA-Z0-9_\p{L}]+$/u, 'Le nom ne peut contenir que des lettres, chiffres et underscores'),
  avatar: z.string()
    .min(1, 'L\'avatar est requis')
    .max(10, 'L\'avatar ne peut pas dépasser 10 caractères'),
  initials: z.string()
    .min(1, 'Les initiales sont requises')
    .max(3, 'Les initiales ne peuvent pas dépasser 3 caractères'),
  status: z.enum(['online', 'away', 'busy', 'offline']).optional(),
});

// Schéma de validation pour les badges
export const badgeSchema = z.object({
  id: z.string()
    .min(1, 'L\'ID du badge ne peut pas être vide')
    .max(50, 'L\'ID du badge ne peut pas dépasser 50 caractères'),
  label: z.string()
    .min(1, 'Le label du badge ne peut pas être vide')
    .max(30, 'Le label du badge ne peut pas dépasser 30 caractères'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'La couleur doit être au format hexadécimal (#RRGGBB)'),
  minLevel: z.number()
    .int('Le niveau minimum doit être un entier')
    .min(1, 'Le niveau minimum doit être au moins 1')
    .max(100, 'Le niveau maximum est 100'),
});

// Types exportés
export type MessageInput = z.infer<typeof messageSchema>;
export type SalonInput = z.infer<typeof salonSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type BadgeInput = z.infer<typeof badgeSchema>;

// Fonctions de validation
export function validateMessage(data: unknown) {
  return messageSchema.safeParse(data);
}

export function validateSalon(data: unknown) {
  return salonSchema.safeParse(data);
}

export function validateUserProfile(data: unknown) {
  return userProfileSchema.safeParse(data);
}

export function validateBadge(data: unknown) {
  return badgeSchema.safeParse(data);
}

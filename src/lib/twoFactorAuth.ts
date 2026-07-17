/**
 * Authentification à deux facteurs TOTP — persistance Supabase
 */
import { TOTP, Secret } from 'otpauth';
import { supabase } from './supabase';

const APP_NAME = 'Virtuel-RT';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt?: string;
  remainingBackupCodes: number;
}

function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 10).toString()).join(''),
  );
}

function buildTotp(secret: string, email: string): TOTP {
  return new TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

function generateSecretBase32(): string {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

export async function setupTwoFactor(userId: string, email: string): Promise<TwoFactorSetup | null> {
  const secret = generateSecretBase32();
  const backupCodes = generateBackupCodes();
  const totp = buildTotp(secret, email);

  const { error } = await supabase.from('user_two_factor').upsert({
    user_id: userId,
    secret,
    enabled: false,
    backup_codes: backupCodes,
    backup_codes_used: [],
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('setupTwoFactor:', error);
    return null;
  }

  return {
    secret,
    qrCodeUrl: totp.toString(),
    backupCodes,
  };
}

export async function enableTwoFactor(userId: string, email: string, code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_two_factor')
    .select('secret, enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.secret || data.enabled) return false;

  const totp = buildTotp(data.secret, email);
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return false;

  const { error: updateError } = await supabase
    .from('user_two_factor')
    .update({
      enabled: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !updateError;
}

export async function disableTwoFactor(userId: string, code: string, email: string): Promise<boolean> {
  const valid = await verifyTotpCode(userId, email, code);
  if (!valid) return false;

  const { error } = await supabase.from('user_two_factor').delete().eq('user_id', userId);
  return !error;
}

export async function verifyTotpCode(userId: string, email: string, code: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_two_factor')
    .select('secret, enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.secret || !data.enabled) return false;

  const totp = buildTotp(data.secret, email);
  return totp.validate({ token: code, window: 1 }) !== null;
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_two_factor')
    .select('backup_codes, backup_codes_used, enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.enabled) return false;
  if (!data.backup_codes.includes(code) || data.backup_codes_used.includes(code)) return false;

  const { error: updateError } = await supabase
    .from('user_two_factor')
    .update({
      backup_codes_used: [...data.backup_codes_used, code],
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return !updateError;
}

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const { data } = await supabase
    .from('user_two_factor')
    .select('enabled, verified_at, backup_codes, backup_codes_used')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return { enabled: false, remainingBackupCodes: 0 };

  return {
    enabled: !!data.enabled,
    verifiedAt: data.verified_at ?? undefined,
    remainingBackupCodes: (data.backup_codes?.length ?? 0) - (data.backup_codes_used?.length ?? 0),
  };
}

export async function requiresTwoFactorVerification(userId: string): Promise<boolean> {
  const status = await getTwoFactorStatus(userId);
  if (!status.enabled) return false;
  if (!status.verifiedAt) return true;
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  return new Date(status.verifiedAt).getTime() < thirtyMinAgo;
}

/** @deprecated Utiliser les fonctions exportées ci-dessus */
export const twoFactorAuthService = {
  setupTwoFactor: async (userId: string, email: string) => setupTwoFactor(userId, email),
  enableTwoFactor: async (userId: string, email: string, code: string) => enableTwoFactor(userId, email, code),
  isTwoFactorEnabled: async (userId: string) => (await getTwoFactorStatus(userId)).enabled,
};

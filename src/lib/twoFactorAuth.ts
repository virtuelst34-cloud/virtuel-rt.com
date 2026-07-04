/**
 * Système d'Authentification à Deux Facteurs (2FA)
 * 
 * Gère l'authentification à deux facteurs pour les comptes premium
 * avec génération de codes, vérification et codes de récupération.
 */

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  userId: string;
  isEnabled: boolean;
  verifiedAt?: Date;
  backupCodesUsed: string[];
}

class TwoFactorAuthService {
  private userSettings: Map<string, TwoFactorVerification> = new Map();

  /**
   * Génère un secret aléatoire pour 2FA
   */
  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
}
    return secret;
  }

  /**
   * Génère des codes de récupération
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 10).toString()
      ).join('');
      codes.push(code);
    }
    return codes;
  }

  /**
   * Génère l'URL QR Code pour Google Authenticator
   */
  private generateQRCodeUrl(secret: string, email: string, appName: string = 'Virtuel-RT'): string {
    return `otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${appName}`;
  }

  /**
   * Configure le 2FA pour un utilisateur
   */
  setupTwoFactor(userId: string, email: string): TwoFactorSetup {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();
    const qrCodeUrl = this.generateQRCodeUrl(secret, email);

    // Stocker temporairement (en production, stocker en base de données)
    const settings: TwoFactorVerification = {
      userId,
      isEnabled: false, // Pas encore activé
      backupCodesUsed: []
    };
    this.userSettings.set(userId, settings);

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Active le 2FA après vérification
   */
  enableTwoFactor(userId: string): boolean {
    const settings = this.userSettings.get(userId);
    if (!settings) return false;

    settings.isEnabled = true;
    settings.verifiedAt = new Date();
    this.userSettings.set(userId, settings);
    return true;
  }

  /**
   * Désactive le 2FA pour un utilisateur
   */
  disableTwoFactor(userId: string): boolean {
    const settings = this.userSettings.get(userId);
    if (!settings) return false;

    settings.isEnabled = false;
    settings.backupCodesUsed = [];
    this.userSettings.set(userId, settings);
    return true;
  }

  /**
   * Vérifie un code TOTP
   */
  verifyCode(userId: string, code: string): boolean {
    const settings = this.userSettings.get(userId);
    if (!settings || !settings.isEnabled) return false;

    // En production, utiliser une vraie bibliothèque TOTP comme 'otpauth'
    // Pour la démo, on simule la vérification
    const isValid = this.validateTOTP(code);
    
    if (isValid) {
      settings.verifiedAt = new Date();
      this.userSettings.set(userId, settings);
    }

    return isValid;
  }

  /**
   * Vérifie un code de récupération
   */
  verifyBackupCode(userId: string, code: string): boolean {
    const settings = this.userSettings.get(userId);
    if (!settings || !settings.isEnabled) return false;

    // En production, vérifier contre les codes stockés en base de données
    // Pour la démo, on accepte un code de 8 chiffres
    const isValid = /^\d{8}$/.test(code) && !settings.backupCodesUsed.includes(code);

    if (isValid) {
      settings.backupCodesUsed.push(code);
      settings.verifiedAt = new Date();
      this.userSettings.set(userId, settings);
    }

    return isValid;
  }

  /**
   * Simule la validation TOTP (à remplacer par une vraie bibliothèque)
   */
  private validateTOTP(code: string): boolean {
    // En production, utiliser une bibliothèque comme 'otpauth' ou 'speakeasy'
    // Pour la démo, on accepte un code de 6 chiffres
    return /^\d{6}$/.test(code);
  }

  /**
   * Génère de nouveaux codes de récupération
   */
  regenerateBackupCodes(userId: string): string[] {
    const settings = this.userSettings.get(userId);
    if (!settings) return [];

    const newCodes = this.generateBackupCodes();
    settings.backupCodesUsed = [];
    this.userSettings.set(userId, settings);

    return newCodes;
  }

  /**
   * Vérifie si le 2FA est activé pour un utilisateur
   */
  isTwoFactorEnabled(userId: string): boolean {
    const settings = this.userSettings.get(userId);
    return settings?.isEnabled || false;
  }

  /**
   * Obtient les paramètres 2FA d'un utilisateur
   */
  getUserSettings(userId: string): TwoFactorVerification | null {
    return this.userSettings.get(userId) || null;
  }

  /**
   * Vérifie si l'utilisateur doit effectuer une vérification 2FA
   */
  requiresVerification(userId: string): boolean {
    const settings = this.userSettings.get(userId);
    if (!settings || !settings.isEnabled) return false;

    // Vérifier si la dernière vérification est récente (moins de 30 minutes)
    if (settings.verifiedAt) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      return settings.verifiedAt < thirtyMinutesAgo;
    }

    return true;
  }

  /**
   * Compte les codes de récupération restants
   */
  getRemainingBackupCodes(userId: string): number {
    const settings = this.userSettings.get(userId);
    if (!settings) return 0;

    // En production, 10 codes totaux - codes utilisés
    return 10 - settings.backupCodesUsed.length;
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();

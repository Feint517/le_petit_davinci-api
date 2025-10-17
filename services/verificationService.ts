interface VerificationCode {
  code: string;
  email: string;
  firstName: string;
  userId: string;
  expiresAt: Date;
  attempts: number;
}

class VerificationService {
  private codes: Map<string, VerificationCode> = new Map();
  private MAX_ATTEMPTS = 5;
  private CODE_EXPIRY_MINUTES = 10;

  /**
   * Generate a 6-digit verification code
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store verification code for an email
   */
  storeCode(email: string, userId: string, firstName: string): string {
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

    this.codes.set(email.toLowerCase(), {
      code,
      email: email.toLowerCase(),
      firstName,
      userId,
      expiresAt,
      attempts: 0,
    });

    console.log(`📧 Verification code generated for ${email}: ${code} (expires at ${expiresAt.toISOString()})`);
    
    // Cleanup expired codes
    this.cleanupExpiredCodes();
    
    return code;
  }

  /**
   * Verify a code
   */
  verifyCode(email: string, code: string): { success: boolean; message: string; userId?: string } {
    const storedData = this.codes.get(email.toLowerCase());

    if (!storedData) {
      return {
        success: false,
        message: 'Code de vérification non trouvé. Veuillez demander un nouveau code.',
      };
    }

    // Check if expired
    if (new Date() > storedData.expiresAt) {
      this.codes.delete(email.toLowerCase());
      return {
        success: false,
        message: 'Code de vérification expiré. Veuillez demander un nouveau code.',
      };
    }

    // Check attempts
    if (storedData.attempts >= this.MAX_ATTEMPTS) {
      this.codes.delete(email.toLowerCase());
      return {
        success: false,
        message: 'Nombre maximum de tentatives atteint. Veuillez demander un nouveau code.',
      };
    }

    // Increment attempts
    storedData.attempts++;

    // Verify code
    if (storedData.code !== code) {
      return {
        success: false,
        message: `Code incorrect. ${this.MAX_ATTEMPTS - storedData.attempts} tentatives restantes.`,
      };
    }

    // Success - remove code
    const userId = storedData.userId;
    this.codes.delete(email.toLowerCase());
    
    return {
      success: true,
      message: 'Email vérifié avec succès!',
      userId,
    };
  }

  /**
   * Resend verification code
   */
  resendCode(email: string): { success: boolean; message: string; code?: string } {
    const storedData = this.codes.get(email.toLowerCase());

    if (!storedData) {
      return {
        success: false,
        message: 'Aucune demande de vérification trouvée pour cet email.',
      };
    }

    // Generate new code
    const code = this.generateCode();
    storedData.code = code;
    storedData.attempts = 0;
    storedData.expiresAt = new Date();
    storedData.expiresAt.setMinutes(storedData.expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

    console.log(`🔄 Verification code resent for ${email}: ${code}`);

    return {
      success: true,
      message: 'Nouveau code envoyé!',
      code,
    };
  }

  /**
   * Check if email has a pending verification
   */
  hasPendingVerification(email: string): boolean {
    const storedData = this.codes.get(email.toLowerCase());
    if (!storedData) return false;
    
    // Check if expired
    if (new Date() > storedData.expiresAt) {
      this.codes.delete(email.toLowerCase());
      return false;
    }
    
    return true;
  }

  /**
   * Get stored data for an email (for resending)
   */
  getStoredData(email: string): { firstName: string; userId: string } | null {
    const storedData = this.codes.get(email.toLowerCase());
    if (!storedData) return null;
    
    return {
      firstName: storedData.firstName,
      userId: storedData.userId,
    };
  }

  /**
   * Remove verification code
   */
  removeCode(email: string): void {
    this.codes.delete(email.toLowerCase());
  }

  /**
   * Cleanup expired codes (run periodically)
   */
  private cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [email, data] of this.codes.entries()) {
      if (now > data.expiresAt) {
        this.codes.delete(email);
        console.log(`🧹 Cleaned up expired code for ${email}`);
      }
    }
  }
}

export default new VerificationService();


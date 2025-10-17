import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Le Petit Davinci'}" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`✅ Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, firstName: string, verificationCode: string): Promise<void> {
    const html = this.getVerificationEmailTemplate(firstName, verificationCode);
    
    await this.sendEmail({
      to: email,
      subject: '🎨 Vérifiez votre email - Le Petit Davinci',
      html,
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = this.getWelcomeEmailTemplate(firstName);
    
    await this.sendEmail({
      to: email,
      subject: '🎉 Bienvenue sur Le Petit Davinci!',
      html,
    });
  }

  /**
   * Verification email template
   */
  private getVerificationEmailTemplate(firstName: string, verificationCode: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      background-color: white;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      color: #2d3748;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .code-container {
      background-color: #f7fafc;
      border: 2px dashed #cbd5e0;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .code-label {
      font-size: 14px;
      color: #718096;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .code {
      font-size: 36px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background-color: #f7fafc;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .expiry {
      background-color: #fff5f5;
      border-left: 4px solid #fc8181;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #742a2a;
      border-radius: 4px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px;
      }
      .header, .content {
        padding: 30px 20px;
      }
      .code {
        font-size: 28px;
        letter-spacing: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎨</div>
      <h1>Le Petit Davinci</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Bonjour ${firstName}! 👋
      </div>
      
      <div class="message">
        Bienvenue sur <strong>Le Petit Davinci</strong>! Nous sommes ravis de vous compter parmi nous.
      </div>
      
      <div class="message">
        Pour activer votre compte et commencer votre aventure créative, veuillez vérifier votre adresse email en entrant le code ci-dessous dans l'application :
      </div>
      
      <div class="code-container">
        <div class="code-label">Votre code de vérification</div>
        <div class="code">${verificationCode}</div>
      </div>
      
      <div class="expiry">
        ⏰ Ce code expirera dans <strong>10 minutes</strong>. Si vous n'avez pas demandé cette vérification, vous pouvez ignorer cet email en toute sécurité.
      </div>
      
      <div class="message">
        Si vous rencontrez des difficultés, n'hésitez pas à nous contacter à l'adresse <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a>.
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 Le Petit Davinci. Tous droits réservés.</p>
      <p>
        <a href="#">Politique de confidentialité</a> • 
        <a href="#">Conditions d'utilisation</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Welcome email template
   */
  private getWelcomeEmailTemplate(firstName: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      width: 100px;
      height: 100px;
      background-color: white;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 50px;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      color: #2d3748;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .message {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .features {
      background-color: #f7fafc;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .feature:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      font-size: 32px;
      margin-right: 15px;
    }
    .feature-text {
      flex: 1;
    }
    .feature-title {
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 5px;
    }
    .feature-description {
      color: #718096;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f7fafc;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎉</div>
      <h1>Bienvenue!</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Félicitations ${firstName}! 🎊
      </div>
      
      <div class="message">
        Votre compte <strong>Le Petit Davinci</strong> est maintenant actif! Vous êtes prêt(e) à commencer votre voyage créatif.
      </div>
      
      <div class="features">
        <div class="feature">
          <div class="feature-icon">🎨</div>
          <div class="feature-text">
            <div class="feature-title">Studio Créatif</div>
            <div class="feature-description">Dessinez, peignez et créez des œuvres d'art incroyables</div>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">📚</div>
          <div class="feature-text">
            <div class="feature-title">Apprentissage Interactif</div>
            <div class="feature-description">Apprenez les mathématiques, le français et bien plus encore</div>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🎮</div>
          <div class="feature-text">
            <div class="feature-title">Jeux Éducatifs</div>
            <div class="feature-description">Amusez-vous tout en développant vos compétences</div>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">👨‍👩‍👧</div>
          <div class="feature-text">
            <div class="feature-title">Profils Familiaux</div>
            <div class="feature-description">Créez des profils pour toute la famille avec des PINs sécurisés</div>
          </div>
        </div>
      </div>
      
      <div class="message">
        Besoin d'aide pour démarrer? Notre équipe est toujours là pour vous assister à <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a>.
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 Le Petit Davinci. Tous droits réservés.</p>
      <p>
        <a href="#">Politique de confidentialité</a> • 
        <a href="#">Conditions d'utilisation</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Réinitialisation du mot de passe</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Réinitialiser le mot de passe</a>
      </div>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    </div>
    <div class="footer">
      <p>© 2025 Le Petit Davinci</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🔑 Réinitialisation de votre mot de passe',
      html,
    });
  }
}

export default new EmailService();


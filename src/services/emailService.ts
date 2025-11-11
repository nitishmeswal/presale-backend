import { Resend } from 'resend';
import logger from '../utils/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  /**
   * Send OTP email for password reset
   */
  async sendPasswordResetOTP(email: string, otp: string, username: string): Promise<boolean> {
    try {
      logger.info(`📧 Attempting to send password reset OTP to: ${email}`);
      logger.info(`🔑 RESEND_API_KEY configured: ${process.env.RESEND_API_KEY ? 'Yes' : 'No'}`);
      
      const { data, error } = await resend.emails.send({
        from: 'NeuroSwarm <noreply@updates.neurolov.ai>',
        to: [email],
        subject: '🔐 Reset Your NeuroSwarm Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); border-radius: 16px; border: 1px solid #2a2a3e; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 40px 40px 20px;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">🔐 Password Reset</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 0 40px 40px;">
                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #b4b4c8;">Hi ${username},</p>
                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #b4b4c8;">You requested to reset your NeuroSwarm password. Use the OTP code below to proceed:</p>
                        
                        <!-- OTP Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                          <tr>
                            <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px;">
                              <p style="margin: 0 0 8px; font-size: 14px; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                              <p style="margin: 0; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #8888a8;">⏱️ This code will expire in <strong style="color: #ffffff;">10 minutes</strong>.</p>
                        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #8888a8;">🔒 If you didn't request this, please ignore this email or contact support.</p>
                        
                        <!-- Security Notice -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; padding: 20px; background-color: rgba(255, 107, 107, 0.1); border-left: 4px solid #ff6b6b; border-radius: 8px;">
                          <tr>
                            <td>
                              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffb3b3;">⚠️ <strong>Security Tip:</strong> Never share your OTP with anyone. NeuroSwarm staff will never ask for your password or OTP.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 32px 40px; border-top: 1px solid #2a2a3e;">
                        <p style="margin: 0 0 8px; font-size: 14px; color: #6666888;">Need help? Contact us at <a href="mailto:support@neurolov.ai" style="color: #667eea; text-decoration: none;">support@neurolov.ai</a></p>
                        <p style="margin: 0; font-size: 12px; color: #555566;">© 2025 NeuroSwarm. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        logger.error(`❌ Resend API Error: ${error.message || JSON.stringify(error)}`);
        logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
        return false;
      }

      logger.info(`✅ Email sent successfully! Resend Email ID: ${data?.id}`);
      logger.info(`📬 Password reset OTP delivered to ${email}`);
      return true;
    } catch (error: any) {
      logger.error(`Exception sending password reset email: ${error.message || JSON.stringify(error)}`);
      return false;
    }
  },

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeletionEmail(email: string, username: string): Promise<boolean> {
    try {
      const { data, error } = await resend.emails.send({
        from: 'NeuroSwarm <noreply@updates.neurolov.ai>',
        to: [email],
        subject: '👋 Your NeuroSwarm Account Has Been Deleted',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); border-radius: 16px; border: 1px solid #2a2a3e;">
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="margin: 0 0 24px; font-size: 24px; color: #ffffff;">Account Deletion Confirmed</h1>
                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #b4b4c8;">Hi ${username},</p>
                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #b4b4c8;">Your NeuroSwarm account has been successfully deleted. We're sorry to see you go!</p>
                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #b4b4c8;">All your data has been permanently removed from our servers.</p>
                        <p style="margin: 0; font-size: 14px; color: #8888a8;">If you change your mind, you're always welcome to create a new account.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      if (error) {
        logger.error(`Failed to send account deletion email: ${error.message || JSON.stringify(error)}`);
        return false;
      }

      logger.info(`✅ Account deletion confirmation sent to ${email}`);
      return true;
    } catch (error: any) {
      logger.error(`Exception sending account deletion email: ${error.message || JSON.stringify(error)}`);
      return false;
    }
  },
};

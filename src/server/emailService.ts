import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'email_config.json');

// Memory store for verification codes: email -> record
interface VerificationRecord {
  code: string;
  expiresAt: number;
  createdAt: number;
  attempts: number;
}

const verificationStore = new Map<string, VerificationRecord>();

// Clean up expired verification codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of verificationStore.entries()) {
    if (record.expiresAt < now) {
      verificationStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

// Load persisted SMTP config
export function getStoredSmtpConfig(): EmailSmtpConfig | null {
  // 1. First check environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true' || (Number(process.env.SMTP_PORT) || 465) === 465,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.SMTP_FROM_NAME || '我爱这young',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
    };
  }

  // 2. Then check local data/email_config.json
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.host && parsed.user && parsed.pass) {
        return parsed as EmailSmtpConfig;
      }
    }
  } catch (e) {
    console.error('Error reading email_config.json:', e);
  }

  return null;
}

// Save SMTP config to data/email_config.json
export function saveSmtpConfig(config: EmailSmtpConfig): void {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save email_config.json:', e);
    throw new Error('保存邮件发信配置失败');
  }
}

// Create a nodemailer transporter
function createTransporter(config: EmailSmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Generate 6-digit verification code and send real email
 */
export async function sendVerificationEmail(
  toEmail: string,
  officialAccountName: string = '我爱这young'
): Promise<{ success: boolean; message: string; requiresConfig?: boolean; error?: string }> {
  const normalizedEmail = toEmail.trim().toLowerCase();

  // Basic email validation
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, message: '请输入有效的电子邮箱地址' };
  }

  // Rate limit: 60s cooldown between sends for the same email
  const existing = verificationStore.get(normalizedEmail);
  const now = Date.now();
  if (existing && now - existing.createdAt < 60 * 1000) {
    const remaining = Math.ceil((60 * 1000 - (now - existing.createdAt)) / 1000);
    return { success: false, message: `发信过于频繁，请等待 ${remaining} 秒后重试` };
  }

  // Check if SMTP is configured
  const smtpConfig = getStoredSmtpConfig();
  if (!smtpConfig) {
    return {
      success: false,
      requiresConfig: true,
      message: '系统尚未配置邮件发信服务 (SMTP)。请在上方或弹窗中点击【发信邮箱设置】，填入 QQ/163/Gmail 发信授权码，即可向您的邮箱发送真实邮件！'
    };
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  // Save to memory store
  verificationStore.set(normalizedEmail, {
    code,
    expiresAt,
    createdAt: now,
    attempts: 0
  });

  // Render HTML email template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>【${officialAccountName}】登录验证码</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <div style="max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px;">
            【${officialAccountName}】
          </h1>
          <p style="margin: 6px 0 0; color: #a7f3d0; font-size: 13px;">
            A股高股息实盘研究 · 专注低估值与确定性现金流
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <p style="margin: 0 0 16px; color: #cbd5e1; font-size: 15px;">
            您好！您正在登录红利价值选股系统，您的 6 位数字验证码为：
          </p>

          <!-- Code Box -->
          <div style="display: inline-block; background: #020617; border: 2px dashed #10b981; border-radius: 12px; padding: 16px 36px; margin: 12px 0 24px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #34d399;">
              ${code}
            </span>
          </div>

          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px;">
            验证码 <strong>10 分钟内有效</strong>，请尽快输入。
          </p>
          <p style="margin: 0; color: #64748b; font-size: 12px;">
            如非本人操作，请忽略此邮件，您的账号信息依然安全。
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #090d16; border-top: 1px solid #1e293b; padding: 16px 24px; text-align: center; color: #64748b; font-size: 11px;">
          此邮件由系统自动发送，请勿直接回复 · 关注公众号【${officialAccountName}】获取更多实盘策略
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const transporter = createTransporter(smtpConfig);
    
    await transporter.sendMail({
      from: `"${smtpConfig.fromName || officialAccountName}" <${smtpConfig.fromEmail || smtpConfig.user}>`,
      to: normalizedEmail,
      subject: `【${officialAccountName}】登录验证码：${code}`,
      text: `您好，您的 6 位登录验证码是：${code}，10分钟内有效。如非本人操作请忽略。`,
      html: htmlContent
    });

    console.log(`[EmailService] Real email verification code sent successfully to: ${normalizedEmail}`);
    return {
      success: true,
      message: `真实验证码已发送至您的邮箱 ${normalizedEmail}，请检查收件箱（或垃圾箱）！`
    };
  } catch (err: any) {
    console.error('[EmailService] Failed to send email via SMTP:', err);
    return {
      success: false,
      message: `发信失败：${err.message || 'SMTP 发信服务器连接异常，请检查邮箱授权码与发信配置'}`,
      error: err.message
    };
  }
}

/**
 * Verify 6-digit code for email
 */
export function verifyEmailCode(
  toEmail: string,
  inputCode: string
): { success: boolean; message: string } {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, message: '请输入 6 位数字验证码' };
  }

  const record = verificationStore.get(normalizedEmail);
  if (!record) {
    return { success: false, message: '验证码不存在或已过期，请重新获取' };
  }

  if (Date.now() > record.expiresAt) {
    verificationStore.delete(normalizedEmail);
    return { success: false, message: '验证码已过期，请重新获取' };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    verificationStore.delete(normalizedEmail);
    return { success: false, message: '输错次数过多，验证码已失效，请重新获取' };
  }

  if (record.code !== cleanCode) {
    return { success: false, message: `验证码不正确，还剩 ${5 - record.attempts} 次尝试机会` };
  }

  // Verification succeeded - consume code
  verificationStore.delete(normalizedEmail);
  return { success: true, message: '验证成功' };
}

/**
 * Send test email to verify SMTP configuration
 */
export async function sendTestEmail(
  toEmail: string,
  config?: EmailSmtpConfig
): Promise<{ success: boolean; message: string; error?: string }> {
  const targetConfig = config || getStoredSmtpConfig();
  if (!targetConfig) {
    return { success: false, message: '尚未提供或保存有效的发信配置' };
  }

  try {
    const transporter = createTransporter(targetConfig);
    // Verify connection first
    await transporter.verify();

    await transporter.sendMail({
      from: `"${targetConfig.fromName || '红利系统测试'}" <${targetConfig.fromEmail || targetConfig.user}>`,
      to: toEmail,
      subject: '【红利系统】SMTP 发信服务测试成功',
      text: `恭喜！您的 SMTP 发信服务（${targetConfig.host}）已成功连接并向 ${toEmail} 发送了测试邮件！`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #34d399; margin-top: 0;">🎉 SMTP 发信服务配置成功！</h2>
          <p style="font-size: 14px; color: #cbd5e1;">您的发信服务器 <strong>${targetConfig.host}:${targetConfig.port}</strong> 已正常工作。</p>
          <p style="font-size: 14px; color: #94a3b8;">后续所有用户在网站请求邮箱验证码时，都将从 <strong>${targetConfig.user}</strong> 真实投递到用户的真实邮箱收件箱中！</p>
          <div style="margin-top: 16px; padding: 12px; background: #020617; border-radius: 8px; font-size: 12px; color: #64748b;">
            发送时间：${new Date().toLocaleString()}
          </div>
        </div>
      `
    });

    return { success: true, message: `测试邮件已成功发送至 ${toEmail}，发信服务工作正常！` };
  } catch (err: any) {
    console.error('[EmailService] Test email failed:', err);
    return { success: false, message: `测试失败: ${err.message || '连接 SMTP 异常'}`, error: err.message };
  }
}

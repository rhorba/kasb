import type { OtpChannel, OtpService } from "./index";

/**
 * Sends OTP codes via Infobip's SMS API.
 * Requires INFOBIP_BASE_URL and INFOBIP_API_KEY env vars.
 */
export class InfobipOtpService implements OtpService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sender: string;

  constructor() {
    const baseUrl = process.env.INFOBIP_BASE_URL;
    const apiKey = process.env.INFOBIP_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error("INFOBIP_BASE_URL and INFOBIP_API_KEY must be set");
    }
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.sender = process.env.INFOBIP_SENDER ?? "Kasb";
  }

  async sendOtp(phone: string, code: string): Promise<{ channel: OtpChannel }> {
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    const response = await fetch(`${this.baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to: normalizedPhone }],
            from: this.sender,
            text: `كسب | رمز التحقق الخاص بك: ${code} — صالح 5 دقائق`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Infobip SMS failed: ${response.status}`);
    }

    return { channel: "sms" };
  }
}

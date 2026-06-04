// Sprint 6: in-app + PWA push notifications
// OTP delivery (SMS) is the Sprint 0 concern — both classes live here.

export type OtpChannel = "sms" | "mock";

/** Delivery-only interface. Verification is done locally against the stored hash. */
export interface OtpService {
  sendOtp(phone: string, code: string): Promise<{ channel: OtpChannel }>;
}

/** Dev mock — logs the code instead of sending SMS. */
export class MockOtpService implements OtpService {
  async sendOtp(phone: string, code: string): Promise<{ channel: OtpChannel }> {
    console.log(`[MockOTP] ${phone} → code: ${code}`);
    return { channel: "mock" };
  }
}

export { InfobipOtpService } from "./infobip";

// MVP stand-in for a real provider (Resend/Postmark). Swap the body of sendMail
// for an API call when wiring up real email sending (plan milestone M6).
export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  console.log(`[mailer] to=${to} subject="${subject}"\n${body}`);
}

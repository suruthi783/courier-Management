/** Returns a 6-digit numeric OTP string */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Returns a unique tracking ID e.g. V789456AR999 */
export function generateTrackingId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix  = 'V' + Math.floor(100000 + Math.random() * 900000);
  const suffix  = letters[Math.floor(Math.random() * 26)]! +
                  letters[Math.floor(Math.random() * 26)]! +
                  Math.floor(100 + Math.random() * 900);
  return prefix + suffix;
}

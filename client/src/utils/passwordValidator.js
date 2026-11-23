/**
 * Password Strength and Policy Validator for Placio-Hire
 * Complies with enterprise security requirements:
 * - Minimum 12 characters
 * - Uppercase, Lowercase, Number, and Special character checks
 */

export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 12 characters', test: (pwd) => pwd.length >= 12 },
  { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', test: (pwd) => /[A-Z]/.test(pwd) },
  { id: 'lowercase', label: 'At least one lowercase letter (a-z)', test: (pwd) => /[a-z]/.test(pwd) },
  { id: 'number', label: 'At least one number (0-9)', test: (pwd) => /[0-9]/.test(pwd) },
  { id: 'special', label: 'At least one special character (!@#$%^&*...)', test: (pwd) => /[^A-Za-z0-9]/.test(pwd) }
];

export function validatePassword(password = '') {
  const checks = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password)
  }));

  const passedCount = checks.filter((c) => c.met).length;
  const isValid = passedCount === PASSWORD_REQUIREMENTS.length;

  let strength = 'Weak';
  let strengthColor = '#ef4444'; // Red
  let score = (passedCount / PASSWORD_REQUIREMENTS.length) * 100;

  if (passedCount >= 5) {
    strength = 'Strong';
    strengthColor = '#16a34a'; // Green
  } else if (passedCount >= 3) {
    strength = 'Moderate';
    strengthColor = '#f59e0b'; // Amber
  }

  return {
    isValid,
    score,
    strength,
    strengthColor,
    checks,
    errors: checks.filter((c) => !c.met).map((c) => c.label)
  };
}

export function validateEmail(email = '') {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

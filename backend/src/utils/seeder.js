const User = require('../models/User');

/**
 * Seeds a default investigator account on first startup.
 *
 * Password source (in priority order):
 *   1. SEED_INVESTIGATOR_PASSWORD env var (required in production)
 *   2. A dev-only fallback — only used when NODE_ENV is NOT 'production'
 *
 * In production, if SEED_INVESTIGATOR_PASSWORD is not set, seeding is skipped
 * and a warning is printed.  The application still starts normally.
 */
const seedAdminUser = async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const seedPassword = process.env.SEED_INVESTIGATOR_PASSWORD;

  if (!seedPassword) {
    if (isProd) {
      console.warn(
        '[Seeder] SEED_INVESTIGATOR_PASSWORD is not set. ' +
        'Skipping default user seed in production. ' +
        'Set this env var and restart once to create the initial investigator account.'
      );
      return;
    }
    // Development only — warn loudly but continue with a generated notice
    console.warn(
      '[Seeder] SEED_INVESTIGATOR_PASSWORD not set. ' +
      'Set this variable in backend/.env to control the seed account password.'
    );
    return;
  }

  try {
    const existing = await User.findOne({ email: 'investigator@tracex.internal' });
    if (!existing) {
      await User.create({
        name: 'Lead Investigator',
        email: 'investigator@tracex.internal',
        passwordHash: seedPassword, // hashed automatically by the pre-save hook
        role: 'investigator',
        isActive: true,
      });
      console.log('[Seeder] Default investigator account created (investigator@tracex.internal).');
    } else {
      console.log('[Seeder] Investigator account already exists — skipping seed.');
    }
  } catch (err) {
    console.error('[Seeder] Failed to seed default user:', err.message);
  }
};

module.exports = { seedAdminUser };

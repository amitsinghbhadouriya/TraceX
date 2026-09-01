const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  let uri = process.env.MONGODB_URI;

  // ── Development fallback: in-memory MongoDB ────────────────────────────────
  // Automatically used when MONGODB_URI points to localhost and it is not available,
  // or when USE_MEMORY_DB=true is explicitly set.
  if (!uri || process.env.USE_MEMORY_DB === 'true') {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log('🧪 Using in-memory MongoDB (development mode)');
      console.log(`   URI: ${uri}`);
    } catch (err) {
      console.warn('⚠️  mongodb-memory-server not available, falling back to configured URI');
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Please set MONGODB_URI in backend/.env or install MongoDB locally.');
    process.exit(1);
  }
};

module.exports = connectDB;

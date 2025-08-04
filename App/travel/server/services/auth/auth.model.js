import { getUserCollection, getLoginCollection } from './auth.db.js';

export async function findUserByEmail(email) {
  const users = await getUserCollection();
  const user = await users.findOne({ email });
  return user;
}

export async function logUserLogin(userId, req) {
  try {
    console.log('🟡 logUserLogin called'); // Confirm function is hit
    console.log('👉 userId:', userId);
    console.log('👉 IP:', req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    console.log('👉 User-Agent:', req.headers['user-agent']);

    const logins = await getLoginCollection();
    console.log('📦 got LoginLogs collection');

    const logEntry = {
      userId,
      timestamp: new Date(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    console.log('📄 Inserting log entry:', logEntry);

    const result = await logins.insertOne(logEntry);
    console.log('✅ Log inserted with ID:', result.insertedId);

  } catch (err) {
    console.error('❌ Error logging login:', err);
  }
}

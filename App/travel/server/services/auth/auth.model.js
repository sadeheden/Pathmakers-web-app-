import { getUserCollection, getLoginCollection } from './auth.db.js';

export async function findUserByEmail(email) {
  const users = await getUserCollection();
  const user = await users.findOne({ email });
  return user;
}

export async function logUserLogin(userId, req) {
  try {
    console.log('🟡 logUserLogin called with userId:', userId);

    const logins = await getLoginCollection();
    console.log('📦 Got LoginLogs collection');

    const logEntry = {
      userId,
      timestamp: new Date(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    console.log('📝 Log entry:', logEntry);

    const result = await logins.insertOne(logEntry);
    console.log('✅ Login log inserted with ID:', result.insertedId);
  } catch (error) {
    console.error('❌ Failed to insert login log:', error);
  }
}


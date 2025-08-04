import { getUserCollection } from './auth.db.js';
import { getLoginCollection } from './auth.db.js';

export async function findUserByEmail(email) {
  const users = await getUserCollection();
  const user = await users.findOne({ email });
  return user;
}
export async function logUserLogin(userId, req) {
  const logins = await getLoginCollection();

  const logEntry = {
    userId,
    timestamp: new Date(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };

  await logins.insertOne(logEntry);
}
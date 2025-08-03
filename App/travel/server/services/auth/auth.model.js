import { getUserCollection } from './auth.db.js';

export async function findUserByEmail(email) {
  const users = await getUserCollection();
  const user = await users.findOne({ email });
  return user;
}

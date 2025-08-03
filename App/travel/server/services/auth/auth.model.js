// server/auth/auth.model.js


import { getUserCollection } from './auth.db.js';


export async function findUserByEmail(email) {
  const users = await getUserCollection();
  const user = await users.findOne({ email });
  return user;
}
export async function insertUser(userData) {
  const users = await getUserCollection();
  const result = await users.insertOne(userData);
  return result.ops ? result.ops[0] : userData; // depending on Mongo driver version
}

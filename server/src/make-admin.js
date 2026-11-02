import 'dotenv/config';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import { User } from './models.js';
const email = (process.argv[2] || '').toLowerCase();
if (!email) { console.log('Usage: npm run make-admin -- you@example.com'); process.exit(1); }
await mongoose.connect(process.env.MONGO_URI);
const u = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
console.log(u ? `${u.email} is now an admin. Sign out and sign in again.` : 'No user with that email. Create the account on the site first.');
await mongoose.disconnect();

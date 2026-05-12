import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['USER','SUPER_ADMIN'], default: 'USER' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);

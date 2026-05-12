import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Simple health check (unauthenticated)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.post('/register', async (req,res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, name, role });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '336h' });
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req,res) => {
  const { email,password } = req.body;
  const user = await User.findOne({email});
  if(!user) return res.status(400).json({message:'Invalid'});
  const match = await bcrypt.compare(password,user.password);
  if(!match) return res.status(400).json({message:'Invalid'});
  const token = jwt.sign({id:user._id}, process.env.JWT_SECRET, {expiresIn:'336h'});
  res.json({token,user:{id:user._id,email:user.email,role:user.role}});
});

// Return current authenticated user's profile
router.get('/profile', isAuthenticated, async (req, res) => {
  if(!req.user) return res.status(404).json({ message: 'User not found' });
  const { _id, email, role, name } = req.user;
  res.json({ user: { id: _id, email, role, name } });
});

export default router;

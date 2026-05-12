import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const isAuthenticated = async (req,res,next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader) return res.status(401).json({message:'No token'});
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch(err) {
    return res.status(401).json({message:'Invalid token'});
  }
};

export const isSuperAdmin = (req,res,next) => {
  if(req.user && req.user.role === 'SUPER_ADMIN') return next();
  return res.status(403).json({message:'Forbidden'});
};

export const canEditAsset = (assetOwnerId) => (req,res,next) => {
  if(req.user.role === 'SUPER_ADMIN' || String(req.user._id) === String(assetOwnerId)) return next();
  return res.status(403).json({message:'Forbidden'});
};

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Asset from '../models/Asset.js';
import Room from '../models/Room.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  try {
    let configuredUri = process.env.MONGO_URI || '';
    if (!configuredUri) {
      console.error('MONGO_URI is not set. Set it in backend/.env and re-run.');
      process.exit(1);
    }

    // If localhost is used and IPv6 (::1) fails, we'll retry with 127.0.0.1
    const firstUri = configuredUri;
    if (configuredUri.includes('localhost')) {
      configuredUri = configuredUri.replace('localhost', '127.0.0.1');
    }

    console.log('[Seed] Attempting Mongo connection');
    console.log('        Original URI:', firstUri);
    if (firstUri !== configuredUri) {
      console.log('        Using IPv4 fallback URI:', configuredUri);
    }

    try {
      await mongoose.connect(configuredUri, { serverSelectionTimeoutMS: 8000 });
    } catch (err) {
      console.error('[Seed] Initial connect failed:', err.message);
      if (configuredUri !== firstUri) {
        console.error('[Seed] Fallback already applied; not retrying further.');
      }
      throw err;
    }
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Asset.deleteMany({});
    await Room.deleteMany({});

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    });

    const normalUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      role: 'USER'
    });

    const user2 = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: hashedPassword,
      role: 'USER'
    });

    console.log('Users created:', { superAdmin: superAdmin.email, normalUser: normalUser.email, user2: user2.email });

    // Create rooms - COMSATS University Lahore Campus
    const room1 = await Room.create({
      code: 'R001',
      name: 'Conference Room A',
      building: 'N-Block',
      floor: '3',
      latitude: 31.401348623158032,
      longitude: 74.21147276398126,
      description: 'Main conference room with projector and video conferencing',
      roomType: 'MEETING_ROOM',
      capacity: 20
    });

    const room2 = await Room.create({
      code: 'R002',
      name: 'Faculty Office 201',
      building: 'N-Block',
      floor: '2',
      latitude: 31.401348623158032,
      longitude: 74.21147276398126,
      description: 'Faculty office space with workstations',
      roomType: 'OFFICE',
      capacity: 4
    });

    const room3 = await Room.create({
      code: 'R003',
      name: 'Equipment Storage',
      building: 'Faculity Block',
      floor: 'G',
      latitude: 31.402169088552125,
      longitude: 74.2116550836701,
      description: 'Central equipment and lab materials storage',
      roomType: 'STORAGE',
      capacity: 50
    });

    const room4 = await Room.create({
      code: 'R004',
      name: 'Computer Lab 1',
      building: 'Department of Architechture and Design',
      floor: '1',
      latitude: 31.4026269231603,
      longitude: 74.21257687128943,
      description: 'Computer lab with 40 workstations for CS students',
      roomType: 'LAB',
      capacity: 40
    });

    const room5 = await Room.create({
      code: 'R005',
      name: 'Research Lab 2',
      building: 'IPCBM department',
      floor: '3',
      latitude: 31.403111671948068,
      longitude: 74.21225338354726,
      description: 'Advanced research laboratory with specialized equipment',
      roomType: 'LAB',
      capacity: 15
    });

    const room6 = await Room.create({
      code: 'R006',
      name: 'Hostel Common Area',
      building: 'Faculity Hostel',
      floor: '2',
      latitude: 31.40204835795513,
      longitude: 74.21177949180168,
      description: 'Common area in faculty hostel for study and relaxation',
      roomType: 'OFFICE',
      capacity: 200
    });

    console.log('Rooms created:', { room1: room1.name, room2: room2.name, room3: room3.name, room4: room4.name, room5: room5.name, room6: room6.name });

    // Generate QR codes for rooms
    room1.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room1._id,
      code: room1.code,
      timestamp: new Date().toISOString()
    });
    await room1.save();

    room2.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room2._id,
      code: room2.code,
      timestamp: new Date().toISOString()
    });
    await room2.save();

    room3.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room3._id,
      code: room3.code,
      timestamp: new Date().toISOString()
    });
    await room3.save();

    room4.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room4._id,
      code: room4.code,
      timestamp: new Date().toISOString()
    });
    await room4.save();

    room5.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room5._id,
      code: room5.code,
      timestamp: new Date().toISOString()
    });
    await room5.save();

    room6.qrCode = JSON.stringify({
      type: 'ROOM',
      id: room6._id,
      code: room6.code,
      timestamp: new Date().toISOString()
    });
    await room6.save();

    // Create assets - Located at COMSATS University Lahore Campus
    const asset1 = await Asset.create({
      assetTag: 'A001',
      name: 'Laptop Dell XPS 13',
      description: 'High-performance laptop for research work',
      assetType: 'ELECTRONICS',
      status: 'ACTIVE',
      ownerId: normalUser._id,
      roomId: room1._id
    });

    const asset2 = await Asset.create({
      assetTag: 'A002',
      name: 'Office Chair - Executive',
      description: 'Ergonomic office chair for faculty',
      assetType: 'FURNITURE',
      status: 'ACTIVE',
      ownerId: superAdmin._id,
      roomId: room2._id
    });

    const asset3 = await Asset.create({
      assetTag: 'A003',
      name: 'Projector Epson EB-2250U',
      description: 'HD projector for conference presentations',
      assetType: 'ELECTRONICS',
      status: 'ACTIVE',
      ownerId: user2._id,
      roomId: room1._id
    });

    const asset4 = await Asset.create({
      assetTag: 'A004',
      name: 'Office Chair - Standard',
      description: 'Standard office chair with armrests',
      assetType: 'FURNITURE',
      status: 'ACTIVE',
      ownerId: normalUser._id,
      roomId: room2._id
    });

    const asset5 = await Asset.create({
      assetTag: 'A005',
      name: 'Desktop Computer - Workstation',
      description: 'High-spec desktop for computational work',
      assetType: 'ELECTRONICS',
      status: 'ACTIVE',
      ownerId: user2._id,
      roomId: room4._id
    });

    const asset6 = await Asset.create({
      assetTag: 'A006',
      name: 'Digital Microscope',
      description: 'Advanced digital microscope with software for research',
      assetType: 'EQUIPMENT',
      status: 'MAINTENANCE',
      ownerId: user2._id,
      roomId: room5._id
    });

    const asset7 = await Asset.create({
      assetTag: 'A007',
      name: 'Thermal Imaging Camera',
      description: 'FLIR thermal camera for research',
      assetType: 'EQUIPMENT',
      status: 'ACTIVE',
      ownerId: normalUser._id,
      roomId: room5._id
    });

    const asset8 = await Asset.create({
      assetTag: 'A008',
      name: 'Networked Printer HP M436',
      description: 'Multifunction printer for office use',
      assetType: 'ELECTRONICS',
      status: 'ACTIVE',
      ownerId: superAdmin._id,
      roomId: room1._id
    });

    const asset9 = await Asset.create({
      assetTag: 'A009',
      name: 'Conference Table - Large',
      description: 'Large wooden conference table for meetings',
      assetType: 'FURNITURE',
      status: 'ACTIVE',
      ownerId: superAdmin._id,
      roomId: room1._id
    });

    const asset10 = await Asset.create({
      assetTag: 'A010',
      name: 'LED Desk Lamp',
      description: 'Energy-efficient desk lamp with USB charging',
      assetType: 'FURNITURE',
      status: 'ACTIVE',
      ownerId: normalUser._id,
      roomId: room2._id
    });

    console.log('Assets created:', { 
      asset1: asset1.name, 
      asset2: asset2.name, 
      asset3: asset3.name,
      asset4: asset4.name,
      asset5: asset5.name,
      asset6: asset6.name,
      asset7: asset7.name,
      asset8: asset8.name,
      asset9: asset9.name,
      asset10: asset10.name
    });

    // Generate QR codes for assets
    asset1.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset1._id,
      tag: asset1.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset1.save();

    asset2.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset2._id,
      tag: asset2.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset2.save();

    asset3.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset3._id,
      tag: asset3.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset3.save();

    asset4.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset4._id,
      tag: asset4.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset4.save();

    asset5.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset5._id,
      tag: asset5.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset5.save();

    asset6.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset6._id,
      tag: asset6.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset6.save();

    asset7.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset7._id,
      tag: asset7.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset7.save();

    asset8.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset8._id,
      tag: asset8.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset8.save();

    asset9.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset9._id,
      tag: asset9.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset9.save();

    asset10.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset10._id,
      tag: asset10.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset10.save();

    console.log('✅ Seed data created successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Super Admin: admin@example.com / password123');
    console.log('Normal User: john@example.com / password123');
    console.log('Normal User: jane@example.com / password123');
    console.log('\n🏛️ Campus Buildings:');
    console.log('📍 N-Block: 31.401348623158032, 74.21147276398126');
    console.log('📍 Faculity Block: 31.402169088552125, 74.2116550836701');
    console.log('📍 Faculity Hostel: 31.40204835795513, 74.21177949180168');
    console.log('📍 Department of Architechture and Design: 31.4026269231603, 74.21257687128943');
    console.log('📍 IPCBM department: 31.403111671948068, 74.21225338354726');
    console.log('\n🏢 Rooms Created: 6 rooms with precise coordinates');
    console.log('📦 Assets Created: 10 assets (laptops, computers, furniture, chairs) with QR codes');
    console.log('\n🎉 You can now test the app with this dummy data!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

run();
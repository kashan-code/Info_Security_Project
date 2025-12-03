// server/registerUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function registerUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-messaging', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    
    // Clear existing test users
    await User.deleteMany({ 
      $or: [
        { username: 'alice' },
        { username: 'bob' },
        { username: 'user1' },
        { username: 'user2' }
      ] 
    });
    
    // Register Alice
    const salt1 = await bcrypt.genSalt(12);
    const hashedPassword1 = await bcrypt.hash('password123', salt1);
    
    const alice = await User.create({
      username: 'alice',
      email: 'alice@test.com',
      password: hashedPassword1,
    });
    
    // Register Bob
    const salt2 = await bcrypt.genSalt(12);
    const hashedPassword2 = await bcrypt.hash('password123', salt2);
    
    const bob = await User.create({
      username: 'bob',
      email: 'bob@test.com',
      password: hashedPassword2,
    });
    
    console.log('\n✅ Users created successfully:');
    console.log('\nAlice:');
    console.log('  ID:', alice._id);
    console.log('  Username:', alice.username);
    console.log('  Email:', alice.email);
    
    console.log('\nBob:');
    console.log('  ID:', bob._id);
    console.log('  Username:', bob.username);
    console.log('  Email:', bob.email);
    
    console.log('\n🔐 Passwords: "password123" for both');
    console.log('\n📋 Copy these IDs for key exchange:');
    console.log('Alice ID:', alice._id.toString());
    console.log('Bob ID:', bob._id.toString());
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

registerUsers();
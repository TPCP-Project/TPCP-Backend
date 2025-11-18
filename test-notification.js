/**
 * Script kiểm tra notification system
 * Chạy: node test-notification.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AdminNotification = require('./src/models/adminNotification');
const Customer = require('./src/models/Customer');
const User = require('./src/models/user');

async function testNotificationSystem() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tpcp');
    console.log('✅ Connected to MongoDB\n');

    // 1. Check AdminNotification model
    console.log('1️⃣ Checking AdminNotification collection...');
    const notificationCount = await AdminNotification.countDocuments();
    console.log(`   Total AdminNotifications: ${notificationCount}`);

    const recentNotifications = await AdminNotification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('relatedUser', 'name email')
      .lean();

    console.log(`   Recent notifications (last 5):`);
    recentNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. [${notif.type}] ${notif.title}`);
      console.log(`      Created: ${notif.createdAt}`);
      console.log(`      User: ${notif.relatedUser?.name || 'N/A'} (${notif.relatedUser?.email || 'N/A'})`);
      console.log(`      Read: ${notif.isRead ? 'Yes' : 'No'}`);
    });

    // 2. Check recent purchases
    console.log('\n2️⃣ Checking recent Customers (purchases)...');
    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('ownerId', 'name email')
      .lean();

    console.log(`   Total customers: ${await Customer.countDocuments()}`);
    console.log(`   Recent customers (last 5):`);
    recentCustomers.forEach((customer, index) => {
      console.log(`   ${index + 1}. ${customer.businessName || customer.email}`);
      console.log(`      Plan: ${customer.subscriptionPlan}`);
      console.log(`      Status: ${customer.subscriptionStatus}`);
      console.log(`      Amount: ${customer.paymentInfo?.amount || 'N/A'} VND`);
      console.log(`      Created: ${customer.createdAt}`);
      console.log(`      User: ${customer.ownerId?.name || 'N/A'} (${customer.ownerId?.email || 'N/A'})`);
    });

    // 3. Check admin users
    console.log('\n3️⃣ Checking admin users...');
    const adminUsers = await User.find({ role: 'admin' }).select('name email role').lean();
    console.log(`   Total admin users: ${adminUsers.length}`);
    adminUsers.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.name} (${admin.email})`);
    });

    // 4. Test creating a notification manually
    console.log('\n4️⃣ Testing notification creation...');

    const latestCustomer = recentCustomers[0];
    if (!latestCustomer) {
      console.log('   ⚠️  No customer found to test with');
    } else {
      console.log(`   Creating test notification for customer: ${latestCustomer.businessName || latestCustomer.email}`);

      const testNotification = new AdminNotification({
        type: 'new_purchase',
        title: `[TEST] Gói Pro mới: ${latestCustomer.businessName || 'Test User'}`,
        message: `This is a test notification created at ${new Date().toLocaleString('vi-VN')}`,
        relatedUser: latestCustomer.ownerId,
        relatedPurchase: latestCustomer._id,
        data: {
          userName: latestCustomer.ownerId?.name || 'Test User',
          userEmail: latestCustomer.ownerId?.email || 'test@example.com',
          amount: latestCustomer.paymentInfo?.amount || 1500000,
          transactionNo: latestCustomer.paymentInfo?.transactionNo || 'TEST_TXN',
          paymentMethod: 'vnpay',
          planName: 'pro',
          expiresAt: latestCustomer.subscriptionExpiresAt,
          isTest: true,
        },
      });

      await testNotification.save();
      console.log(`   ✅ Test notification created: ${testNotification._id}`);
      console.log(`   You should see this in /dashboard/admin/notifications`);
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart backend server: npm start');
    console.log('   2. Check backend console logs when making a purchase');
    console.log('   3. Verify Socket.IO connection in browser console');
    console.log('   4. Make a new test purchase to trigger notification');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testNotificationSystem();

/**
 * Migration script: Rename language -> user_language and timezone -> user_timezone
 * Run this script once to migrate existing profiles
 *
 * Usage: node migrate-profile-fields.js
 */

require("dotenv/config");
const mongoose = require("mongoose");

async function migrateProfiles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const profilesCollection = db.collection("profiles");

    // Update all documents: rename fields
    const result = await profilesCollection.updateMany(
      {},
      {
        $rename: {
          language: "user_language",
          timezone: "user_timezone",
        },
      }
    );

    console.log(`✅ Migration completed!`);
    console.log(`   - Matched: ${result.matchedCount} documents`);
    console.log(`   - Modified: ${result.modifiedCount} documents`);

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateProfiles();

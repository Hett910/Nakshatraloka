const mongoose = require('mongoose');;
const db = mongoose.connection;

const URL = process.env.URL || 'mongodb://localhost:27017/Nakshatraloka';

mongoose.connect(URL)
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
})
.catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1); // Exit if DB fails in production
});


db.on('open', () => {
    console.log('✅ Databse Is Open')
})

db.on("error", (err) => {
  console.log(err);
});

db.on("close", () => {
  console.log("Database is closing...");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit();
});
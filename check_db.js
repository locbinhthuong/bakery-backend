require('dotenv').config();
const mongoose = require('mongoose');
const ShopProduct = require('./models/ShopProduct');
const ShopPromo = require('./models/ShopPromo');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://locnguyen100220:HlX0B0k5lZ08qJjM@cluster0.z5m5xku.mongodb.net/lns');
    console.log("Connected to MongoDB");
    const products = await ShopProduct.find();
    console.log("Products:", products);
    const promos = await ShopPromo.find();
    console.log("Promos:", promos);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();

require('dotenv').config();
const mongoose = require('mongoose');
require('./models/ShopPromo');

mongoose.connect(process.env.MONGO_URI).then(() => {
  mongoose.model('ShopPromo').updateMany(
    { code: 'freeship' }, 
    { $set: { discountType: 'FREESHIP' } }
  ).then(r => console.log(r)).then(() => process.exit(0));
});

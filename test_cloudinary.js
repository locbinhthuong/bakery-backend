const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'diwioucg8',
  api_key: '845651236621476',
  api_secret: 'rDA5YV4xfAym9qKhwTrGagIY8aA'
});

async function testUpload() {
  const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wQAAwAB/AL+f4R4AAAAAElFTkSuQmCC";
  try {
    const result = await cloudinary.uploader.upload(base64Image, { folder: 'bakery_uploads' });
    console.log("SUCCESS! URL:", result.secure_url);
  } catch (error) {
    console.error("FAILED! Error:", error);
  }
}

testUpload();

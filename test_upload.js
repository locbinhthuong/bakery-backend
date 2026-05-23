const axios = require('axios');

async function testUpload() {
  const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wQAAwAB/AL+f4R4AAAAAElFTkSuQmCC";
  try {
    const res = await axios.post('https://bakery-backend-six.vercel.app/api/shop/admin/upload', {
      image: base64Image
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error status:", err.response ? err.response.status : err.message);
    console.error("Error data:", err.response ? err.response.data : 'No data');
  }
}

testUpload();

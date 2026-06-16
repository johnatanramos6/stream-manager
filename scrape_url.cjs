const https = require('https');

const url = 'https://upload.wikimedia.org/wikipedia/commons/9/90/Prime_Video_logo_%282024%29.svg';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

https.get(url, options, (res) => {
  console.log('Status Code of SVG:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (err) => {
  console.error(err);
});

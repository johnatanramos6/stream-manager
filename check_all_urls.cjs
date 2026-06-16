const https = require('https');

const urls = {
  netflix: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Netflix-new-icon.png',
  amazon: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Prime_Video_logo_%282024%29.svg',
  claro: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Claro_logo.svg',
  paramount: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount%2B_logo.svg',
  max: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Max_logo.svg',
  disney: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
  crunchyroll: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Crunchyroll_logo.svg',
  spotify: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  plex: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Plex_logo_%282022%29.svg',
  vix: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/ViX_logo.svg',
  canva: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg',
  capcut: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/CapCut_logo.svg',
  microsoft: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg',
  chatgpt: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
  apple: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_logo.svg',
  megatv: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Mega_Televisi%C3%B3n_logo.svg',
  youtube: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_play_button_icon_%282013%E2%80%932017%29.svg'
};

const keys = Object.keys(urls);
let index = 0;

function checkNext() {
  if (index >= keys.length) {
    console.log('--- ALL URL CHECKS DONE ---');
    return;
  }
  const name = keys[index];
  const url = urls[name];
  
  const options = {
    method: 'HEAD',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  };

  const req = https.request(url, options, (res) => {
    console.log(`${name}: ${res.statusCode} (${url})`);
    index++;
    checkNext();
  });

  req.on('error', (e) => {
    console.error(`Error on ${name}:`, e.message);
    index++;
    checkNext();
  });

  req.end();
}

checkNext();

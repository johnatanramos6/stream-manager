const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/johna/.gemini/antigravity/brain/3cce7251-aa12-44ca-a662-9dd52b9b51d7/.system_generated/logs/transcript.jsonl')
});

rl.on('line', (line) => {
  if (line.includes('PlatformLogo.tsx') && line.includes('amazon')) {
    try {
      const parsed = JSON.parse(line);
      console.log('--- FOUND AMAZON IN PlatformLogo.tsx EDIT ---');
      console.log(parsed.content);
      console.log('---------------------------------------------');
    } catch (e) {
      // Ignored
    }
  }
});

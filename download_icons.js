import fs from 'fs';
import https from 'https';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  try {
    await downloadFile('https://placehold.co/192x192/10b981/ffffff.png?text=CA', 'public/pwa-192x192.png');
    await downloadFile('https://placehold.co/512x512/10b981/ffffff.png?text=CA', 'public/pwa-512x512.png');
    console.log('Downloaded icons');
  } catch (err) {
    console.error(err);
  }
})();

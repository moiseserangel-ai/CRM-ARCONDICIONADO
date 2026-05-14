import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (file: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, callback);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      callback(fullPath);
    }
  }
}

walk('src', (file: string) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/rounded-\[40px\]/g, 'rounded-3xl');
  content = content.replace(/rounded-\[28px\]/g, 'rounded-2xl');
  fs.writeFileSync(file, content, 'utf8');
});

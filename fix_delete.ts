import fs from 'fs';
import path from 'path';

const dir = './src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const newContent = content.replace(/===\s*payload\.old\.id/g, '!== payload.old.id');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed ${file}`);
  }
}

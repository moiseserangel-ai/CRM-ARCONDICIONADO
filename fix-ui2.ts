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

  // Fix custom text classes combinations that were missed
  content = content.replace(/text-\[10px\] font-extrabold uppercase tracking-\[0\.2em\]/g, 'text-xs font-bold uppercase tracking-wider');
  content = content.replace(/text-\[10px\] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter/g, 'text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wide');
  content = content.replace(/text-\[10px\] font-extrabold mb-1 uppercase tracking-widest/g, 'text-xs font-bold mb-1 uppercase tracking-wider');
  content = content.replace(/text-\[10px\] text-secondary font-bold uppercase tracking-widest/g, 'text-xs text-secondary font-semibold uppercase tracking-wider');
  content = content.replace(/text-\[10px\] font-bold text-secondary uppercase tracking-widest/g, 'text-xs font-semibold text-secondary uppercase tracking-wider');
  content = content.replace(/text-\[10px\] font-extrabold text-secondary uppercase tracking-\[0\.15em\]/g, 'text-xs font-bold text-secondary uppercase tracking-wider');
  content = content.replace(/text-\[10px\] text-secondary font-medium uppercase tracking-tighter/g, 'text-xs text-secondary font-medium uppercase tracking-wide');
  content = content.replace(/text-\[10px\] font-extrabold text-secondary uppercase tracking-widest/g, 'text-xs font-bold text-secondary uppercase tracking-wider');
  
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-xs'); // Let's simplify and make all tiny text at least text-xs
  
  content = content.replace(/rounded-\[48px\]/g, 'rounded-3xl');
  content = content.replace(/rounded-\[32px\]/g, 'rounded-2xl');
  content = content.replace(/rounded-\[24px\]/g, 'rounded-xl');
  content = content.replace(/rounded-\[16px\]/g, 'rounded-xl');
  
  // Make extrabold -> bold
  content = content.replace(/font-extrabold/g, 'font-bold');

  fs.writeFileSync(file, content, 'utf8');
});

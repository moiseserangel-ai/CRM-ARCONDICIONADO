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

walk('src/components', (file: string) => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/rounded-\[32px\]/g, 'rounded-2xl');
  content = content.replace(/rounded-\[24px\]/g, 'rounded-xl');
  content = content.replace(/rounded-\[16px\]/g, 'rounded-xl');
  content = content.replace(/border-outline-variant\/5([ "]|hover:)/g, 'border-outline-variant/20$1');
  
  content = content.replace(/text-\[10px\] font-black uppercase tracking-widest/g, 'text-[11px] font-bold uppercase tracking-wider');
  content = content.replace(/text-\[10px\] font-black uppercase tracking-\[0\.2em\]/g, 'text-[11px] font-bold uppercase tracking-wider');
  content = content.replace(/text-\[10px\] font-black uppercase tracking-tighter/g, 'text-[11px] font-bold uppercase tracking-wide');
  content = content.replace(/text-\[9px\] font-black uppercase tracking-widest/g, 'text-[11px] font-bold uppercase tracking-wider');
  content = content.replace(/text-\[9px\] font-bold text-secondary\/60 uppercase tracking-tighter/g, 'text-[11px] font-medium text-secondary uppercase tracking-wider');
  content = content.replace(/text-\[11px\] font-black text-on-surface uppercase tracking-widest/g, 'text-xs font-bold text-on-surface uppercase tracking-wider');
  content = content.replace(/text-\[11px\] font-black uppercase tracking-widest/g, 'text-xs font-bold uppercase tracking-wider');
  
  content = content.replace(/font-black/g, 'font-extrabold'); 
  
  content = content.replace(/p-8 rounded-2xl/g, 'p-6 rounded-2xl');
  content = content.replace(/p-7 rounded-2xl/g, 'p-6 rounded-2xl');

  fs.writeFileSync(file, content, 'utf8');
});

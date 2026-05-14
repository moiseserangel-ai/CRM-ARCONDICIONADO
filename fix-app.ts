import * as fs from 'fs';
import * as path from 'path';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Shapes & borders
content = content.replace(/rounded-\[48px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[32px\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[24px\]/g, 'rounded-xl');
content = content.replace(/rounded-\[16px\]/g, 'rounded-xl');
content = content.replace(/border-outline-variant\/5([ "]|hover:)/g, 'border-outline-variant/20$1');

// Typography
content = content.replace(/text-\[10px\] font-black uppercase tracking-widest/g, 'text-[11px] font-bold uppercase tracking-wider');
content = content.replace(/text-\[10px\] font-black uppercase tracking-\[0\.2em\]/g, 'text-[11px] font-bold uppercase tracking-wider');
content = content.replace(/text-\[10px\] font-black uppercase tracking-tighter/g, 'text-[11px] font-bold uppercase tracking-wide');
content = content.replace(/text-\[9px\] font-black uppercase tracking-widest/g, 'text-[11px] font-bold uppercase tracking-wider');
content = content.replace(/text-\[9px\] font-bold text-secondary\/60 uppercase tracking-tighter/g, 'text-[11px] font-medium text-secondary uppercase tracking-wider');
content = content.replace(/text-\[11px\] font-black text-on-surface uppercase tracking-widest/g, 'text-xs font-bold text-on-surface uppercase tracking-wider');
content = content.replace(/text-\[11px\] font-black uppercase tracking-widest/g, 'text-xs font-bold uppercase tracking-wider');

content = content.replace(/font-black/g, 'font-extrabold'); 

fs.writeFileSync('src/App.tsx', content, 'utf8');

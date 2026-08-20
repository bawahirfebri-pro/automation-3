export function formatTeksResmi(str: string): string {
  if (!str) return '';
  let teks = str.trim();

  teks = teks.replace(/\bistri\b/gi, 'Isteri');
  teks = teks.replace(/\b(tidak|blm|belum)\s*\/\s*(tidak|blm|belum)\b/gi, 'Belum/Tidak');
  teks = teks.replace(/\btidak\/blm\b/gi, 'Belum/Tidak');

  teks = teks.replace(/\b(jl|gg|komp|no|h)\.?\b/gi, (match) => {
    const lower = match.toLowerCase();
    if (lower.startsWith('jl')) return 'Jl.';
    if (lower.startsWith('gg')) return 'Gg.';
    if (lower.startsWith('komp')) return 'Komp.';
    if (lower.startsWith('no')) return 'No.';
    if (lower.startsWith('h')) return 'H.';
    return match;
  });

  teks = teks.replace(/\.([a-zA-Z0-9])/g, '. $1');
  teks = teks.replace(/\s*\.{2,}\s*/g, '. ');
  teks = teks.replace(/\.\s+\./g, '.');

  let words = teks.toLowerCase().split(' ');
  words = words.map(word => {
    let parts = word.split('/');
    parts = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1));
    return parts.join('/');
  });

  let hasil = words.join(' ');

  hasil = hasil.replace(/\bTidak tahu\b/gi, 'Tidak Tahu');
  
  hasil = hasil.replace(/\b(rt|rw)[\s\.]*(\d+)/gi, (match, p1, p2) => `${p1.toUpperCase()} ${p2}`);
  hasil = hasil.replace(/\b(rt|rw)\b/gi, match => match.toUpperCase());
  
  hasil = hasil.replace(/\bRs\b/g, 'RS');

  const singkatan = ['Dki', 'Sd', 'Smp', 'Sma', 'Smk', 'Slta', 'Sltp', 'Mi', 'Mts', 'Ma', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'];
  singkatan.forEach(s => {
    const regex = new RegExp(`\\b${s}\\b`, 'g');
    const pengganti = s === 'Mts' ? 'MTs' : s.toUpperCase();
    hasil = hasil.replace(regex, pengganti);
  });

  const romawi = ['I', 'Ii', 'Iii', 'Iv', 'V', 'Vi', 'Vii', 'Viii', 'Ix', 'X', 'Xi', 'Xii'];
  romawi.forEach(r => {
    const regex = new RegExp(`\\b${r}\\b`, 'g');
    hasil = hasil.replace(regex, r.toUpperCase());
  });

  return hasil;
}
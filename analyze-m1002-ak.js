const fs = require('fs');
const content = fs.readFileSync('test-files/dstv/M1002.nc', 'utf8');
console.log('=== M1002.nc AK blocks analysis ===');
const lines = content.split('\n').map(line => line.trim()).filter(line => line);
let inAK = false;
let akBlock = 1;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line === 'AK') {
    console.log(`\nAK Block ${akBlock++}:`);
    inAK = true;
    continue;
  }
  if (inAK) {
    if (line === 'BO' || line === 'SI' || line === 'EN' || line.includes('END')) {
      inAK = false;
      continue;
    }
    if (line.startsWith('o ') || line.startsWith('v ') || line.startsWith('u ')) {
      const parts = line.split(/\s+/);
      console.log(`  ${line} -> Prefix: ${parts[0]}, Values: [${parts.slice(1).join(', ')}]`);
      
      // Parse coordinates
      if (parts.length >= 4) {
        const x = parts[1].replace('u', '');
        const y = parts[2];
        const z = parts[3];
        console.log(`    Coordinates: x=${x}, y=${y}, z=${z}`);
      }
    }
  }
}
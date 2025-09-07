// Analyze M1002.nc features
const fs = require('fs');

const content = fs.readFileSync('test-files/dstv/M1002.nc', 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l);

console.log('=== M1002.nc Feature Analysis ===');
console.log('Total lines:', lines.length);

let akCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line === 'AK') {
    akCount++;
    console.log(`\nAK Block ${akCount}:`);
    const points = [];
    let j = i + 1;
    while (j < lines.length && !lines[j].match(/^(AK|BO|SI|EN)$/)) {
      if (lines[j].includes('u')) {
        const parts = lines[j].split(/\s+/);
        const x = parseFloat(parts[1].replace('u', ''));
        const y = parseFloat(parts[2]);
        points.push([x, y]);
        console.log(`  Point: x=${x}, y=${y}`);
      }
      j++;
    }
    console.log(`  Total points: ${points.length}`);
    
    if (points.length === 9) {
      console.log('  -> PARTIAL NOTCH PATTERN DETECTED (9 points)');
      console.log('  -> This should use processPartialNotches() in old CutProcessor');
    } else if (points.length === 5) {
      console.log('  -> RECTANGULAR PATTERN (5 points)');
    }
    
    // Check if it's the problematic pattern from M1002
    if (points.length === 9) {
      const bounds = {
        minX: Math.min(...points.map(p => p[0])),
        maxX: Math.max(...points.map(p => p[0])),
        minY: Math.min(...points.map(p => p[1])),
        maxY: Math.max(...points.map(p => p[1]))
      };
      console.log(`  Bounds: X[${bounds.minX}, ${bounds.maxX}] Y[${bounds.minY}, ${bounds.maxY}]`);
      
      // Check extension pattern (like isPartialNotchPattern)
      const profileLength = 1912.15; // From ST block
      const hasExtension = bounds.maxX > profileLength + 1;
      console.log(`  Profile length: ${profileLength}, Has extension: ${hasExtension}`);
      
      if (hasExtension) {
        console.log('  -> MATCHES isPartialNotchPattern() criteria');
        console.log('  -> Should trigger processPartialNotches() method');
      }
    }
  }
}
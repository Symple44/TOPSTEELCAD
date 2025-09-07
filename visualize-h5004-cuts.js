/**
 * Visualisation ASCII des coupes du fichier h5004.nc1
 * Représentation 2D des contours AK
 */

console.log('='.repeat(80));
console.log('VISUALISATION 2D des COUPES - h5004.nc1');
console.log('='.repeat(80));

// Données extraites de l'analyse
const stData = {
    totalLength: 2259.98,
    width: 50.80,
    profile: "HSS51×51×4.8",
    offset: { x: -29.202, y: 60.798 }
};

const akBlocks = [
    {
        face: 'v',
        points: [
            { x: 0.00, y: 0.00 },
            { x: 2259.98, y: 0.00 },
            { x: 2169.09, y: 50.80 },
            { x: 28.39, y: 50.80 },
            { x: 0.00, y: 0.00 }
        ]
    },
    {
        face: 'o', 
        points: [
            { x: 25.72, y: 0.00 },
            { x: 25.72, y: 50.80 },
            { x: 2177.64, y: 50.80 },
            { x: 2177.64, y: 0.00 },
            { x: 25.72, y: 0.00 }
        ]
    }
];

function drawProfile(title, contourPoints, showCuts = false) {
    console.log(`\n${title}`);
    console.log('-'.repeat(60));
    
    // Échelle pour l'affichage (1 char = 50mm environ)
    const scale = 50;
    const width = Math.ceil(stData.totalLength / scale);
    const height = 6;
    
    // Créer la grille
    let grid = Array(height).fill().map(() => Array(width + 10).fill(' '));
    
    // Dessiner le contour de référence (rectangle complet)
    for (let x = 0; x < width; x++) {
        grid[0][x] = '─';
        grid[height-1][x] = '─';
    }
    for (let y = 0; y < height; y++) {
        grid[y][0] = '│';
        grid[y][width-1] = '│';
    }
    
    // Coins
    grid[0][0] = '┌';
    grid[0][width-1] = '┐';
    grid[height-1][0] = '└';
    grid[height-1][width-1] = '┘';
    
    // Marquer les zones de coupe si demandé
    if (showCuts && contourPoints) {
        const xValues = contourPoints.map(p => p.x);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        
        // Zone coupée au début
        if (minX > 0) {
            const cutStart = 0;
            const cutEnd = Math.floor(minX / scale);
            for (let x = cutStart; x <= cutEnd && x < width; x++) {
                for (let y = 1; y < height-1; y++) {
                    grid[y][x] = '░'; // Zone coupée
                }
            }
        }
        
        // Zone coupée à la fin
        if (maxX < stData.totalLength) {
            const cutStart = Math.floor(maxX / scale);
            const cutEnd = width - 1;
            for (let x = cutStart; x <= cutEnd && x < width; x++) {
                for (let y = 1; y < height-1; y++) {
                    grid[y][x] = '░'; // Zone coupée
                }
            }
        }
        
        // Marquer les contours exacts
        for (let i = 0; i < contourPoints.length - 1; i++) {
            const x = Math.floor(contourPoints[i].x / scale);
            const y = contourPoints[i].y > 25 ? 1 : height-2;
            if (x >= 0 && x < width && y >= 0 && y < height) {
                grid[y][x] = '●';
            }
        }
    }
    
    // Afficher la grille
    for (let y = 0; y < height; y++) {
        console.log('  ' + grid[y].join(''));
    }
    
    // Légende des coordonnées
    console.log('  ' + '0'.padEnd(10) + '500mm'.padEnd(10) + '1000mm'.padEnd(10) + '1500mm'.padEnd(10) + '2000mm'.padEnd(10) + '2259.98mm');
    console.log('  ' + '│'.padEnd(10) + '│'.padEnd(10) + '│'.padEnd(10) + '│'.padEnd(10) + '│'.padEnd(10) + '│');
}

// Visualiser le profil complet
console.log(`\n📐 PROFIL COMPLET (${stData.profile}):`);
drawProfile("Rectangle de référence - 2259.98mm × 50.80mm", null, false);

// Visualiser les contours AK
console.log(`\n✂️  CONTOURS AK avec COUPES:`);

akBlocks.forEach((ak, index) => {
    console.log(`\n--- AK #${index + 1} (Face ${ak.face.toUpperCase()}) ---`);
    
    if (ak.face === 'v') {
        console.log("Face V (Vorderseite) = ÂME du profil - Vue de face");
    } else if (ak.face === 'o') {
        console.log("Face O (Oben) = DESSUS du profil - Vue du dessus");
    }
    
    drawProfile(`Contour face ${ak.face}`, ak.points, true);
    
    // Analyser les coupes pour cette face
    const xValues = ak.points.map(p => p.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    
    console.log(`\nAnalyse détaillée:`);
    console.log(`• Points du contour: ${ak.points.length}`);
    console.log(`• Étendue X: ${minX.toFixed(2)} → ${maxX.toFixed(2)} mm`);
    
    if (minX > 0) {
        console.log(`• COUPE DÉBUT: 0 → ${minX.toFixed(2)} mm (${minX.toFixed(2)} mm à retirer)`);
    }
    if (maxX < stData.totalLength) {
        console.log(`• COUPE FIN: ${maxX.toFixed(2)} → ${stData.totalLength} mm (${(stData.totalLength - maxX).toFixed(2)} mm à retirer)`);
    }
    
    const remainingLength = maxX - minX;
    console.log(`• Longueur FINALE: ${remainingLength.toFixed(2)} mm`);
});

// Synthèse comparative
console.log(`\n📊 SYNTHÈSE COMPARATIVE:`);
console.log('='.repeat(50));

const ak1 = akBlocks[0]; // Face v
const ak2 = akBlocks[1]; // Face o

const ak1_minX = Math.min(...ak1.points.map(p => p.x));
const ak1_maxX = Math.max(...ak1.points.map(p => p.x));
const ak2_minX = Math.min(...ak2.points.map(p => p.x));
const ak2_maxX = Math.max(...ak2.points.map(p => p.x));

console.log(`\nFace V (âme):`);
console.log(`  └─ Contour: ${ak1_minX} → ${ak1_maxX} mm`);
console.log(`  └─ Coupe: ${ak1_minX > 0 ? 'OUI (début)' : 'NON'} | ${ak1_maxX < stData.totalLength ? 'OUI (fin)' : 'NON'}`);

console.log(`\nFace O (dessus):`);
console.log(`  └─ Contour: ${ak2_minX} → ${ak2_maxX} mm`);
console.log(`  └─ Coupe: ${ak2_minX > 0 ? 'OUI (début)' : 'NON'} | ${ak2_maxX < stData.totalLength ? 'OUI (fin)' : 'NON'}`);

console.log(`\n🎯 INTERPRÉTATION FINALE:`);
console.log(`
╭─ FACE V (âme/vorderseite) ─────────────────────────────────────╮
│ • Contour COMPLET de 0 à 2259.98 mm                           │
│ • AUCUNE coupe - profil intact sur cette face                 │
│ • Forme complexe avec angles (points à 28.39 et 2169.09)      │
╰────────────────────────────────────────────────────────────────╯

╭─ FACE O (dessus/oben) ─────────────────────────────────────────╮
│ • Contour RÉDUIT de 25.72 à 2177.64 mm                        │
│ • COUPES aux deux extrémités:                                 │
│   ├─ Début: 25.72 mm à retirer                                │
│   └─ Fin: 82.34 mm à retirer                                  │
│ • Longueur finale: 2151.92 mm                                 │
╰────────────────────────────────────────────────────────────────╯
`);

console.log(`\n💡 SELON LA NORME DSTV:`);
console.log(`• AK = "Aussenkontur" (contour extérieur)`);
console.log(`• Chaque bloc AK définit le contour visible sur UNE face`);
console.log(`• Face 'v' = vue de face (âme) - AUCUNE coupe`);
console.log(`• Face 'o' = vue du dessus - COUPES aux deux bouts`);
console.log(`• Les valeurs (-29.202, 60.798) positionnent l'origine de la pièce`);

console.log(`\n✅ RÉPONSES AUX QUESTIONS:`);
console.log(`1. Longueur totale: 2259.98 mm`);
console.log(`2. Nombre de coupes: 2 (début + fin sur face dessus uniquement)`);
console.log(`3. Zone réelle AK1: 0→2259.98mm (face v, pas de coupe)`);
console.log(`   Zone réelle AK2: 25.72→2177.64mm (face o, coupes)`);
console.log(`4. Valeurs négatives: positionnement système coordonnées machine`);

console.log(`\n${'='.repeat(80)}`);
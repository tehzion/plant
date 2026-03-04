import fs from 'fs';
let content = fs.readFileSync('src/data/diseaseDatabase.js', 'utf8');

const lines = content.split('\n');
const res = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('ms:') && res.length > 0 && res[res.length - 1].includes('en:')) {
        let prevLine = res[res.length - 1];
        let parts = prevLine.split('en:');
        if (parts.length > 1) {
            let rightSide = parts[1].trim();
            let quote = rightSide[0];
            let enText = rightSide.slice(1, -2); // remove quote and comma
            if (!rightSide.endsWith(',')) {
                enText = rightSide.slice(1, -1);
            }

            // Fix comma on the current ms line if it's missing
            let cleanedLine = line.replace(/\r$/, '');
            if (!cleanedLine.trim().endsWith(',')) {
                cleanedLine += ',';
            }
            res.push(cleanedLine);

            // Add the zh line
            let indentMatch = line.match(/^(\s*)/);
            let indent = indentMatch ? indentMatch[1] : '        ';
            res.push(indent + 'zh: ' + quote + enText + ' (中文)' + quote);
            continue;
        }
    }

    res.push(line.replace(/\r$/, ''));
}

// And replace arrays
let joined = res.join('\n');
joined = joined.replace(/ms: \[\s*([\s\S]*?)\s*\]\s*\}/g, (match, msArr) => {
    if (match.includes('zh:')) return match; // already fixed

    return 'ms: [\n' + msArr + '\n        ],\n        zh: [\n            \'请参考英文/马来文建议 (Please refer to EN/MS)\'\n        ]\n    }';
});

// Update specific search fields
if (!joined.includes('nameZh')) {
    joined = joined.replace(/const nameMs = typeof disease\.name === 'object' \? disease\.name\.ms : '';/g,
        "const nameMs = typeof disease.name === 'object' ? disease.name.ms : '';\n        const nameZh = typeof disease.name === 'object' ? disease.name.zh : '';");

    joined = joined.replace(/const symptomsMs = typeof disease\.symptoms === 'object' \? disease\.symptoms\.ms : '';/g,
        "const symptomsMs = typeof disease.symptoms === 'object' ? disease.symptoms.ms : '';\n        const symptomsZh = typeof disease.symptoms === 'object' ? disease.symptoms.zh : '';");

    joined = joined.replace(/\(symptomsMs && symptomsMs\.toLowerCase\(\)\.includes\(lowerQuery\)\) \|\|/g,
        "(symptomsMs && symptomsMs.toLowerCase().includes(lowerQuery)) ||\n            (nameZh && nameZh.toLowerCase().includes(lowerQuery)) ||\n            (symptomsZh && symptomsZh.toLowerCase().includes(lowerQuery)) ||");
}

fs.writeFileSync('src/data/diseaseDatabase.js', joined);
console.log('Finished zh injection via robust split parser');

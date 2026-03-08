import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NODE_MODULES = path.join(ROOT, 'node_modules');

// Replicate the normWin from the patched file
function normWin(p) {
    if (process.platform !== 'win32') return p;
    const prefix = String.fromCharCode(0x5c, 0x5c, 0x3f, 0x5c); // \\?\
    if (p.startsWith(prefix)) return p;
    return prefix + p.replace(/\//g, '\\');
}

// Read the actual normWin from the bundle script and test it
const scriptContent = fs.readFileSync(path.join(ROOT, 'scripts', 'bundle-openclaw.mjs'), 'utf8');
const prefixMatch = scriptContent.match(/const prefix = '(.+?)'/);
if (prefixMatch) {
    const sourceVal = prefixMatch[1];
    // Simulate what the JS engine does with this source
    const runtimeVal = eval(`'${sourceVal}'`);
    console.log('Script prefix runtime value:', runtimeVal.length, 'chars');
    console.log('Script prefix runtime chars:', [...runtimeVal].map(c => '0x' + c.charCodeAt(0).toString(16)));

    // Test it
    const testPath = runtimeVal + path.join(ROOT, 'node_modules');
    console.log('existsSync with script prefix:', fs.existsSync(testPath));
}

// Now replicate the BFS logic
const openclawLink = path.join(NODE_MODULES, 'openclaw');
const openclawReal = fs.realpathSync(openclawLink);
console.log('\nopenclaw real:', openclawReal);

function getVirtualStoreNodeModules(realPkgPath) {
    let dir = realPkgPath;
    while (dir !== path.dirname(dir)) {
        if (path.basename(dir) === 'node_modules') return dir;
        dir = path.dirname(dir);
    }
    return null;
}

const openclawVirtualNM = getVirtualStoreNodeModules(openclawReal);
console.log('Virtual NM:', openclawVirtualNM);

// Test normWin on the virtual NM dir
const normDir = normWin(openclawVirtualNM);
console.log('\nnormWin result:', normDir);
console.log('normWin exists:', fs.existsSync(normDir));
console.log('raw exists:', fs.existsSync(openclawVirtualNM));

// Now test listPackages with the actual script normWin
function listPackages(nodeModulesDir) {
    const result = [];
    const nDir = normWin(nodeModulesDir);
    console.log(`\nlistPackages called with: ${nodeModulesDir}`);
    console.log(`  normWin result: ${nDir}`);
    console.log(`  exists: ${fs.existsSync(nDir)}`);

    if (!fs.existsSync(nDir)) return result;

    for (const entry of fs.readdirSync(nDir)) {
        if (entry === '.bin') continue;
        const entryPath = path.join(nodeModulesDir, entry);

        if (entry.startsWith('@')) {
            try {
                const scopeNorm = normWin(entryPath);
                console.log(`  Scoped entry ${entry}: normWin=${scopeNorm}, exists=${fs.existsSync(scopeNorm)}`);
                const scopeEntries = fs.readdirSync(scopeNorm);
                for (const sub of scopeEntries) {
                    result.push({ name: `${entry}/${sub}`, fullPath: path.join(entryPath, sub) });
                }
            } catch (e) {
                console.log(`  Scoped entry ${entry}: ERROR - ${e.message}`);
            }
        } else {
            result.push({ name: entry, fullPath: entryPath });
        }
    }
    return result;
}

const packages = listPackages(openclawVirtualNM);
console.log(`\nTotal packages found: ${packages.length}`);
const whiskey = packages.filter(p => p.name.includes('whiskey'));
console.log('Whiskeysockets packages:', whiskey);

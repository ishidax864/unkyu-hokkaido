const fs = require('fs');
const path = require('path');

console.log('--- START PRUNING ONNXRUNTIME (AGGRESSIVE) ---');

function getDirSize(dirPath) {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            size += getDirSize(filePath);
        } else {
            size += stats.size;
        }
    }
    return size;
}

function formatSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

try {
    const onnxPackagePath = path.dirname(require.resolve('onnxruntime-node/package.json'));
    console.log(`Found onnxruntime-node at: ${onnxPackagePath}`);

    const binPath = path.join(onnxPackagePath, 'bin');

    if (!fs.existsSync(binPath)) {
        console.warn('WARNING: No bin directory found in onnxruntime-node. Skipping prune.');
        process.exit(0);
    }

    console.log(`Initial size of ${binPath}: ${formatSize(getDirSize(binPath))}`);

    let prunedCount = 0;

    const entries = fs.readdirSync(binPath);
    for (const entry of entries) {
        if (entry.startsWith('napi-v')) {
            const napiPath = path.join(binPath, entry);
            if (fs.statSync(napiPath).isDirectory()) {
                console.log(`Scanning ${entry}...`);

                // 1. Remove entire platforms (darwin, win32)
                const platforms = ['darwin', 'win32'];
                for (const platform of platforms) {
                    const pPath = path.join(napiPath, platform);
                    if (fs.existsSync(pPath)) {
                        console.log(`  Deleting Platform: ${pPath}`);
                        fs.rmSync(pPath, { recursive: true, force: true });
                        prunedCount++;
                    }
                }

                // 2. Cleanup Linux - Remove arm64 (Vercel uses x64)
                const linuxPath = path.join(napiPath, 'linux');
                if (fs.existsSync(linuxPath)) {
                    const arm64Path = path.join(linuxPath, 'arm64');
                    if (fs.existsSync(arm64Path)) {
                        console.log(`  Deleting Linux arm64: ${arm64Path}`);
                        fs.rmSync(arm64Path, { recursive: true, force: true });
                        prunedCount++;
                    }

                    // 3. Cleanup Linux x64 - Remove GPU providers
                    const x64Path = path.join(linuxPath, 'x64');
                    if (fs.existsSync(x64Path)) {
                        const x64Files = fs.readdirSync(x64Path);
                        for (const file of x64Files) {
                            // Delete cuda, tensorrt, rocm, dnnl libraries
                            if (file.includes('cuda') || file.includes('tensorrt') || file.includes('rocm') || file.includes('dnnl')) {
                                const filePath = path.join(x64Path, file);
                                console.log(`  Deleting Linux GPU Lib: ${file}`);
                                fs.rmSync(filePath, { force: true });
                                prunedCount++;
                            }
                        }
                    }
                }
            }
        }
    }

    console.log(`Final size of ${binPath}: ${formatSize(getDirSize(binPath))}`);
    console.log(`Pruning complete.`);

} catch (error) {
    console.error('Error pruning onnxruntime:', error);
    process.exit(1);
}

console.log('--- FINISHED PRUNING ONNXRUNTIME ---');

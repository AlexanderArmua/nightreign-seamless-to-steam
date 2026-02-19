const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

// 1. Configuración de colores (Códigos ANSI)
const colors = {
    reset: "\x1b[0m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    white: "\x1b[37m"
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
    console.log(colors.yellow + "==========================================");
    console.log("       Welcome to Save Manager");
    console.log("==========================================" + colors.reset);

    const appData = process.env.APPDATA;
    const nightreignDir = path.join(appData, 'Nightreign');

    try {
        // Encontrar la carpeta numérica (Steam ID)
        await fs.access(nightreignDir);
        const items = await fs.readdir(nightreignDir, { withFileTypes: true });
        const steamIdFolder = items.find(item => item.isDirectory() && /^\d+$/.test(item.name));

        if (!steamIdFolder) {
            throw new Error(`Could not find any Steam ID folder (numbers) inside ${nightreignDir}`);
        }

        const targetDir = path.join(nightreignDir, steamIdFolder.name);
        console.log(colors.white + `[+] Save directory detected: ${steamIdFolder.name}\n` + colors.reset);

        // 2. Comprobar qué archivos existen para informar al usuario
        const currentFiles = await fs.readdir(targetDir);
        const hasSteamSave = currentFiles.includes('NR0000.sl2');
        const hasCoopSave = currentFiles.includes('NR0000.co2');

        if (!hasSteamSave && !hasCoopSave) {
            throw new Error("No save files (.sl2 or .co2) found in the directory.");
        }

        // 3. Crear copia de seguridad del estado ACTUAL
        // Esto mantiene a salvo el avance antes de la conversión sin borrar backups anteriores
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(appData, 'Nightreign', `backup_${dateStr}`);
        await fs.mkdir(backupDir, { recursive: true });

        for (const file of currentFiles) {
            const srcPath = path.join(targetDir, file);
            const destPath = path.join(backupDir, file);
            const stat = await fs.stat(srcPath);
            if (stat.isFile()) {
                await fs.copyFile(srcPath, destPath);
            }
        }
        console.log(colors.white + `[+] Backup of current state saved in: backup_${dateStr}\n` + colors.reset);

        // Mostrar menú dinámico
        console.log(colors.white + "Available conversions based on your current files:" + colors.reset);
        
        let validOptions = [];

        if (hasSteamSave) {
            console.log(colors.white + "1. From Steam to Coop (You played Steam, want to play Coop)" + colors.reset);
            validOptions.push('1');
        } else {
            console.log(colors.yellow + "[-] Option 1 unavailable: No Steam save (.sl2) found." + colors.reset);
        }

        if (hasCoopSave) {
            console.log(colors.white + "2. From Coop to Steam (You played Coop, want to play Steam)" + colors.reset);
            validOptions.push('2');
        } else {
            console.log(colors.yellow + "[-] Option 2 unavailable: No Coop save (.co2) found." + colors.reset);
        }

        const answer = await askQuestion(colors.white + "\nEnter your choice: " + colors.reset);

        if (!validOptions.includes(answer.trim())) {
            console.log(colors.red + "\n[!] Invalid option or file not available. Exiting..." + colors.reset);
            return;
        }

        let fromExt, toExt;
        if (answer.trim() === '1') {
            fromExt = '.sl2';
            toExt = '.co2';
        } else if (answer.trim() === '2') {
            fromExt = '.co2';
            toExt = '.sl2';
        }

        // 4. Limpiar la carpeta (eliminar los archivos viejos para mantener solo la versión convertida)
        for (const file of currentFiles) {
            if (file !== 'steam_autocloud.vdf') {
                const filePath = path.join(targetDir, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    await fs.unlink(filePath);
                }
            }
        }
        console.log(colors.white + "\n[+] Previous files cleared (kept steam_autocloud.vdf)." + colors.reset);

        // 5. Restaurar la partida con las nuevas extensiones
        const baseName = 'NR0000';
        const mainFileSrc = path.join(backupDir, `${baseName}${fromExt}`);
        const bakFileSrc = path.join(backupDir, `${baseName}${fromExt}.bak`);

        const mainFileDest = path.join(targetDir, `${baseName}${toExt}`);
        const bakFileDest = path.join(targetDir, `${baseName}${toExt}.bak`);

        try {
            await fs.copyFile(mainFileSrc, mainFileDest);
            console.log(colors.green + `[+] Converted: ${baseName}${fromExt} -> ${baseName}${toExt}` + colors.reset);
        } catch (e) {
            console.log(colors.red + `[!] Error: File ${baseName}${fromExt} not found.` + colors.reset);
        }

        try {
            await fs.copyFile(bakFileSrc, bakFileDest);
            console.log(colors.green + `[+] Converted: ${baseName}${fromExt}.bak -> ${baseName}${toExt}.bak` + colors.reset);
        } catch (e) {
            // Es amarillo porque el archivo .bak a veces no existe si el juego acaba de instalarse, no es crítico
            console.log(colors.yellow + `[!] Warning: File ${baseName}${fromExt}.bak not found.` + colors.reset);
        }

        console.log(colors.green + "\nProcess completed successfully!" + colors.reset);

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(colors.red + `\n[X] Error: Directory not found. Is the game installed?` + colors.reset);
        } else {
            console.error(colors.red + "\n[X] An unexpected error occurred: " + error.message + colors.reset);
        }
    } finally {
        rl.close();
        console.log(colors.white + "\nPress 'Enter' to exit..." + colors.reset);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => process.exit(0));
    }
}

main();
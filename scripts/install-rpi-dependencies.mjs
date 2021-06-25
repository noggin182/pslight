import { spawn } from 'child_process';
import isPi from 'detect-rpi';
import { readFileSync } from 'fs';

if (isPi()) {
    console.log('Installing dependencies for Raspberry Pi');
    const deps = JSON.parse(readFileSync('package.json'))['rpi-dependencies'];
    spawn('npm',
        ['install', ...Object.entries(deps).map((name, version) => `${name}@${version}`)],
        {
            stdio: 'inherit'
        }
    );
} else {
    console.log('\x1b[93m%s\x1b[0m', 'This platform doesn\'t look like a Rasberry Pi, skipping Raspberry Pi dependencies.\n');
}

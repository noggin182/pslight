import readline from 'readline';
import { PslightWebHost } from './web-host';

new PslightWebHost(8085, 108);

if (process.platform === 'win32') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('SIGINT', () => {
        process.emit('SIGINT', 'SIGINT');
        rl.close();
    });

    process.on('SIGINT', () => {
        rl.close();
    });
}

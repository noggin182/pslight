import { DefaultPsnClient } from 'pslight-core/psn/client';
import readline from 'readline';
import { PslightWebHost } from './web-host';
import { WebTestPsnClient } from './web-test-psn-client';

const mockPsn = true;
const psnClient = mockPsn ? new WebTestPsnClient() : new DefaultPsnClient();

new PslightWebHost(8085, 108, psnClient);

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

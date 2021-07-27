import finalhandler from 'finalhandler';
import http from 'http';
import serveStatic from 'serve-static';
import WebSocket from 'ws';
import { LedManager } from './led-manager';
import { PsPowerMonitor } from './ps-power-monitor';
import { PsnClient } from './psn/client';
import { toNumber } from './utils/color';

const WWWROOT = __dirname + '/wwwroot';
type RequestHandlerWithError = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: unknown) => void) => void;

export function startWebServer(port: number, ledManager: LedManager, psnClient: PsnClient, psPowerMonitor: PsPowerMonitor): void {
    const serve = serveStatic(WWWROOT, { 'index': ['client.html'] }) as RequestHandlerWithError;
    const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res))).listen(port);

    const wss = new WebSocket.Server({ server });
    wss.on('connection', async (ws) => {
        ws.send(`p:${+psPowerMonitor.currentStatus}`);
        const ledSubscription = ledManager.ledValues$.subscribe((leds) => ws.send('l:' + leds.map(l => toNumber(l).toString(16).padStart(6, '0')).join('-')));
        ws.on('close', () => ledSubscription.unsubscribe());
        if (psnClient.setPresence) {
            ws.send('m:1');
            for (const [accountId, presence] of Object.entries(await psnClient.getPresences(['1', '2', '3', '4']))) {
                ws.send(`${accountId}:${presence}`);
            }
        } else {
            ws.send('m:0');
        }
        ws.send('r:1');

        ws.on('message', (data: string) => {
            const type = data.charAt(0);
            const enabled = data.charAt(2) === '1';

            switch (type) {
                case 'p':
                    if (psPowerMonitor.isMocked) {
                        psPowerMonitor.currentStatus = enabled;
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    psnClient.setPresence?.(type, enabled);
                    break;
            }

        });
    });



    console.log(`Listening on http://localhost:${port}/`);
}
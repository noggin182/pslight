import finalhandler from 'finalhandler';
import http from 'http';
import { startPsLightApp } from 'pslight-core/app';
import { PslightHost } from 'pslight-core/host';
import { PsnClient } from 'pslight-core/psn/client';
import { BehaviorSubject } from 'rxjs';
import serveStatic from 'serve-static';
import WebSocket from 'ws';
import { WebLedStrip } from './web-light-strip';
import { WebTestPsnClient } from './web-test-psn-client';

const WWWROOT = __dirname + '/../../src/web/wwwroot';
type RequestHandlerWithError = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: any) => void) => void;

export class PslightWebHost implements PslightHost {
    readonly psPowerStatus$ = new BehaviorSubject<boolean>(false);
    readonly ledStrip = new WebLedStrip(this.numberOfLeds, (leds) => this.broadcast('l:' + leds.map(l => l.toString(16).padStart(6, '0')).join('-')));

    private readonly wss: WebSocket.Server;

    constructor(readonly port: number, private readonly numberOfLeds: number, readonly psnClient: PsnClient) {

        const serve = serveStatic(WWWROOT, { 'index': ['client.html'] }) as RequestHandlerWithError;
        const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res))).listen(port);

        this.wss = new WebSocket.Server({ server });
        this.wss.on('connection', async (ws) => {
            await this.ensureAppStarted();

            ws.send(`p:${+this.psPowerStatus$.value}`);
            if (this.psnClient instanceof WebTestPsnClient) {
                ws.send('m:1');
                ws.send(`1:${+this.psnClient.getPlayerOnline(1)}`);
                ws.send(`2:${+this.psnClient.getPlayerOnline(2)}`);
                ws.send(`3:${+this.psnClient.getPlayerOnline(3)}`);
                ws.send(`4:${+this.psnClient.getPlayerOnline(4)}`);
            } else {
                ws.send('m:0');
            }
            ws.send('r:1');

            ws.on('message', (data: string) => {
                const type = data.charAt(0);
                const enabled = data.charAt(2) === '1';

                switch (type) {
                    case 'p':
                        this.psPowerStatus$.next(enabled);
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                        if (this.psnClient instanceof WebTestPsnClient) {
                            this.psnClient.setPlayerOnline(+type, enabled);
                        }
                        break;
                }

                this.broadcast(data);
            });
        });

        console.log(`Listening on http://localhost:${port}/`);
    }

    private ensureAppStarted(): Promise<void> {
        const appPromise = startPsLightApp(this);
        this.ensureAppStarted = () => appPromise;
        return appPromise;
    }

    private broadcast(data: string) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
}

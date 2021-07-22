import fs from 'fs';
import http from 'http';
import { startPsLightApp } from 'pslight-core/app';
import { PslightHost } from 'pslight-core/host';
import { BehaviorSubject } from 'rxjs';
import WebSocket from 'ws';
import { WebLedStrip } from './web-light-strip';
import { WebTestPsnClient } from './web-test-psn-client';

const HTML_FILE = __dirname + '/../../src/web/client.html';

export class PslightWebHost implements PslightHost {
    readonly psPowerStatus$ = new BehaviorSubject<boolean>(false);
    readonly psnClient = new WebTestPsnClient();
    readonly ledStrip = new WebLedStrip(this.numberOfLeds, (leds) => this.broadcast('l:' + leds.map(l => l.toString(16).padStart(6, '0')).join('-')));

    private readonly wss: WebSocket.Server;

    constructor(readonly port: number, private readonly numberOfLeds: number) {
        const server = http.createServer(function (req, res) {
            if (req.url === '/') {
                fs.readFile(HTML_FILE, function (err, data) {
                    if (err) {
                        res.writeHead(500);
                        res.end(JSON.stringify(err));
                        return;
                    }
                    res.setHeader('Content-Type', 'text/html');
                    res.writeHead(200);
                    res.end(data);
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(port);

        this.wss = new WebSocket.Server({ server });
        this.wss.on('connection', async (ws) => {
            await this.ensureAppStarted();

            ws.send(`p:${+this.psPowerStatus$.value}`);
            ws.send(`1:${+this.psnClient.getPlayerOnline(1)}`);
            ws.send(`2:${+this.psnClient.getPlayerOnline(2)}`);
            ws.send(`3:${+this.psnClient.getPlayerOnline(3)}`);
            ws.send(`4:${+this.psnClient.getPlayerOnline(4)}`);

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
                        this.psnClient.setPlayerOnline(+type, enabled);
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

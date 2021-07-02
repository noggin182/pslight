import fs from 'fs';
import http from 'http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import WebSocket from 'ws';
import { PslightWebHost } from './web-host';

const HTML_FILE = __dirname + '/../../src/web/client.html';

export class PslightWebServer {

    constructor(private readonly host: Promise<PslightWebHost>, port: number) {
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

        const wss = new WebSocket.Server({ server });
        wss.on('connection', async (ws) => {
            const host = await this.host;
            const close$ = new Subject();

            host.psLedStatus$.pipe(takeUntil(close$)).subscribe(leds => ws.send(`l:${leds}`));
            host.psPowerStatus$.pipe(takeUntil(close$)).subscribe(power => ws.send(`p:${+power}`));
            ws.on('close', () => close$.complete());

            ws.on('message', data => {
                if (data === 'p:0') {
                    host.psPowerSubject$.next(false);
                }
                else if (data === 'p:1') {
                    host.psPowerSubject$.next(true);
                }
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send('c:' + data);
                    }
                });
            });
        });

        console.log(`Listening on http://localhost:${port}/`);
    }
}

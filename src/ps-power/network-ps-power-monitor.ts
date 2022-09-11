import { createSocket } from 'dgram';
import { BehaviorSubject, combineLatest, interval, map, Observable, share, Subject, Subscription, switchMap } from 'rxjs';

const PORT = 9302;
const DDP_MESSAGE = Buffer.from('SRCH * HTTP/1.1\ndevice-discovery-protocol-version:00030010\n\0');

enum PowerStatus {
    Unknown,
    Offline,
    Standby,
    Awake
}

interface Message {
    protocol: string;
    status: string;
    statusMessage: string;
    'host-id'?: string;
    'host-type'?: string;
}

export class NetworkPsPowerMonitor {
    constructor() {
        this.powerStatus$ = new Observable<boolean>(subscriber => {
            const socket = createSocket('udp4');
            const deviceStatusMap$ = new Map<string, BehaviorSubject<PowerStatus>>();
            const devices$ = new Subject<readonly BehaviorSubject<PowerStatus>[]>();

            socket.on('message', message => {
                const msg = this.parseMessage(message);
                const device = msg?.['host-id'];
                if (msg && device) {
                    const deviceStatus$ = deviceStatusMap$.get(device);
                    if (deviceStatus$) {
                        deviceStatus$.next(this.parseStatus(msg.status));
                    } else {
                        deviceStatusMap$.set(device, new BehaviorSubject(this.parseStatus(msg.status)));
                        devices$.next([...deviceStatusMap$.values()]);
                    }
                }
            });

            let intervalSubscription: Subscription;

            socket.bind(() => {
                socket.setBroadcast(true);
                intervalSubscription = interval(1000).subscribe(() => {
                    socket.send(DDP_MESSAGE, 0, DDP_MESSAGE.length, PORT, '255.255.255.255');
                });
            });

            const inner = devices$
                .pipe(
                    switchMap(devices => combineLatest(devices)),
                    map(statuses => statuses.some(status => status === PowerStatus.Awake))
                ).subscribe(subscriber);

            return () => {
                intervalSubscription?.unsubscribe;
                inner.unsubscribe();
                socket.close();
            };
        }).pipe(share());
    }

    readonly powerStatus$: Observable<boolean>;

    private parseMessage(message: Buffer): Message | undefined {
        // console.log('message recieved', message.toString());
        const [response, ...headers] = message.toString().trim().split('\n');
        const [protocol, status, statusMessage] = response?.split(' ', 3) ?? [];
        if (protocol === 'HTTP/1.1') {
            return {
                protocol,
                status,
                statusMessage,
                ...Object.fromEntries(headers.map(line => line.split(':', 2)))
            };
        }
    }

    private parseStatus(status: string): PowerStatus {
        switch (status) {
            case '200': return PowerStatus.Awake;
            case '620': return PowerStatus.Standby;
            default: return PowerStatus.Unknown;
        }
    }
}

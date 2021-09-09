import express, { Express, NextFunction, Request, Response } from 'express';
import { ValidationError, Validator } from 'express-json-validator-middleware';
import { JSONSchema4 } from 'json-schema';
import { hostname } from 'os';
import path from 'path';
import { EMPTY, first, map, of, Subject, takeUntil } from 'rxjs';
import { LedManager } from '../led-manager';
import { PsPowerMonitor } from '../ps-power-monitor';
import { PresenceMonitor } from '../psn/presence-monitor';
import { toNumber } from '../utils/color';
import { deepPick, flattenAndWatch, isObject, stripDollar } from '../utils/utils';
import { WritableSubject } from '../utils/writable-subject';
import { Schema, schema } from './schema';
import './schema.checks';

export class WebServer {
    constructor(port: number,
        private readonly ledManager: LedManager,
        private readonly presenceMonitor: PresenceMonitor,
        private readonly psPowerMonitor: PsPowerMonitor) {

        const app = express();

        app.use(express.json());

        this.publishSchema(app, schema, ['pslight'], { pslight: this.resources });

        app.use((error: unknown, _: Request, res: Response, next: NextFunction) => {
            if (error instanceof ValidationError) {
                res.status(400).json({
                    error: 'ValidationError',
                    details: error.validationErrors.body
                });
                next();
            } else {
                next(error);
            }
        });

        app.use(express.static(path.join(__dirname, 'wwwroot')));

        app.listen(port, () => {
            console.log(`API listening on http://${hostname()}:${port}/api/pslight`);
            console.log(`Harness listening on http://${hostname()}:${port}/`);
        });
    }

    private readonly config: Schema['config'] = {
        mockedPower: this.psPowerMonitor.isMocked,
        mockedPresences: this.presenceMonitor.isMocked,
        version: '0.1.0-alpha',
        compatabilityLevel: 2
    }

    private readonly resources = {
        config: this.config,
        brightness$: this.ledManager.brightness$,
        lights$: this.ledManager.ledValues$.pipe(map(leds => leds.map(toNumber))),
        psPower$: this.psPowerMonitor.powerStatus$,
        profiles$: this.presenceMonitor.profiles
    } as const;

    private appendSlash(schema: JSONSchema4) {
        return function (request: Request, response: Response, next: NextFunction) {
            if (schema.type === 'object' && request.path.substr(-1) !== '/') {
                response.redirect(301, `${request.path}/${request.url.substr(request.path.length)}`);
            } else {
                next();
            }
        };
    }

    private publishSchema(app: Express, schema: JSONSchema4, path: string[], source: unknown) {
        // TODO: check error handlers in subscribe calls
        const propName = schema.description ?? (path.length ? path[path.length - 1] : 'param');
        app.get('/api/' + path.join('/'),
            this.appendSlash(schema),
            (request, response, next) => {

                const mapper = request.query['markers'] === 'writable' ? (obj: Record<string, unknown>) => {
                    return Object.fromEntries(Object.entries(obj).map(([name, value]) =>
                        value instanceof WritableSubject ? [[name, value], [stripDollar(name) + '$writable', true]] : [[name, value]]
                    ).flat(1));
                } : undefined;

                deepPick(path, source, request.params, () => (next(), EMPTY))
                    .pipe(map(v => isObject(v) ? flattenAndWatch(v, mapper) : of(v)))
                    .subscribe(value$ => {
                        if (!request.headers.accept?.includes('text/event-stream')) {
                            value$.pipe(first()).subscribe({
                                next: data => response.status(200).json({ [propName]: data }),
                                error: err => response.status(500).json(this.toError(err))
                            });
                        } else {
                            const close$ = new Subject<void>();
                            let headersSent = false;
                            let id = 0;
                            value$.pipe(takeUntil(close$)).subscribe({
                                next: data => {
                                    if (!headersSent) {
                                        response.on('close', () => close$.complete());
                                        response.writeHead(200, {
                                            'Content-Type': 'text/event-stream',
                                            'Cache-Control': 'no-cache',
                                            'Connection': 'keep-alive'
                                        });
                                        headersSent = true;
                                    }
                                    response.write(`id:${id++}\ndata:${JSON.stringify({ [propName]: data })}\n\n`);
                                },
                                error: (err) => {
                                    if (headersSent) {
                                        response.write(`id:${id++}\ndata:${JSON.stringify(this.toError(err))}\n\n`);
                                        response.end();
                                    } else {
                                        response.status(500).json(this.toError(err));
                                    }
                                    close$.next();
                                },
                                complete: () => {
                                    if (response.writable) {
                                        response.write('event:complete\ndata:\n\n');
                                    }
                                    response.end();
                                    close$.next();
                                }
                            });
                        }
                    });
            });
        app.post('/api/' + path.join('/'),
            this.appendSlash(schema),
            this.validator.validate({
                body: {
                    type: 'object', properties: { [propName]: schema }, required: [propName]
                }
            }),
            (request, response, next) => {
                const value$ = deepPick(path, source, request.params, () => (next(), EMPTY));
                if (value$ instanceof WritableSubject) {
                    value$.next(request.body[propName]);
                    response.status(200).send('ok');
                } else if (value$ !== EMPTY) {
                    response.status(405).send('Not writable');
                }
            });
        if (schema.type === 'object') {
            if (schema.properties) {
                for (const [propName, propSchema] of Object.entries(schema.properties)) {
                    this.publishSchema(app, propSchema, [...path, propName], source);
                }
            } else if (isObject(schema.additionalProperties)) {
                this.publishSchema(app, schema.additionalProperties, [...path, ':' + propName], source);
            }
        }
    }
    private readonly validator = new Validator({});

    private toError(err: unknown) {
        return {
            error: {
                message: err instanceof Error ? err.message : 'Unkown error'
            }
        };
    }
}

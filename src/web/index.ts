import { Pslight } from 'pslight-core';
import { PslightWebServer } from './server';
import { PslightWebHost } from './web-host';

const createHost = new Promise<PslightWebHost>((resolve) => {
    const host = new PslightWebHost();
    resolve(host);
    Pslight.run(host, {
        numberOfLeds: 60
    });
});

new PslightWebServer(createHost, 8085);


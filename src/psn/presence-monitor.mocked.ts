import { Observable } from 'rxjs';
import { WritableSubject } from '../utils/writable-subject';
import { PresenceMonitor } from './presence-monitor';

export class MockedPresenceMonitor implements PresenceMonitor {
    constructor() {
        const profiles = process.env.PSLIGHT_FRIENDS?.split(',').map(s => s.trim()) ?? ['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4'];
        this.profiles = Object.fromEntries(profiles.map(onlineId => [onlineId, { online$: new WritableSubject<boolean>(false) }]));
        console.log('Monitoring mocked profiles: ' + profiles.join(', '));
    }

    readonly isMocked = true;
    readonly profiles: { readonly [onlineId: string]: { readonly online$: Observable<boolean> } };
}

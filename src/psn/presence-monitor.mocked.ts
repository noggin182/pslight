import { Observable } from 'rxjs';
import { WritableSubject } from '../utils/writable-subject';
import { PresenceMonitor } from './presence-monitor';

export class MockedPresenceMonitor implements PresenceMonitor {
    constructor() {
        const profiles = process.env.PSLIGHT_FRIENDS?.split(',').map(s => s.trim()) ?? ['Profile 1', 'Profile 2', 'Profile 3', 'Profile 4'];

        const map = Object.fromEntries(profiles.map(([onlineId]) => [onlineId, new WritableSubject<boolean>(false)]));
        this.profilePresence$map = map;
        console.log('Monitoring mocked profiles: ' + profiles.join(', '));
    }

    readonly isMocked = true;
    readonly profilePresence$map: { readonly [onlineId: string]: Observable<boolean>; };
}

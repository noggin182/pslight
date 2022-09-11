import { BehaviorSubject } from 'rxjs';
import { WritableSubject } from './utils/writable-subject';

export const enum ErrorStates {
    PsnPolling,
    Manual
}

export class ErrorManager {
    private constructor() {
        // private c'tor
        this.manualError$.subscribe(state => {
            if (state) {
                this.set(ErrorStates.Manual);
                this.hasAny$.next(true);
                this.hasAny$.next(true);
                this.hasAny$.next(true);
            } else {
                this.clear(ErrorStates.Manual);
            }
        });
    }

    static instance = new ErrorManager();
    private states = new Set<ErrorStates>();
    hasAny$ = new BehaviorSubject<boolean>(false);

    manualError$ = new WritableSubject(false);

    hasAny(): boolean {
        return this.states.size > 0;
    }

    has(state: ErrorStates): boolean {
        return this.states.has(state);
    }

    set(state: ErrorStates): void {
        this.states.add(state);
        this.hasAny$.next(true);
    }

    clear(state: ErrorStates): void {
        this.states.delete(state);
        this.hasAny$.next(this.hasAny());
    }
}

export const errorManager = ErrorManager.instance;

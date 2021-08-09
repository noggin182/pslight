import { BehaviorSubject } from 'rxjs';

export const enum ErrorStates {
    PsnPolling
}

export class ErrorManager {
    private constructor() {
        // private c'tor
    }

    static instance = new ErrorManager();
    private states = new Set<ErrorStates>();
    hasAny$ = new BehaviorSubject<boolean>(false);

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

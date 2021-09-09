import { BehaviorSubject } from 'rxjs';

/** An observable that derives from BehaviorSubject, but can be externally written to  */
export class WritableSubject<T> extends BehaviorSubject<T> {
    constructor(value: T) {
        super(value);
    }
}

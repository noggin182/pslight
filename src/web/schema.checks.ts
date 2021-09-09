import { DeepUnwrapObservable } from '../utils/utils';
import { Schema } from './schema';
import { WebServer } from './web-server';

// ====================================================================================================================
// These functions aren't called but are included to ensure that the types generated from the schema are compatable
// with the internal types
// ====================================================================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
// ====================================================================================================================

function resourceToSchema(resource: DeepUnwrapObservable<WebServer['resources']>): Schema {
    // WebServer['resources']> should be assignable to Schema
    return resource;
}

function schemaToResource(schema: Schema): DeepUnwrapObservable<WebServer['resources']> {
    // WebServer['resources']> should be assignable to Schema
    return schema;
}

import { JSONSchema4 } from 'json-schema';

const constSchema = {
    type: 'object',
    required: ['config', 'forcedError', 'brightness', 'lights', 'psPower', 'profiles'],
    properties: {
        config: {
            type: 'object',
            required: ['mockedPresences', 'version', 'compatabilityLevel'],
            properties: {
                mockedPresences: { type: 'boolean' },
                version: { type: 'string' },
                compatabilityLevel: { type: 'number', enum: [2] }
            }
        },
        forcedError: {
            type: 'boolean'
        },
        brightness: {
            type: 'number',
            minimum: 0,
            maximum: 1
        },
        lights: {
            type: 'array',
            items: {
                type: 'number',
                minimum: 0x000000,
                maximum: 0xFFFFFF
            }
        },
        psPower: {
            type: 'boolean'
        },
        profiles: {
            type: 'object',
            additionalProperties: {
                type: 'object',
                description: 'profile',
                required: ['online'],
                properties: {
                    online: {
                        type: 'boolean'
                    }
                }
            }
        }
    }
} as const;

type ExtractTypeFromSchema<T>
    = T extends { readonly enum: readonly unknown[] } ? T['enum'][number]
    : T extends { type: 'array', items: Record<string, unknown> } ? ExtractTypeFromSchema<T['items']>[]
    : T extends { type: 'number' } ? number
    : T extends { type: 'boolean' } ? boolean
    : T extends { type: 'string' } ? string
    : T extends { additionalProperties: Record<string, unknown> } ? { [property: string]: ExtractTypeFromSchema<T['additionalProperties']> }
    : T extends { type: 'object', properties: Record<string, unknown>, required: readonly unknown[] } ? { [P in keyof T['properties']]: ExtractTypeFromSchema<T['properties'][P]> | (P extends T['required'][number] ? never : undefined) }
    : T extends { type: 'object', properties: Record<string, unknown> } ? { [P in keyof T['properties']]: ExtractTypeFromSchema<T['properties'][P]> | undefined }
    : never;


export type Schema = ExtractTypeFromSchema<typeof constSchema>;

// We need to declare the schema as const so that we can extract the interfaces automatically
// However this is incompatible with JSONSchema4 so we need to remove the readonly modifiers before exporting
type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };
export const schema: JSONSchema4 & Required<Pick<JSONSchema4, 'properties'>> = constSchema as DeepWritable<typeof constSchema>;


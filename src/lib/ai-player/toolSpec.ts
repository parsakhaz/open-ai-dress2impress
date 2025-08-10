import type { Category } from './types';

export const categoryEnum: Category[] = ['top', 'bottom', 'dress'];

export function getToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'getCurrentClothes',
        description: 'List locally available wardrobe items from the closet folders for the given categories.',
        parameters: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: { type: 'string', enum: categoryEnum },
              description: 'Categories to list',
            },
          },
          required: ['categories'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'searchRapid',
        description: 'Search Amazon fashion via RapidAPI. Limited to 3 searches per run. Returns products for the requested category.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category: { type: 'string', enum: categoryEnum },
          },
          required: ['query', 'category'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'callFashnAPI',
        description: 'Perform a try-on with Fashn. One garment per call. Call twice per outfit with distinct variation values.',
        parameters: {
          type: 'object',
          properties: {
            avatarImage: { type: 'string', description: 'Base avatar image URL' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  image: { type: 'string' },
                  category: { type: 'string', enum: categoryEnum },
                },
                required: ['id', 'image', 'category'],
                additionalProperties: false,
              },
              minItems: 1,
              maxItems: 1,
            },
            variation: { type: 'number', description: 'Integer variation code' },
          },
          required: ['avatarImage', 'items', 'variation'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'evaluate',
        description: 'Evaluate palette/notes for an outfit with given theme and try-on images.',
        parameters: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  image: { type: 'string' },
                  category: { type: 'string', enum: categoryEnum },
                },
                required: ['id', 'image', 'category'],
                additionalProperties: true,
              },
            },
            tryOnImages: { type: 'array', items: { type: 'string' } },
          },
          required: ['theme', 'items', 'tryOnImages'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'saveManifest',
        description: 'Persist a summary JSON manifest for the run (theme, items, images, notes).',
        parameters: {
          type: 'object',
          properties: {
            data: { type: 'object' },
          },
          required: ['data'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'log',
        description: 'Append a human-readable log line. Use for short, useful messages.',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            context: { type: 'object' },
          },
          required: ['message'],
          additionalProperties: false,
        },
      },
    },
  ];
}



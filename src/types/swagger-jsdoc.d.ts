declare module 'swagger-jsdoc' {
  namespace swaggerJsdoc {
    interface Options {
      definition: {
        openapi: string;
        info: {
          title: string;
          version: string;
          description?: string;
        };
        servers?: Array<{
          url: string;
          description?: string;
        }>;
        components?: {
          securitySchemes?: {
            [key: string]: {
              type: string;
              scheme: string;
              bearerFormat?: string;
            };
          };
          schemas?: {
            [key: string]: {
              type: string;
              properties: {
                [key: string]: {
                  type: string;
                  format?: string;
                  enum?: string[];
                };
              };
            };
          };
        };
      };
      apis: string[];
    }
  }

  function swaggerJsdoc(options: swaggerJsdoc.Options): any;
  export = swaggerJsdoc;
} 
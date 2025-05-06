declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  interface SwaggerUiOptions {
    explorer?: boolean;
    swaggerOptions?: {
      [key: string]: any;
    };
    customCss?: string;
    customJs?: string;
    customSiteTitle?: string;
    customfavIcon?: string;
    swaggerUrl?: string;
  }

  function serve(): RequestHandler[];
  function setup(swaggerDoc: any, options?: SwaggerUiOptions): RequestHandler;

  export { serve, setup };
} 
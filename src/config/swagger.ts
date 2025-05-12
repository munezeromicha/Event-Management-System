import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Management API',
      version: '1.0.0',
      description: 'API documentation for the Event Management System',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://event-management-system-i5mq.onrender.com'
          : 'http://localhost:4000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Event: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            date: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Registration: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            eventId: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            registrationId: {
              type: 'string',
              format: 'uuid',
            },
            eventId: {
              type: 'string',
              format: 'uuid',
            },
            checkInTime: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../routes/*.ts')], // Use absolute path
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: any) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}; 
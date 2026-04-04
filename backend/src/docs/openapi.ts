const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'WHATS_AUTO Backend API',
    version: '1.0.0',
    description: 'Documentacao completa da API do backend e da Revolution API (mock).',
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor atual',
    },
  ],
  tags: [
    { name: 'Health', description: 'Status da API' },
    { name: 'Auth', description: 'Autenticacao e cadastro' },
    { name: 'Dashboard', description: 'Resumo operacional da empresa' },
    { name: 'Users', description: 'Gestao de usuarios internos' },
    { name: 'Instances', description: 'Instancias de WhatsApp' },
    { name: 'Tickets', description: 'Atendimento e conversas' },
    { name: 'Flows', description: 'Fluxos de automacao e roteamento' },
    { name: 'Revolution', description: 'Mock da Revolution API' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string', example: '1.0.0' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@empresa.com' },
          password: { type: 'string', example: 'SenhaForte123' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'companyName', 'subdomain'],
        properties: {
          name: { type: 'string', example: 'Joao Silva' },
          email: { type: 'string', format: 'email', example: 'admin@empresa.com' },
          password: { type: 'string', example: 'SenhaForte123' },
          companyName: { type: 'string', example: 'Minha Empresa' },
          subdomain: { type: 'string', example: 'minhaempresa' },
          phone: { type: 'string', example: '5566999999999' },
        },
      },
      AuthSuccessResponse: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              name: { type: 'string', example: 'Joao Silva' },
              email: { type: 'string', example: 'admin@empresa.com' },
              role: { type: 'string', example: 'admin' },
              avatar: { type: 'string', nullable: true },
            },
          },
          company: { type: 'object', additionalProperties: true },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mensagem de erro' },
        },
      },
      DashboardResponse: {
        type: 'object',
        properties: {
          totalTickets: { type: 'integer', example: 42 },
          openTickets: { type: 'integer', example: 18 },
          resolvedToday: { type: 'integer', example: 6 },
          avgResponseTime: { type: 'string', example: '5min' },
          totalInstances: { type: 'integer', example: 3 },
          activeFlows: { type: 'integer', example: 7 },
          totalAgents: { type: 'integer', example: 4 },
        },
      },
      MeResponse: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              avatar: { type: 'string', nullable: true },
            },
          },
          company: { type: 'object', additionalProperties: true },
        },
      },
      UserPayload: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          company_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Maria Souza' },
          email: { type: 'string', example: 'maria@empresa.com' },
          role: { type: 'string', enum: ['admin', 'manager', 'agent', 'viewer'], example: 'agent' },
          is_active: { type: 'boolean', example: true },
          avatar: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Maria Souza' },
          email: { type: 'string', format: 'email', example: 'maria@empresa.com' },
          password: { type: 'string', example: 'Senha123456' },
          role: { type: 'string', enum: ['admin', 'manager', 'agent', 'viewer'], example: 'agent' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'manager', 'agent', 'viewer'] },
          is_active: { type: 'boolean' },
        },
      },
      InstancePayload: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          company_id: { type: 'integer' },
          name: { type: 'string' },
          evolution_instance: { type: 'string' },
          phone: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['connected', 'disconnected', 'connecting', 'error'] },
          webhook_url: { type: 'string', nullable: true },
          qr_code: { type: 'string', nullable: true },
          last_connected_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CreateInstanceRequest: {
        type: 'object',
        required: ['name', 'evolution_instance'],
        properties: {
          name: { type: 'string', example: 'Numero Principal' },
          evolution_instance: { type: 'string', example: 'empresa-principal' },
          phone: { type: 'string', example: '5566999999999' },
          webhook_url: { type: 'string', example: 'https://api.empresa.com/webhook' },
        },
      },
      UpdateInstanceRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          status: { type: 'string', enum: ['connected', 'disconnected', 'connecting', 'error'] },
          webhook_url: { type: 'string' },
        },
      },
      TicketPayload: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          company_id: { type: 'integer' },
          instance_id: { type: 'integer' },
          user_id: { type: 'integer', nullable: true },
          contact_phone: { type: 'string' },
          contact_name: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['open', 'pending', 'in_progress', 'resolved', 'closed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          channel: { type: 'string', enum: ['whatsapp', 'telegram', 'messenger'] },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
        },
      },
      CreateTicketRequest: {
        type: 'object',
        required: ['instance_id', 'contact_phone'],
        properties: {
          instance_id: { type: 'integer', example: 1 },
          user_id: { type: 'integer', example: 3 },
          contact_phone: { type: 'string', example: '5566998887777' },
          contact_name: { type: 'string', example: 'Cliente Teste' },
          status: { type: 'string', enum: ['open', 'pending', 'in_progress', 'resolved', 'closed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      UpdateTicketRequest: {
        type: 'object',
        properties: {
          user_id: { type: 'integer' },
          status: { type: 'string', enum: ['open', 'pending', 'in_progress', 'resolved', 'closed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      FlowPayload: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          company_id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          trigger_type: { type: 'string', enum: ['keyword', 'greeting', 'menu', 'webhook', 'schedule'] },
          trigger_config: { type: 'object', additionalProperties: true, nullable: true },
          n8n_workflow_id: { type: 'string', nullable: true },
          is_active: { type: 'boolean' },
          settings: { type: 'object', additionalProperties: true, nullable: true },
        },
      },
      CreateFlowRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Atendimento Comercial' },
          description: { type: 'string' },
          source: { type: 'string', enum: ['internal', 'typebot'], example: 'typebot' },
          typebot_url: { type: 'string', example: 'https://typebot.com/seu-bot' },
          trigger_type: { type: 'string', enum: ['keyword', 'greeting', 'menu', 'webhook', 'schedule'] },
          trigger_config: { type: 'object', additionalProperties: true },
          n8n_workflow_id: { type: 'string' },
          is_active: { type: 'boolean' },
          sector: { type: 'string', example: 'Comercial' },
          assignedAgentIds: { type: 'array', items: { type: 'integer' } },
        },
      },
      UpdateFlowRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          source: { type: 'string', enum: ['internal', 'typebot'] },
          typebot_url: { type: 'string' },
          trigger_type: { type: 'string', enum: ['keyword', 'greeting', 'menu', 'webhook', 'schedule'] },
          trigger_config: { type: 'object', additionalProperties: true },
          n8n_workflow_id: { type: 'string' },
          is_active: { type: 'boolean' },
          sector: { type: 'string' },
          assignedAgentIds: { type: 'array', items: { type: 'integer' } },
        },
      },
      RevolutionInstancePayload: {
        type: 'object',
        properties: {
          instanceName: { type: 'string', example: 'empresa-principal' },
          webhookUrl: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['connected', 'disconnected', 'connecting', 'error'] },
          qrCode: { type: 'string', example: 'data:image/png;base64,QR_ZW1wcmVzYS1wcmluY2lwYWw=' },
          lastUpdateAt: { type: 'string', format: 'date-time' },
        },
      },
      RevolutionMessageRequest: {
        type: 'object',
        required: ['instanceName', 'to', 'text'],
        properties: {
          instanceName: { type: 'string', example: 'empresa-principal' },
          to: { type: 'string', example: '5566998887777' },
          text: { type: 'string', example: 'Ola, esta e uma mensagem de teste.' },
        },
      },
      RevolutionMessageResponse: {
        type: 'object',
        properties: {
          messageId: { type: 'string', example: 'msg_1712233445566' },
          status: { type: 'string', enum: ['queued', 'sent'] },
          instanceName: { type: 'string' },
          to: { type: 'string' },
          text: { type: 'string' },
          sentAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check da API',
        responses: {
          '200': {
            description: 'API online',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login de usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login realizado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
              },
            },
          },
          '400': {
            description: 'Dados invalidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Falha na autenticacao',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registro de nova empresa e usuario admin',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cadastro criado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
              },
            },
          },
          '400': {
            description: 'Dados invalidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retorna dados do usuario autenticado',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Dados do usuario autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeResponse' },
              },
            },
          },
          '401': {
            description: 'Nao autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Retorna resumo de indicadores do dashboard',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Resumo retornado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DashboardResponse' },
              },
            },
          },
          '401': {
            description: 'Nao autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Lista usuarios da empresa',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de usuarios',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/UserPayload' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Cria usuario interno',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Usuario criado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserPayload' },
              },
            },
          },
          '400': {
            description: 'Dados invalidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/users/{id}': {
      patch: {
        tags: ['Users'],
        summary: 'Atualiza usuario',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Usuario atualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserPayload' },
              },
            },
          },
          '404': {
            description: 'Usuario nao encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/instances': {
      get: {
        tags: ['Instances'],
        summary: 'Lista instancias',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de instancias',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/InstancePayload' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Instances'],
        summary: 'Cria instancia',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateInstanceRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Instancia criada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InstancePayload' },
              },
            },
          },
        },
      },
    },
    '/instances/{id}': {
      patch: {
        tags: ['Instances'],
        summary: 'Atualiza instancia',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateInstanceRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Instancia atualizada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InstancePayload' },
              },
            },
          },
        },
      },
    },
    '/instances/{id}/connect': {
      post: {
        tags: ['Instances'],
        summary: 'Conecta instancia da plataforma',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Instancia conectada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InstancePayload' },
              },
            },
          },
        },
      },
    },
    '/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'Lista tickets da empresa',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tickets retornados',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TicketPayload' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Cria ticket',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTicketRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Ticket criado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TicketPayload' },
              },
            },
          },
        },
      },
    },
    '/tickets/{id}': {
      patch: {
        tags: ['Tickets'],
        summary: 'Atualiza ticket',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTicketRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Ticket atualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TicketPayload' },
              },
            },
          },
        },
      },
    },
    '/flows': {
      get: {
        tags: ['Flows'],
        summary: 'Lista fluxos',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Fluxos retornados',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/FlowPayload' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Flows'],
        summary: 'Cria fluxo',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateFlowRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Fluxo criado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlowPayload' },
              },
            },
          },
        },
      },
    },
    '/flows/{id}': {
      patch: {
        tags: ['Flows'],
        summary: 'Atualiza fluxo',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateFlowRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Fluxo atualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlowPayload' },
              },
            },
          },
        },
      },
    },
    '/revolution/instances': {
      get: {
        tags: ['Revolution'],
        summary: 'Lista instancias no mock da Revolution API',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Instancias da Revolution retornadas',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RevolutionInstancePayload' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Revolution'],
        summary: 'Cria instancia no mock da Revolution API',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['instanceName'],
                properties: {
                  instanceName: { type: 'string', example: 'empresa-principal' },
                  webhookUrl: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Instancia criada no mock',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevolutionInstancePayload' },
              },
            },
          },
        },
      },
    },
    '/revolution/instances/{instanceName}/connect': {
      post: {
        tags: ['Revolution'],
        summary: 'Conecta instancia no mock da Revolution API',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'instanceName', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Instancia conectada no mock',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevolutionInstancePayload' },
              },
            },
          },
        },
      },
    },
    '/revolution/instances/{instanceName}/disconnect': {
      post: {
        tags: ['Revolution'],
        summary: 'Desconecta instancia no mock da Revolution API',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'instanceName', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Instancia desconectada no mock',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevolutionInstancePayload' },
              },
            },
          },
        },
      },
    },
    '/revolution/instances/{instanceName}/status': {
      get: {
        tags: ['Revolution'],
        summary: 'Consulta status da instancia no mock',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'instanceName', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Status retornado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instanceName: { type: 'string' },
                    status: { type: 'string', enum: ['connected', 'disconnected', 'connecting', 'error'] },
                    lastUpdateAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/revolution/instances/{instanceName}/qrcode': {
      get: {
        tags: ['Revolution'],
        summary: 'Busca QR Code da instancia no mock',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'instanceName', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'QR Code retornado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instanceName: { type: 'string' },
                    qrCode: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/revolution/messages/text': {
      post: {
        tags: ['Revolution'],
        summary: 'Envia mensagem de texto no mock da Revolution API',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RevolutionMessageRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Mensagem enfileirada com sucesso no mock',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevolutionMessageResponse' },
              },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;

import { QueryInterface } from 'sequelize';

type IndexMetadata = {
  name?: string;
};

const addIndexIfMissing = async (
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[],
  indexName: string
): Promise<void> => {
  const tableExists = await queryInterface.tableExists(tableName);

  if (!tableExists) {
    console.log(`Tabela ${tableName} nao existe. Pulando indice ${indexName}.`);
    return;
  }

  const indexes = (await queryInterface.showIndex(tableName)) as IndexMetadata[];
  const exists = indexes.some((index) => index.name === indexName);

  if (exists) {
    console.log(`Indice ${indexName} ja existe. Pulando.`);
    return;
  }

  await queryInterface.addIndex(tableName, fields, { name: indexName });
};

export = {
  up: async (queryInterface: QueryInterface) => {
    // Add missing indexes on tickets
    await addIndexIfMissing(queryInterface, 'tickets', ['company_id', 'status'], 'idx_tickets_company_status');
    
    await addIndexIfMissing(queryInterface, 'tickets', ['user_id', 'status'], 'idx_tickets_user_status');
    
    await addIndexIfMissing(queryInterface, 'tickets', ['updated_at'], 'idx_tickets_updated_at');

    // Add missing indexes on messages (if messages table exists, but we know it's heavy)
    await addIndexIfMissing(queryInterface, 'messages', ['ticket_id', 'created_at'], 'idx_messages_ticket_created');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('tickets', 'idx_tickets_company_status');
    await queryInterface.removeIndex('tickets', 'idx_tickets_user_status');
    await queryInterface.removeIndex('tickets', 'idx_tickets_updated_at');
    await queryInterface.removeIndex('messages', 'idx_messages_ticket_created');
  },
};

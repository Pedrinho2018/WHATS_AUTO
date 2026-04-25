import { QueryInterface } from 'sequelize';

type IndexMetadata = {
  name?: string;
};

const INDEX_TICKETS_INBOUND_LOOKUP = 'idx_tickets_company_instance_contact_status_updated';
const INDEX_FLOWS_WEBHOOK_ROUTING = 'idx_flows_company_active_trigger_updated';
const INDEX_MESSAGES_TICKET_TIMELINE = 'idx_messages_company_ticket_created';

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

export async function up(queryInterface: QueryInterface): Promise<void> {
  await addIndexIfMissing(
    queryInterface,
    'tickets',
    ['company_id', 'instance_id', 'contact_phone', 'status', 'updated_at'],
    INDEX_TICKETS_INBOUND_LOOKUP
  );

  await addIndexIfMissing(
    queryInterface,
    'flows',
    ['company_id', 'is_active', 'trigger_type', 'updated_at'],
    INDEX_FLOWS_WEBHOOK_ROUTING
  );

  await addIndexIfMissing(
    queryInterface,
    'messages',
    ['company_id', 'ticket_id', 'created_at'],
    INDEX_MESSAGES_TICKET_TIMELINE
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('messages', INDEX_MESSAGES_TICKET_TIMELINE);
  await queryInterface.removeIndex('flows', INDEX_FLOWS_WEBHOOK_ROUTING);
  await queryInterface.removeIndex('tickets', INDEX_TICKETS_INBOUND_LOOKUP);
}

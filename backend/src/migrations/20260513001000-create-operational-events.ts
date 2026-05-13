import { DataTypes, QueryInterface, Sequelize } from 'sequelize';

const TABLE_NAME = 'operational_events';
const EVENT_TYPES = [
  'webhook_received',
  'message_saved',
  'realtime_emitted',
  'message_send_failed',
  'message_send_retry',
  'login_success',
  'login_failed',
  'admin_action',
  'data_exported',
  'data_deleted',
  'retention_applied',
];

type IndexMetadata = {
  name?: string;
};

const addIndexIfMissing = async (
  queryInterface: QueryInterface,
  fields: string[],
  name: string
): Promise<void> => {
  const indexes = (await queryInterface.showIndex(TABLE_NAME)) as IndexMetadata[];
  const exists = indexes.some((index) => index.name === name);

  if (!exists) {
    await queryInterface.addIndex(TABLE_NAME, fields, { name });
  }
};

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableExists = await queryInterface.tableExists(TABLE_NAME);

  if (!tableExists) {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'SET NULL',
      },
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'messages', key: 'id' },
        onDelete: 'SET NULL',
      },
      event_type: {
        type: DataTypes.ENUM(...EVENT_TYPES),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('success', 'warning', 'error'),
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      detail: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  }

  await addIndexIfMissing(queryInterface, ['company_id', 'created_at'], 'idx_operational_events_company_created');
  await addIndexIfMissing(queryInterface, ['ticket_id', 'created_at'], 'idx_operational_events_ticket_created');
  await addIndexIfMissing(queryInterface, ['message_id'], 'idx_operational_events_message');
  await addIndexIfMissing(queryInterface, ['event_type', 'created_at'], 'idx_operational_events_type_created');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const tableExists = await queryInterface.tableExists(TABLE_NAME);

  if (tableExists) {
    await queryInterface.dropTable(TABLE_NAME);
  }
}

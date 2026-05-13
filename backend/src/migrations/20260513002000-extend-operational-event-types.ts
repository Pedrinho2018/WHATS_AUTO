import { DataTypes, QueryInterface } from 'sequelize';

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

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableExists = await queryInterface.tableExists(TABLE_NAME);
  if (!tableExists) {
    return;
  }

  await queryInterface.changeColumn(TABLE_NAME, 'event_type', {
    type: DataTypes.ENUM(...EVENT_TYPES),
    allowNull: false,
  });
}

export async function down(): Promise<void> {
  // Mantido sem rollback destrutivo para nao quebrar ambientes que ja tenham eventos novos.
}

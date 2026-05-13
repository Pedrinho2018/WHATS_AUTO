import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface OperationalEventAttributes {
  id: number;
  company_id?: number;
  ticket_id?: number;
  message_id?: number;
  event_type:
    | 'webhook_received'
    | 'message_saved'
    | 'realtime_emitted'
    | 'message_send_failed'
    | 'message_send_retry'
    | 'login_success'
    | 'login_failed'
    | 'admin_action'
    | 'data_exported'
    | 'data_deleted'
    | 'retention_applied';
  status: 'success' | 'warning' | 'error';
  source: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
}

interface OperationalEventCreationAttributes extends Optional<OperationalEventAttributes, 'id' | 'company_id' | 'ticket_id' | 'message_id' | 'detail' | 'metadata' | 'created_at'> {}

class OperationalEvent extends Model<OperationalEventAttributes, OperationalEventCreationAttributes> implements OperationalEventAttributes {
  declare id: number;
  declare company_id?: number;
  declare ticket_id?: number;
  declare message_id?: number;
  declare event_type: OperationalEventAttributes['event_type'];
  declare status: 'success' | 'warning' | 'error';
  declare source: string;
  declare detail?: string;
  declare metadata?: Record<string, unknown>;
  declare readonly created_at: Date;
}

OperationalEvent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    message_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.ENUM(
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
        'retention_applied'
      ),
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
  },
  {
    sequelize,
    tableName: 'operational_events',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['company_id', 'created_at'] },
      { fields: ['ticket_id', 'created_at'] },
      { fields: ['message_id'] },
      { fields: ['event_type', 'created_at'] },
    ],
  }
);

export default OperationalEvent;

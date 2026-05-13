import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TicketAuditAttributes {
  id: number;
  company_id: number;
  ticket_id: number;
  actor_user_id?: number;
  actor_name?: string;
  action: 'created' | 'status_changed' | 'transferred' | 'message_sent';
  previous_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
}

interface TicketAuditCreationAttributes extends Optional<TicketAuditAttributes, 'id' | 'actor_user_id' | 'actor_name' | 'previous_value' | 'new_value' | 'metadata'> {}

class TicketAudit extends Model<TicketAuditAttributes, TicketAuditCreationAttributes> implements TicketAuditAttributes {
  declare id: number;
  declare company_id: number;
  declare ticket_id: number;
  declare actor_user_id?: number;
  declare actor_name?: string;
  declare action: 'created' | 'status_changed' | 'transferred' | 'message_sent';
  declare previous_value?: string;
  declare new_value?: string;
  declare metadata?: Record<string, unknown>;
  declare readonly created_at: Date;
}

TicketAudit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actor_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actor_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM('created', 'status_changed', 'transferred', 'message_sent'),
      allowNull: false,
    },
    previous_value: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    new_value: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ticket_audits',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['company_id', 'ticket_id', 'created_at'] },
      { fields: ['actor_user_id'] },
      { fields: ['action'] },
    ],
  }
);

export default TicketAudit;

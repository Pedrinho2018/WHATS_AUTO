import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// ═══════════════════════════════════════════════════════════════
// Interface & Types
// ═══════════════════════════════════════════════════════════════

interface MessageTemplateAttributes {
  id: number;
  company_id: number;
  name: string;
  content: string;
  category?: 'greeting' | 'closing' | 'help' | 'transfer' | 'custom';
  is_active: boolean;
}

interface MessageTemplateCreationAttributes extends Optional<MessageTemplateAttributes, 'id' | 'category' | 'is_active'> {}

// ═══════════════════════════════════════════════════════════════
// Model Definition
// ═══════════════════════════════════════════════════════════════

class MessageTemplate extends Model<MessageTemplateAttributes, MessageTemplateCreationAttributes> implements MessageTemplateAttributes {
  declare id: number;
  declare company_id: number;
  declare name: string;
  declare content: string;
  declare category?: 'greeting' | 'closing' | 'help' | 'transfer' | 'custom';
  declare is_active: boolean;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare deleted_at?: Date;
}

MessageTemplate.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('greeting', 'closing', 'help', 'transfer', 'custom'),
      defaultValue: 'custom',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'message_templates',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['company_id', 'is_active'],
      },
    ],
  }
);

export default MessageTemplate;

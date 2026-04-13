import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// ═══════════════════════════════════════════════════════════════
// Interface & Types
// ═══════════════════════════════════════════════════════════════

interface BotConfigAttributes {
  id: number;
  company_id: number;
  instance_id?: number;
  // Horário de atendimento
  opening_hour: string; // HH:mm
  closing_hour: string; // HH:mm
  // Dias da semana (0=domingo até 6=sábado)
  operating_days: number[]; // array com os dias
  // Feriados
  holidays?: Record<string, string>; // { "2024-12-25": "Natal", ... }
  // Mensagens
  welcome_message: string;
  standard_messages?: Record<string, string>; // { "greeting": "...", "goodbye": "...", ... }
  custom_data?: Record<string, unknown>;
  active: boolean;
}

interface BotConfigCreationAttributes extends Optional<BotConfigAttributes, 'id' | 'instance_id' | 'holidays' | 'standard_messages' | 'custom_data' | 'active'> {}

// ═══════════════════════════════════════════════════════════════
// Model Definition
// ═══════════════════════════════════════════════════════════════

class BotConfig extends Model<BotConfigAttributes, BotConfigCreationAttributes> implements BotConfigAttributes {
  declare id: number;
  declare company_id: number;
  declare instance_id?: number;
  declare opening_hour: string;
  declare closing_hour: string;
  declare operating_days: number[];
  declare holidays?: Record<string, string>;
  declare welcome_message: string;
  declare standard_messages?: Record<string, string>;
  declare custom_data?: Record<string, unknown>;
  declare active: boolean;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare deleted_at?: Date;
}

BotConfig.init(
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
    instance_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    opening_hour: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        is: /^\d{2}:\d{2}$/,
      },
    },
    closing_hour: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        is: /^\d{2}:\d{2}$/,
      },
    },
    operating_days: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [0, 1, 2, 3, 4, 5, 6],
    },
    holidays: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    welcome_message: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Olá! Bem-vindo.',
    },
    standard_messages: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        greeting: 'Olá',
        goodbye: 'Até logo',
        help: 'Como posso ajudar?',
        outside_hours: 'Fora do horário de atendimento',
        holiday: 'Contato fechado por feriado',
      },
    },
    custom_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'bot_configs',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['instance_id'] },
      { fields: ['active'] },
    ],
  }
);

export default BotConfig;

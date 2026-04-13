import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// ═══════════════════════════════════════════════════════════════
// Interface & Types
// ═══════════════════════════════════════════════════════════════

interface CompanyAttributes {
  id: number;
  name: string;
  subdomain: string;
  email: string;
  phone?: string;
  cnpj?: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  plan: 'basic' | 'professional' | 'enterprise';
  trial_ends_at?: Date;
  settings?: Record<string, unknown>;
}

interface CompanyCreationAttributes extends Optional<CompanyAttributes, 'id' | 'status' | 'plan' | 'settings'> {}

// ═══════════════════════════════════════════════════════════════
// Model Definition
// ═══════════════════════════════════════════════════════════════

class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  declare id: number;
  declare name: string;
  declare subdomain: string;
  declare email: string;
  declare phone?: string;
  declare cnpj?: string;
  declare status: 'active' | 'inactive' | 'suspended' | 'trial';
  declare plan: 'basic' | 'professional' | 'enterprise';
  declare trial_ends_at?: Date;
  declare settings?: Record<string, unknown>;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare deleted_at?: Date;
}

Company.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subdomain: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: true,
      validate: {
        is: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
      },
    },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'trial'),
      defaultValue: 'trial',
    },
    plan: {
      type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
      defaultValue: 'basic',
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'companies',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['subdomain'] },
      { fields: ['status'] },
    ],
  }
);

export default Company;
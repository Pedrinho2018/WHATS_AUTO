import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FlowWorkspaceAttributes {
  id: number;
  company_id: number;
  flow_id: number;
  workspace_model: Record<string, unknown>;
}

interface FlowWorkspaceCreationAttributes extends Optional<FlowWorkspaceAttributes, 'id' | 'workspace_model'> {}

class FlowWorkspace extends Model<FlowWorkspaceAttributes, FlowWorkspaceCreationAttributes> implements FlowWorkspaceAttributes {
  declare id: number;
  declare company_id: number;
  declare flow_id: number;
  declare workspace_model: Record<string, unknown>;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

FlowWorkspace.init(
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
    flow_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    workspace_model: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        nodes: [],
        connections: [],
      },
    },
  },
  {
    sequelize,
    tableName: 'flow_workspaces',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['company_id'] }, { fields: ['flow_id'], unique: true }],
  }
);

export default FlowWorkspace;

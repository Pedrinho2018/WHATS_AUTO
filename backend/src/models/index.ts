import sequelize from '../config/database';
import Company from './Company';
import User from './User';
import Instance from './Instance';
import Ticket from './Ticket';
import Message from './Message';
import MessageTemplate from './MessageTemplate';
import Flow from './Flow';
import FlowWorkspace from './FlowWorkspace';
import BotConfig from './BotConfig';

// ═══════════════════════════════════════════════════════════════
// Associações entre Models
// ═══════════════════════════════════════════════════════════════

// Company -> Users (1:N)
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company -> Instances (1:N)
Company.hasMany(Instance, { foreignKey: 'company_id', as: 'instances' });
Instance.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company -> Tickets (1:N)
Company.hasMany(Ticket, { foreignKey: 'company_id', as: 'tickets' });
Ticket.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Instance -> Tickets (1:N)
Instance.hasMany(Ticket, { foreignKey: 'instance_id', as: 'tickets' });
Ticket.belongsTo(Instance, { foreignKey: 'instance_id', as: 'instance' });

// User -> Tickets (1:N - assigned agent)
User.hasMany(Ticket, { foreignKey: 'user_id', as: 'assigned_tickets' });
Ticket.belongsTo(User, { foreignKey: 'user_id', as: 'agent' });

// Ticket -> Messages (1:N)
Ticket.hasMany(Message, { foreignKey: 'ticket_id', as: 'messages' });
Message.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

// Instance -> Messages (1:N)
Instance.hasMany(Message, { foreignKey: 'instance_id', as: 'messages' });
Message.belongsTo(Instance, { foreignKey: 'instance_id', as: 'instance' });

// Company -> Messages (1:N)
Company.hasMany(Message, { foreignKey: 'company_id', as: 'messages' });
Message.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company -> Flows (1:N)
Company.hasMany(Flow, { foreignKey: 'company_id', as: 'flows' });
Flow.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company -> Flow Workspaces (1:N)
Company.hasMany(FlowWorkspace, { foreignKey: 'company_id', as: 'flow_workspaces' });
FlowWorkspace.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Flow -> Flow Workspace (1:1)
Flow.hasOne(FlowWorkspace, { foreignKey: 'flow_id', as: 'workspace' });
FlowWorkspace.belongsTo(Flow, { foreignKey: 'flow_id', as: 'flow' });

// Company -> Message Templates (1:N)
Company.hasMany(MessageTemplate, { foreignKey: 'company_id', as: 'message_templates' });
MessageTemplate.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company -> BotConfigs (1:N)
Company.hasMany(BotConfig, { foreignKey: 'company_id', as: 'bot_configs' });
BotConfig.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

export {
  sequelize,
  Company,
  MessageTemplate,
  User,
  Instance,
  Ticket,
  Message,
  Flow,
  FlowWorkspace,
  BotConfig
};

export default {
  sequelize,
  MessageTemplate,
  Company,
  User,
  Instance,
  Ticket,
  Message,
  Flow,
  FlowWorkspace,
  BotConfig
};
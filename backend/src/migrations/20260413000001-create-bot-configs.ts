import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('bot_configs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    instance_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'instances',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    opening_hour: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '09:00',
      comment: 'Horário de abertura no formato HH:mm',
    },
    closing_hour: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '18:00',
      comment: 'Horário de fechamento no formato HH:mm',
    },
    operating_days: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [0, 1, 2, 3, 4, 5, 6],
      comment: 'Dias da semana operacionais (0=domingo até 6=sábado)',
    },
    holidays: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Feriados em formato {data: nome}',
    },
    welcome_message: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Olá! Bem-vindo.',
      comment: 'Mensagem de boas-vindas',
    },
    standard_messages: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Mensagens padrão como greeting, goodbye, help, outside_hours, holiday',
    },
    custom_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Dados customizados',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  // Criar índices
  await queryInterface.addIndex('bot_configs', ['company_id']);
  await queryInterface.addIndex('bot_configs', ['instance_id']);
  await queryInterface.addIndex('bot_configs', ['active']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('bot_configs');
}

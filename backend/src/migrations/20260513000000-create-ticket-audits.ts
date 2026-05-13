import { DataTypes, QueryInterface, Sequelize } from 'sequelize';

const TABLE_NAME = 'ticket_audits';
const INDEX_TIMELINE = 'idx_ticket_audits_company_ticket_created';

type IndexMetadata = {
  name?: string;
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
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      actor_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  }

  const indexes = (await queryInterface.showIndex(TABLE_NAME)) as IndexMetadata[];
  const hasTimelineIndex = indexes.some((index) => index.name === INDEX_TIMELINE);

  if (!hasTimelineIndex) {
    await queryInterface.addIndex(TABLE_NAME, ['company_id', 'ticket_id', 'created_at'], {
      name: INDEX_TIMELINE,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const tableExists = await queryInterface.tableExists(TABLE_NAME);

  if (tableExists) {
    await queryInterface.dropTable(TABLE_NAME);
  }
}

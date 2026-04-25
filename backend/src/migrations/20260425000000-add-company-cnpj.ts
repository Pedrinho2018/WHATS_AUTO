import { DataTypes, QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface.tableExists('companies');

    if (!tableExists) {
      console.log('Tabela companies nao existe. Pulando coluna cnpj.');
      return;
    }

    const columns = await queryInterface.describeTable('companies');

    if (columns.cnpj) {
      console.log('Coluna companies.cnpj ja existe. Pulando.');
      return;
    }

    await queryInterface.addColumn('companies', 'cnpj', {
      type: DataTypes.STRING(18),
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const tableExists = await queryInterface.tableExists('companies');

    if (!tableExists) {
      return;
    }

    const columns = await queryInterface.describeTable('companies');

    if (columns.cnpj) {
      await queryInterface.removeColumn('companies', 'cnpj');
    }
  },
};

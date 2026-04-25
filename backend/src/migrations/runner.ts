import { Sequelize, DataTypes } from 'sequelize';
import { QueryInterface } from 'sequelize/types';
import path from 'path';
import fs from 'fs';

export interface Migration {
  up: (queryInterface: QueryInterface) => Promise<void>;
  down: (queryInterface: QueryInterface) => Promise<void>;
}

class MigrationRunner {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Executar todas as migrações pendentes
   */
  async runPendingMigrations(): Promise<void> {
    try {
      console.log('🔄 Iniciando migrações Sequelize...');

      // Criar tabela de controle de migrações se não existir
      await this.ensureMigrationTable();

      // Obter lista de migrações executadas
      const executedMigrations = await this.getExecutedMigrations();

      // Obter lista de arquivos de migração
      const migrationFiles = await this.getMigrationFiles();

      // Filtrar migrações não executadas
      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Todas as migrações estão atualizadas');
        return;
      }

      // Executar migrações pendentes
      for (const migrationFile of pendingMigrations) {
        await this.executeMigration(migrationFile);
      }

      console.log('✅ Todas as migrações foram executadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao executar migrações:', error);
      throw error;
    }
  }

  /**
   * Executar uma migração específica
   */
  private async executeMigration(fileName: string): Promise<void> {
    try {
      console.log(`   └─ Executando: ${fileName}`);

      const migrationPath = this.resolveMigrationPath(fileName);
      
      // Usar import dinâmico com cache busting
      delete require.cache[require.resolve(migrationPath)];
      const migration = require(migrationPath);

      // Executar a função up
      if (typeof migration.up === 'function') {
        await migration.up(this.sequelize.getQueryInterface());
      }

      // Registrar a migração como executada
      await this.recordMigration(fileName);

      console.log(`   ✓ ${fileName} concluída`);
    } catch (error) {
      console.error(`   ✗ Erro em ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Criar tabela de controle de migrações
   */
  private async ensureMigrationTable(): Promise<void> {
    const queryInterface = this.sequelize.getQueryInterface();

    const tableExists = await queryInterface.tableExists('sequelizemeta');

    if (!tableExists) {
      await queryInterface.createTable('sequelizemeta', {
        name: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        executed_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }
  }

  /**
   * Obter migrações já executadas
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const results = await this.sequelize.query(
        'SELECT name FROM sequelizemeta ORDER BY executed_at ASC'
      );

      if (Array.isArray(results[0])) {
        return results[0].map((row: any) => this.canonicalMigrationName(row.name));
      }

      return [];
    } catch (error) {
      console.warn('Não foi possível ler migrações executadas');
      return [];
    }
  }

  /**
   * Obter lista de arquivos de migração
   */
  private async getMigrationFiles(): Promise<string[]> {
    const migrationsDir = __dirname;

    try {
      const files = fs.readdirSync(migrationsDir);

      const migrationFiles = files
        .filter(
          (file) =>
            file.match(/^\d{14}-.*\.(ts|js)$/) && 
            !file.includes('.d.') && 
            file !== 'runner.js' &&
            file !== 'index.js' &&
            file !== 'cli.js'
        )
        .map((file) => this.canonicalMigrationName(file));

      return Array.from(new Set(migrationFiles))
        .sort();
    } catch (error) {
      console.warn('Diretório de migrações não encontrado');
      return [];
    }
  }

  private canonicalMigrationName(fileName: string): string {
    return fileName.replace(/\.js$/, '.ts');
  }

  private resolveMigrationPath(fileName: string): string {
    const candidates = [
      path.join(__dirname, fileName),
      path.join(__dirname, fileName.replace(/\.ts$/, '.js')),
      path.join(__dirname, fileName.replace(/\.js$/, '.ts')),
    ];

    const migrationPath = candidates.find((candidate) => fs.existsSync(candidate));

    if (!migrationPath) {
      throw new Error(`Arquivo de migracao nao encontrado: ${fileName}`);
    }

    return migrationPath;
  }

  /**
   * Registrar migração como executada
   */
  private async recordMigration(fileName: string): Promise<void> {
    await this.sequelize.query(
      'INSERT IGNORE INTO sequelizemeta (name) VALUES (?)',
      {
        replacements: [this.canonicalMigrationName(fileName)],
      }
    );
  }

  /**
   * Reverter última migração
   */
  async rollbackLastMigration(): Promise<void> {
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      const lastMigration = await this.getLastMigration();

      if (!lastMigration) {
        console.log('Nenhuma migração para reverter');
        return;
      }

      const migrationPath = this.resolveMigrationPath(lastMigration);
      delete require.cache[require.resolve(migrationPath)];
      const migration = require(migrationPath);

      if (typeof migration.down === 'function') {
        await migration.down(queryInterface);
      }

      // Remover registro de migrações
      await this.sequelize.query(
        'DELETE FROM sequelizemeta WHERE name = ?',
        {
          replacements: [lastMigration],
        }
      );

      console.log(`✅ Migração ${lastMigration} revertida com sucesso`);
    } catch (error) {
      console.error('❌ Erro ao reverter migração:', error);
      throw error;
    }
  }

  /**
   * Obter última migração executada
   */
  private async getLastMigration(): Promise<string | null> {
    const results = await this.sequelize.query(
      'SELECT name FROM sequelizemeta ORDER BY executed_at DESC LIMIT 1'
    );

    if (Array.isArray(results[0]) && results[0].length > 0) {
      const [firstRow] = results[0] as Array<{ name: string }>;
      return firstRow?.name ?? null;
    }

    return null;
  }

  /**
   * Listar status de todas as migrações
   */
  async listMigrationStatus(): Promise<void> {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = await this.getMigrationFiles();

      console.log('\n📋 Status das Migrações:');
      console.log('═'.repeat(60));

      for (const migration of allMigrations) {
        const isExecuted = executedMigrations.includes(migration);
        const status = isExecuted ? '✅' : '⏳';
        console.log(`${status} ${migration}`);
      }

      console.log('═'.repeat(60));
      console.log(
        `Total: ${allMigrations.length} | Executadas: ${executedMigrations.length} | Pendentes: ${
          allMigrations.length - executedMigrations.length
        }`
      );
    } catch (error) {
      console.error('Erro ao listar migrações:', error);
    }
  }
}

export default MigrationRunner;

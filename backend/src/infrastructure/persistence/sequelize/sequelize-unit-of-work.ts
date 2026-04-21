import sequelize from '../../../config/database';
import { Transaction } from 'sequelize';
import { TransactionContext, UnitOfWork } from '../../../application/chatbot/persistence/unit-of-work';

export default class SequelizeUnitOfWork implements UnitOfWork {
  async runInTransaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return sequelize.transaction(async (tx: Transaction) => {
      return work({ tx });
    });
  }
}

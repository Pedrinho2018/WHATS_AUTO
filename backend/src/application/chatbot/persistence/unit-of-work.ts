import { Transaction } from 'sequelize';

export interface TransactionContext {
  tx: Transaction;
}

export interface UnitOfWork {
  runInTransaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}

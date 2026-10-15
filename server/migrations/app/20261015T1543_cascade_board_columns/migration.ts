#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/216997a7e73a7cb1393a6d68459ba86371530d8d8c4bf49ca8b2c9d0037484bf/contract';
import startContract from '../../snapshots/216997a7e73a7cb1393a6d68459ba86371530d8d8c4bf49ca8b2c9d0037484bf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/473ff0ee45a4bda4e1268d41b9d589f0ee29a97a38042365ccba08db5f6d940f/contract';
import endContract from '../../snapshots/473ff0ee45a4bda4e1268d41b9d589f0ee29a97a38042365ccba08db5f6d940f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'boardColumn',
        constraint: 'boardColumn_boardId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'boardColumn',
        foreignKey: {
          name: 'boardColumn_boardId_fkey',
          columns: ['boardId'],
          references: {
            schema: 'public',
            table: 'board',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

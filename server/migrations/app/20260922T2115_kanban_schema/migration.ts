#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7279536127282ae53331afd9353ca73c403ef08c1237385f73f0a54858a56227/contract';
import endContract from '../../snapshots/7279536127282ae53331afd9353ca73c403ef08c1237385f73f0a54858a56227/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/85dd4ff63d55908ccf1bf7aa22e5244c4fa455cfabcb142d1953c6e3348d60ce/contract';
import startContract from '../../snapshots/85dd4ff63d55908ccf1bf7aa22e5244c4fa455cfabcb142d1953c6e3348d60ce/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);

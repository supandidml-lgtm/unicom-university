import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

const productionPasswordOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

const testPasswordOptions = {
  type: argon2.argon2id,
  memoryCost: 4_096,
  timeCost: 1,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  private dummyHash?: string;

  async hash(password: string): Promise<string> {
    return argon2.hash(password, this.options());
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    return argon2.verify(passwordHash, password);
  }

  async verifyDummy(password: string): Promise<void> {
    this.dummyHash ??= await this.hash('not-a-real-user-password');
    await this.verify(this.dummyHash, password);
  }

  private options(): typeof productionPasswordOptions | typeof testPasswordOptions {
    // The lower-cost profile is intentionally restricted to NODE_ENV=test.
    return process.env['NODE_ENV'] === 'test' ? testPasswordOptions : productionPasswordOptions;
  }
}

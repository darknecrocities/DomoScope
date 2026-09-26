import { describe, it, expect } from 'vitest';
import { parseDatabaseFiles } from '../src/services/databaseParser';

describe('Database / ERD Parser', () => {
  it('parses Prisma models, columns, and relations', () => {
    const prismaContent = `
      model User {
        id        Int      @id @default(autoincrement())
        email     String   @unique
        posts     Post[]
      }

      model Post {
        id        Int      @id @default(autoincrement())
        title     String
        authorId  Int
        author    User     @relation(fields: [authorId], references: [id])
      }
    `;

    const result = parseDatabaseFiles([
      { path: 'prisma/schema.prisma', content: prismaContent },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('User');
    expect(result.tables.map((t) => t.name)).toContain('Post');

    const postTable = result.tables.find((t) => t.name === 'Post');
    expect(postTable?.columns.some((c) => c.name === 'authorId')).toBe(true);

    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.relationships[0].isInferred).toBe(false);
  });

  it('parses SQL DDL CREATE TABLE statements', () => {
    const sqlContent = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        created_at TIMESTAMP
      );

      CREATE TABLE articles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL
      );
    `;

    const result = parseDatabaseFiles([
      { path: 'migrations/001_init.sql', content: sqlContent },
    ]);

    expect(result.tables.length).toBe(2);
    const users = result.tables.find((t) => t.name === 'users');
    expect(users?.columns.find((c) => c.name === 'id')?.isPrimary).toBe(true);
  });
});

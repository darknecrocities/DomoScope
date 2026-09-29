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

  it('synthesizes database tables and relationships from TypeScript interfaces', () => {
    const tsContent = `
      export interface User {
        id: string;
        email: string;
        fullName: string;
      }

      export interface Order {
        id: string;
        userId: string;
        amount: number;
        status: string;
      }
    `;

    const result = parseDatabaseFiles([
      { path: 'src/types/models.ts', content: tsContent },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('User');
    expect(result.tables.map((t) => t.name)).toContain('Order');

    const orderTable = result.tables.find((t) => t.name === 'Order');
    expect(orderTable?.columns.some((c) => c.name === 'userId' && c.isForeignKey)).toBe(true);
    expect(result.relationships.some((r) => r.fromTable === 'Order' && r.toTable === 'User')).toBe(true);
  });

  it('synthesizes entities from Go structs and Python Pydantic models', () => {
    const goContent = `
      type Customer struct {
        ID        uint      \`json:"id"\`
        Name      string    \`json:"name"\`
        Email     string    \`json:"email"\`
      }
    `;

    const pyContent = `
      class Invoice(BaseModel):
        id: int
        customer_id: int
        total: float
    `;

    const result = parseDatabaseFiles([
      { path: 'models/customer.go', content: goContent },
      { path: 'schemas/invoice.py', content: pyContent },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('Customer');
    expect(result.tables.map((t) => t.name)).toContain('Invoice');
  });

  it('dynamically infers authentic relationships between domain models and guards against false positives', () => {
    const userDart = `
      class UserProfile {
        final String id;
        final String email;
        final String name;
      }
    `;

    const emergencyDart = `
      class EmergencyContact {
        final String id;
        final String userId;
        final String name;
        final String phone;
        final String relationship;
        final bool isActive;
      }
    `;

    const preferencesDart = `
      class UserPreferences {
        final String id;
        final String userId;
        final String language;
        final bool faceIdUnlock;
        final String appearanceTheme;
        final bool globalNotifications;
      }
    `;

    const notificationDart = `
      class AppNotification {
        final String id;
        final String title;
        final String body;
        final DateTime timestamp;
        bool isRead;
      }
    `;

    const result = parseDatabaseFiles([
      { path: 'lib/models/user_profile.dart', content: userDart },
      { path: 'lib/models/emergency_contact.dart', content: emergencyDart },
      { path: 'lib/models/user_preferences.dart', content: preferencesDart },
      { path: 'lib/models/app_notification.dart', content: notificationDart },
    ]);

    expect(result.tables.length).toBe(4);
    expect(result.tables.map((t) => t.name)).toContain('UserProfile');
    expect(result.tables.map((t) => t.name)).toContain('EmergencyContact');
    expect(result.tables.map((t) => t.name)).toContain('UserPreferences');
    expect(result.tables.map((t) => t.name)).toContain('AppNotification');

    // EmergencyContact and UserPreferences have userId -> links to UserProfile
    expect(result.relationships.some((r) => r.fromTable === 'EmergencyContact' && r.toTable === 'UserProfile')).toBe(true);
    expect(result.relationships.some((r) => r.fromTable === 'UserPreferences' && r.toTable === 'UserProfile')).toBe(true);

    // Boolean globalNotifications MUST NOT link to AppNotification (no hardcoded substring bias!)
    expect(result.relationships.some((r) => r.fromColumn === 'globalNotifications')).toBe(false);

    // Phone string MUST NOT link to UserPreferences
    expect(result.relationships.some((r) => r.fromColumn === 'phone')).toBe(false);
  });

  it('correctly handles standalone tables without forcing artificial connections', () => {
    const result = parseDatabaseFiles([
      { path: 'user.ts', content: 'export interface UserProfile { username: string; bio: string; }' },
      { path: 'session.ts', content: 'export interface UserSession { token: string; expiresAt: number; }' },
      { path: 'log.ts', content: 'export interface AuditLog { entry: string; timestamp: number; }' },
    ]);

    expect(result.tables.length).toBe(3);
    // Unrelated models with no foreign key properties remain independent
    expect(result.relationships.length).toBe(0);
  });

  it('parses Mermaid erDiagram markdown files', () => {
    const mermaidContent = `
      # Architecture Documentation
      \`\`\`mermaid
      erDiagram
        CUSTOMER ||--o{ ORDER : places
        ORDER ||--|{ LINE_ITEM : contains
        CUSTOMER {
          string id PK
          string name
          string email
        }
        ORDER {
          int id PK
          string customer_id FK
          string status
        }
      \`\`\`
    `;

    const result = parseDatabaseFiles([
      { path: 'docs/architecture/erd.md', content: mermaidContent },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('CUSTOMER');
    expect(result.tables.map((t) => t.name)).toContain('ORDER');
    expect(result.relationships.length).toBeGreaterThan(0);
  });

  it('parses Supabase generated TypeScript database definitions with explicit relationships', () => {
    const supabaseTs = `
      export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

      export type Database = {
        public: {
          Tables: {
            profiles: {
              Row: {
                id: string;
                username: string | null;
                avatar_url: string | null;
                updated_at: string | null;
              };
              Insert: { id: string; username?: string | null };
              Update: { id?: string; username?: string | null };
              Relationships: [
                {
                  foreignKeyName: "profiles_id_fkey";
                  columns: ["id"];
                  isOneToOne: true;
                  referencedRelation: "users";
                  referencedColumns: ["id"];
                }
              ];
            };
            posts: {
              Row: {
                id: number;
                title: string;
                author_id: string;
                created_at: string;
              };
              Insert: { id?: number; title: string; author_id: string };
              Update: { id?: number; title?: string; author_id?: string };
              Relationships: [
                {
                  foreignKeyName: "posts_author_id_fkey";
                  columns: ["author_id"];
                  isOneToOne: false;
                  referencedRelation: "profiles";
                  referencedColumns: ["id"];
                }
              ];
            };
          };
        };
      };
    `;

    const result = parseDatabaseFiles([
      { path: 'src/types/database.types.ts', content: supabaseTs },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('profiles');
    expect(result.tables.map((t) => t.name)).toContain('posts');
    expect(result.detectedTypes).toContain('Supabase');

    const postsTable = result.tables.find((t) => t.name === 'posts');
    expect(postsTable?.columns.some((c) => c.name === 'author_id' && c.isForeignKey)).toBe(true);

    const rel = result.relationships.find((r) => r.fromTable === 'posts' && r.toTable === 'profiles');
    expect(rel).toBeDefined();
    expect(rel?.fromColumn).toBe('author_id');
    expect(rel?.toColumn).toBe('id');
  });

  it('parses Firebase Firestore rules and maps subcollection relationships', () => {
    const firestoreRules = `
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /users/{userId} {
            allow read: if request.auth != null;
            allow write: if request.auth.uid == userId;

            match /orders/{orderId} {
              allow read, write: if request.auth.uid == userId;
            }

            match /notifications/{notificationId} {
              allow read: if request.auth.uid == userId;
            }
          }

          match /chats/{chatId} {
            allow read, write: if request.auth != null;

            match /messages/{messageId} {
              allow read, write: if request.auth != null;
            }
          }
        }
      }
    `;

    const result = parseDatabaseFiles([
      { path: 'firestore.rules', content: firestoreRules },
    ]);

    expect(result.tables.length).toBeGreaterThanOrEqual(4);
    expect(result.tables.map((t) => t.name)).toContain('users');
    expect(result.tables.map((t) => t.name)).toContain('orders');
    expect(result.tables.map((t) => t.name)).toContain('chats');
    expect(result.tables.map((t) => t.name)).toContain('messages');
    expect(result.detectedTypes).toContain('Firebase / Firestore');

    // Subcollections orders and notifications link to parent users
    expect(result.relationships.some((r) => r.fromTable === 'orders' && r.toTable === 'users')).toBe(true);
    expect(result.relationships.some((r) => r.fromTable === 'messages' && r.toTable === 'chats')).toBe(true);
  });

  it('parses MongoDB / Mongoose schemas with ref relationships', () => {
    const mongooseContent = `
      import mongoose, { Schema } from 'mongoose';

      const UserSchema = new Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
      });

      const ArticleSchema = new Schema({
        title: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: String,
        created_at: { type: Date, default: Date.now },
      });

      export const User = mongoose.model('User', UserSchema);
      export const Article = mongoose.model('Article', ArticleSchema);
    `;

    const result = parseDatabaseFiles([
      { path: 'src/models/article.js', content: mongooseContent },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('User');
    expect(result.tables.map((t) => t.name)).toContain('Article');
    expect(result.detectedTypes).toContain('MongoDB / Mongoose');

    const articleTable = result.tables.find((t) => t.name === 'Article');
    expect(articleTable?.columns.some((c) => c.name === 'author' && c.isForeignKey)).toBe(true);
    expect(result.relationships.some((r) => r.fromTable === 'Article' && r.toTable === 'User')).toBe(true);
  });

  it('parses TypeORM entities with @ManyToOne and @JoinColumn', () => {
    const typeormContent = `
      import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

      @Entity('users')
      export class User {
        @PrimaryGeneratedColumn('uuid')
        id: string;

        @Column()
        name: string;
      }

      @Entity('projects')
      export class Project {
        @PrimaryGeneratedColumn()
        id: number;

        @Column()
        title: string;

        @ManyToOne(() => User)
        @JoinColumn({ name: 'owner_id' })
        owner: User;
      }
    `;

    const result = parseDatabaseFiles([
      { path: 'src/entities/Project.ts', content: typeormContent },
    ]);

    expect(result.tables.length).toBe(2);
    expect(result.tables.map((t) => t.name)).toContain('users');
    expect(result.tables.map((t) => t.name)).toContain('projects');
    expect(result.detectedTypes).toContain('TypeORM');

    expect(result.relationships.some((r) => r.fromTable === 'projects' && r.toTable === 'users' && r.fromColumn === 'owner_id')).toBe(true);
  });
});

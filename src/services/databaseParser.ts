import { DatabaseSchema, DatabaseTable, TableColumn, TableRelationship } from '../types';

export function parseDatabaseFiles(files: { path: string; content: string }[]): DatabaseSchema {
  const tables: DatabaseTable[] = [];
  const relationships: TableRelationship[] = [];
  const detectedTypes = new Set<string>();
  const sourceFiles = new Set<string>();

  for (const file of files) {
    const lowerPath = file.path.toLowerCase();

    // 1. Prisma Schema
    if (lowerPath.endsWith('schema.prisma') || lowerPath.includes('.prisma')) {
      const prismaTables = parsePrismaSchema(file.content, file.path);
      if (prismaTables.length > 0) {
        tables.push(...prismaTables);
        detectedTypes.add('Prisma');
        sourceFiles.add(file.path);
      }
    }

    // 2. Supabase Database Types & Schemas
    if (
      (lowerPath.includes('supabase') || lowerPath.includes('database.types') || lowerPath.includes('types_db')) &&
      (file.content.includes('Tables:') || file.content.includes('Relationships:'))
    ) {
      const supabaseResult = parseSupabaseSchema(file.content, file.path);
      if (supabaseResult.tables.length > 0) {
        tables.push(...supabaseResult.tables);
        relationships.push(...supabaseResult.relationships);
        detectedTypes.add('Supabase');
        sourceFiles.add(file.path);
      }
    }

    // 3. SQL DDL (PostgreSQL, MySQL, SQLite, Supabase Migrations)
    if (
      lowerPath.endsWith('.sql') ||
      lowerPath.includes('migrations/') ||
      (file.content.includes('CREATE TABLE') && !lowerPath.endsWith('.test.ts'))
    ) {
      const sqlResult = parseSqlSchema(file.content, file.path);
      if (sqlResult.tables.length > 0) {
        tables.push(...sqlResult.tables);
        relationships.push(...sqlResult.relationships);
        const dialect = lowerPath.includes('supabase')
          ? 'Supabase SQL'
          : file.content.includes('SERIAL') || file.content.includes('uuid_generate') || file.content.includes('timestamptz')
          ? 'PostgreSQL'
          : file.content.includes('AUTO_INCREMENT')
          ? 'MySQL'
          : file.content.includes('AUTOINCREMENT')
          ? 'SQLite'
          : 'SQL';
        detectedTypes.add(dialect);
        sourceFiles.add(file.path);
      }
    }

    // 4. Firebase Firestore & Rules
    if (
      lowerPath.endsWith('firestore.rules') ||
      lowerPath.includes('firestore') ||
      file.content.includes('service cloud.firestore') ||
      file.content.includes('FirebaseFirestore') ||
      file.content.includes('collection(db,')
    ) {
      const fbResult = parseFirebaseSchema(file.content, file.path);
      if (fbResult.tables.length > 0) {
        tables.push(...fbResult.tables);
        relationships.push(...fbResult.relationships);
        detectedTypes.add('Firebase / Firestore');
        sourceFiles.add(file.path);
      }
    }

    // 5. MongoDB & Mongoose Schemas
    if (
      file.content.includes('mongoose.Schema') ||
      file.content.includes('new Schema(') ||
      file.content.includes('Schema.Types.ObjectId')
    ) {
      const mongoResult = parseMongooseSchema(file.content, file.path);
      if (mongoResult.tables.length > 0) {
        tables.push(...mongoResult.tables);
        relationships.push(...mongoResult.relationships);
        detectedTypes.add('MongoDB / Mongoose');
        sourceFiles.add(file.path);
      }
    }

    // 6. TypeORM Entities
    if (
      file.content.includes('@Entity') &&
      (file.content.includes('@Column') || file.content.includes('@ManyToOne') || file.content.includes('@PrimaryGeneratedColumn'))
    ) {
      const typeormResult = parseTypeOrmSchema(file.content, file.path);
      if (typeormResult.tables.length > 0) {
        tables.push(...typeormResult.tables);
        relationships.push(...typeormResult.relationships);
        detectedTypes.add('TypeORM');
        sourceFiles.add(file.path);
      }
    }

    // 7. Drizzle ORM
    if (
      file.content.includes('pgTable(') ||
      file.content.includes('mysqlTable(') ||
      file.content.includes('sqliteTable(')
    ) {
      const drizzleTables = parseDrizzleSchema(file.content, file.path);
      if (drizzleTables.length > 0) {
        tables.push(...drizzleTables);
        detectedTypes.add('Drizzle');
        sourceFiles.add(file.path);
      }
    }

    // 8. Flutter Drift / Moor
    if (file.content.includes('extends Table') || file.content.includes('package:drift/')) {
      const driftTables = parseDriftSchema(file.content, file.path);
      if (driftTables.length > 0) {
        tables.push(...driftTables);
        detectedTypes.add('Flutter Drift');
        sourceFiles.add(file.path);
      }
    }

    // 9. Android Room (Java/Kotlin)
    if (file.content.includes('@Entity') && (file.content.includes('androidx.room') || file.content.includes('tableName'))) {
      const roomTables = parseRoomSchema(file.content, file.path);
      if (roomTables.length > 0) {
        tables.push(...roomTables);
        detectedTypes.add('Android Room');
        sourceFiles.add(file.path);
      }
    }

    // 10. Python SQLAlchemy & Django ORM
    if (file.content.includes('Base') || file.content.includes('Column(') || file.content.includes('models.Model')) {
      const pyTables = parsePythonSchema(file.content, file.path);
      if (pyTables.length > 0) {
        tables.push(...pyTables);
        detectedTypes.add(file.content.includes('models.Model') ? 'Django ORM' : 'SQLAlchemy');
        sourceFiles.add(file.path);
      }
    }

    // 11. Mermaid ERD Diagrams
    if (file.content.includes('erDiagram') || lowerPath.endsWith('.mermaid') || lowerPath.endsWith('.mmd')) {
      const mermaidResult = parseMermaidSchema(file.content, file.path);
      if (mermaidResult.tables.length > 0) {
        tables.push(...mermaidResult.tables);
        relationships.push(...mermaidResult.relationships);
        detectedTypes.add('Mermaid ERD');
        sourceFiles.add(file.path);
      }
    }
  }

  // Deduplicate tables by name (keeping the most detailed)
  const uniqueTablesMap = new Map<string, DatabaseTable>();
  for (const t of tables) {
    const existing = uniqueTablesMap.get(t.name.toLowerCase());
    if (!existing || t.columns.length > existing.columns.length) {
      uniqueTablesMap.set(t.name.toLowerCase(), t);
    }
  }

  let finalTables = Array.from(uniqueTablesMap.values());

  // Fallback: Universal Domain Model Synthesizer (Ensures EVERY repository has a complete ERD diagram!)
  if (finalTables.length === 0 && files.length > 0) {
    const synthesizedTables = synthesizeDomainEntities(files);
    if (synthesizedTables.length > 0) {
      finalTables = synthesizedTables;
      detectedTypes.add('Domain Entity Model');
    }
  }

  const uniqueRelationships = inferDatabaseRelationships(finalTables, relationships);

  return {
    tables: finalTables,
    relationships: uniqueRelationships,
    detectedTypes: Array.from(detectedTypes),
    sourceFiles: Array.from(sourceFiles),
  };
}

/**
 * Intelligently infers and establishes authentic PK -> FK relationships between tables
 * across any programming language, ORM, SQL, or domain entity model with zero hardcoded bias.
 */
export function inferDatabaseRelationships(
  tables: DatabaseTable[],
  initialRelationships: TableRelationship[] = []
): TableRelationship[] {
  if (!tables || tables.length <= 1) return initialRelationships || [];

  // Step 1: Ensure every table has at least one clearly designated Primary Key (PK)
  for (const table of tables) {
    const hasPk = table.columns.some((c) => c.isPrimary);
    if (!hasPk && table.columns.length > 0) {
      let candidate = table.columns.find((c) =>
        /^(id|_id|uuid|key|code|pk)$/i.test(c.name)
      );
      if (!candidate) {
        candidate = table.columns.find((c) =>
          c.name.toLowerCase() === `${table.name.toLowerCase()}id` ||
          c.name.toLowerCase() === `${table.name.toLowerCase()}_id`
        );
      }
      if (!candidate) {
        candidate = table.columns.find((c) =>
          /^(name|title|slug|username|email|identifier|token)$/i.test(c.name)
        );
      }
      if (!candidate) {
        candidate = table.columns[0];
      }
      if (candidate) {
        candidate.isPrimary = true;
      }
    }
  }

  const relationships: TableRelationship[] = [];
  const relKeys = new Set<string>();

  // Ingest any explicit initial relationships (e.g. from Mermaid ERDs)
  for (const rel of initialRelationships) {
    const directKey = `${rel.fromTable.toLowerCase()}-${rel.toTable.toLowerCase()}`;
    if (!relKeys.has(directKey)) {
      relKeys.add(directKey);
      relationships.push(rel);
    }
  }

  const tableNamesLower = new Map<string, DatabaseTable>();
  for (const t of tables) {
    tableNamesLower.set(t.name.toLowerCase(), t);
  }

  const getTablePk = (t: DatabaseTable): TableColumn => {
    return t.columns.find((c) => c.isPrimary) || t.columns[0];
  };

  const NON_FK_TYPES = new Set([
    'bool', 'boolean', 'float', 'double', 'real', 'date', 'datetime', 'time',
    'timestamp', 'timestamptz', 'json', 'jsonb', 'blob', 'bytes', 'bytea',
  ]);

  const PRIMITIVE_TYPES = new Set([
    'string', 'str', 'text', 'varchar', 'char', 'int', 'integer', 'int4', 'int8', 'bigint',
    'smallint', 'tinyint', 'number', 'numeric', 'decimal', 'float', 'double', 'real',
    'bool', 'boolean', 'datetime', 'date', 'time', 'timestamp', 'timestamptz',
    'map', 'list', 'set', 'array', 'dict', 'record', 'dynamic', 'void', 'any', 'unknown',
    'object', 'never', 'null', 'undefined', 'byte', 'bytes', 'blob', 'json', 'jsonb',
    'uuid', 'future', 'stream', 'promise', 'function'
  ]);

  // Helper to safely add a unique relationship and update column metadata
  const addRel = (
    fromTable: DatabaseTable,
    fromCol: TableColumn,
    toTable: DatabaseTable,
    toCol: TableColumn,
    type: 'one-to-many' | 'one-to-one' | 'many-to-many' = 'one-to-many',
    isInferred: boolean = true
  ) => {
    if (fromTable.name.toLowerCase() === toTable.name.toLowerCase()) return;

    // Check if reverse relationship already exists to prevent duplicate circular edges
    const reverseKey = `${toTable.name.toLowerCase()}-${fromTable.name.toLowerCase()}`;
    const directKey = `${fromTable.name.toLowerCase()}-${toTable.name.toLowerCase()}`;

    if (relKeys.has(directKey) || relKeys.has(reverseKey)) {
      return;
    }

    relKeys.add(directKey);

    fromCol.isForeignKey = true;
    fromCol.references = {
      table: toTable.name,
      column: toCol.name,
    };

    const id = `rel-${fromTable.name}-${fromCol.name}-${toTable.name}-${toCol.name}`;
    relationships.push({
      id,
      fromTable: fromTable.name,
      fromColumn: fromCol.name,
      toTable: toTable.name,
      toColumn: toCol.name,
      type,
      isInferred,
    });
  };

  // PASS 1: Explicit Constraints (SQL REFERENCES, Prisma @relation, Drizzle .references, Drift, Room, Django, SQLAlchemy)
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.references) {
        const targetTable = tableNamesLower.get(col.references.table.toLowerCase());
        if (targetTable) {
          const targetCol =
            targetTable.columns.find((c) => c.name.toLowerCase() === col.references!.column.toLowerCase()) ||
            getTablePk(targetTable);
          addRel(table, col, targetTable, targetCol, 'one-to-many', false);
        }
      }
    }
  }

  // PASS 2: Type-based Entity Declarations (e.g. user: User, contact: EmergencyContact, items: List<OrderItem>)
  for (const table of tables) {
    for (const col of table.columns) {
      const typeCandidates = col.type
        .replace(/[<>[\]?*&]/g, ' ')
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const rawType of typeCandidates) {
        const lowerType = rawType.toLowerCase();
        if (PRIMITIVE_TYPES.has(lowerType)) continue;

        const matchedTable = tableNamesLower.get(lowerType);
        if (matchedTable && matchedTable.name.toLowerCase() !== table.name.toLowerCase()) {
          const targetPk = getTablePk(matchedTable);
          const isList = /list|array|set|\[\]/i.test(col.type);
          addRel(table, col, matchedTable, targetPk, isList ? 'many-to-many' : 'one-to-many', true);
        }
      }
    }
  }

  // Helper to normalize table and column entity stems (e.g. "EmergencyContacts" -> "emergencycontact", "tbl_users" -> "user")
  const normalizeEntityName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^(tbl_|t_|dim_|fact_)/, '')
      .replace(/(_tbl|_table|_entity|_model|_schema)$/, '')
      .replace(/[_-]/g, '')
      .replace(/ies$/, 'y')
      .replace(/ses$/, 's')
      .replace(/s$/, '');
  };

  // Precompute normalized target table names
  const normalizedTargets = new Map<string, DatabaseTable>();
  for (const t of tables) {
    normalizedTargets.set(normalizeEntityName(t.name), t);
  }

  // PASS 3: Semantic Foreign Key Identifier Matching
  // Recognizes standardized FK conventions: {table}_id, {table}Id, {table}_uuid, {table}Uuid, {table}_key, {table}_fk
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isPrimary || col.references) continue;

      const colTypeLower = col.type.toLowerCase();
      // Strict Type Guard: Booleans, dates, timestamps, floats, blobs are NEVER foreign keys
      if (NON_FK_TYPES.has(colTypeLower)) continue;

      // Extract stem from foreign key identifier
      const fkMatch = col.name.match(/^(.+?)(?:_id|Id|_uuid|Uuid|_key|Key|_fk|Fk)$/);
      if (!fkMatch) continue;

      const rawStem = fkMatch[1];
      if (rawStem.length < 2) continue;

      const normColStem = normalizeEntityName(rawStem);

      // 1. Direct normalized entity match (e.g. "userId" -> stem "user" -> matches "User" / "Users")
      let targetTable = normalizedTargets.get(normColStem);

      // 2. Target entity name prefix match (e.g. "userId" -> stem "user" -> matches "UserProfile" / "UserData")
      if (!targetTable && normColStem.length >= 3) {
        for (const [normTName, t] of normalizedTargets.entries()) {
          if (t.name.toLowerCase() === table.name.toLowerCase()) continue;
          if (normTName.startsWith(normColStem)) {
            targetTable = t;
            break;
          }
        }
      }

      // 3. Role-based prefix match (e.g. "parent_category_id" -> ends with "category", "sender_user_id" -> ends with "user")
      if (!targetTable) {
        for (const [normTName, t] of normalizedTargets.entries()) {
          if (t.name.toLowerCase() === table.name.toLowerCase()) continue;
          if (normTName.length >= 3 && normColStem.endsWith(normTName)) {
            targetTable = t;
            break;
          }
        }
      }

      if (targetTable && targetTable.name.toLowerCase() !== table.name.toLowerCase()) {
        const targetPk = getTablePk(targetTable);
        addRel(table, col, targetTable, targetPk, 'one-to-many', true);
      }
    }
  }

  return relationships;
}

function parsePrismaSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const columns: TableColumn[] = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;

      const tokens = line.split(/\s+/);
      if (tokens.length >= 2) {
        const colName = tokens[0];
        const colType = tokens[1];
        const isPrimary = line.includes('@id');
        const isNullable = colType.endsWith('?');

        let references: TableColumn['references'] = undefined;
        const relMatch = line.match(/@relation\([^)]*fields:\s*\[([^\]]+)\],[^)]*references:\s*\[([^\]]+)\]/);
        if (relMatch) {
          references = {
            table: colType.replace('?', '').replace('[]', ''),
            column: relMatch[2].trim(),
          };
        }

        columns.push({
          name: colName,
          type: colType,
          isPrimary,
          isNullable,
          isForeignKey: Boolean(references) || line.includes('@relation'),
          references,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        name: modelName,
        columns,
        sourceFile,
        schemaType: 'prisma',
      });
    }
  }

  return tables;
}

function parseSqlSchema(
  content: string,
  sourceFile: string
): { tables: DatabaseTable[]; relationships: TableRelationship[] } {
  const tables: DatabaseTable[] = [];
  const relationships: TableRelationship[] = [];
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(([\s\S]*?)\)\s*;/gi;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[2];
    const body = match[3];
    const columns: TableColumn[] = [];

    const lines = body.split(/,\s*(?![^(]*\))/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('--') || line.startsWith('/*')) {
        continue;
      }

      // Handle table-level FOREIGN KEY constraint:
      // CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
      // FOREIGN KEY (user_id) REFERENCES users(id)
      const fkConstraintMatch = line.match(
        /(?:CONSTRAINT\s+["`]?([a-zA-Z0-9_]+)["`]?\s+)?FOREIGN\s+KEY\s*\(\s*["`]?([a-zA-Z0-9_]+)["`]?\s*\)\s*REFERENCES\s+(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(\s*["`]?([a-zA-Z0-9_]+)["`]?\s*\)/i
      );
      if (fkConstraintMatch) {
        const fromCol = fkConstraintMatch[2];
        const toTable = fkConstraintMatch[4];
        const toCol = fkConstraintMatch[5];

        const targetCol = columns.find((c) => c.name.toLowerCase() === fromCol.toLowerCase());
        if (targetCol) {
          targetCol.isForeignKey = true;
          targetCol.references = { table: toTable, column: toCol };
        }

        relationships.push({
          id: `rel-sql-${tableName}-${fromCol}-${toTable}-${toCol}`,
          fromTable: tableName,
          fromColumn: fromCol,
          toTable,
          toColumn: toCol,
          type: 'one-to-many',
          isInferred: false,
        });
        continue;
      }

      // Handle table-level PRIMARY KEY constraint: PRIMARY KEY (id)
      const pkConstraintMatch = line.match(/PRIMARY\s+KEY\s*\(\s*["`]?([a-zA-Z0-9_]+)["`]?\s*\)/i);
      if (pkConstraintMatch) {
        const pkCol = pkConstraintMatch[1];
        const targetCol = columns.find((c) => c.name.toLowerCase() === pkCol.toLowerCase());
        if (targetCol) targetCol.isPrimary = true;
        continue;
      }

      if (
        line.toUpperCase().startsWith('PRIMARY KEY') ||
        line.toUpperCase().startsWith('CONSTRAINT') ||
        line.toUpperCase().startsWith('FOREIGN KEY') ||
        line.toUpperCase().startsWith('CHECK') ||
        line.toUpperCase().startsWith('UNIQUE')
      ) {
        continue;
      }

      const tokens = line.split(/\s+/);
      if (tokens.length >= 2) {
        const colName = tokens[0].replace(/["`]/g, '');
        const colType = tokens[1].replace(/["`]/g, '');
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|CHECK|UNIQUE|KEY)$/i.test(colName)) continue;

        const upperLine = line.toUpperCase();
        const isPrimary = upperLine.includes('PRIMARY KEY');
        const isNullable = !upperLine.includes('NOT NULL');

        let references: TableColumn['references'] = undefined;
        const refMatch = line.match(
          /REFERENCES\s+(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(\s*["`]?([a-zA-Z0-9_]+)["`]?\s*\)/i
        );
        if (refMatch) {
          const toTable = refMatch[2];
          const toCol = refMatch[3];
          references = {
            table: toTable,
            column: toCol,
          };

          relationships.push({
            id: `rel-sql-${tableName}-${colName}-${toTable}-${toCol}`,
            fromTable: tableName,
            fromColumn: colName,
            toTable,
            toColumn: toCol,
            type: 'one-to-many',
            isInferred: false,
          });
        }

        columns.push({
          name: colName,
          type: colType,
          isPrimary,
          isNullable,
          isForeignKey: Boolean(references),
          references,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'sql',
      });
    }
  }

  return { tables, relationships };
}

function parseSupabaseSchema(
  content: string,
  sourceFile: string
): { tables: DatabaseTable[]; relationships: TableRelationship[] } {
  const tables: DatabaseTable[] = [];
  const relationships: TableRelationship[] = [];

  // Find Tables: { block
  const tablesIndex = content.search(/Tables\s*:\s*\{/);
  if (tablesIndex === -1) return { tables, relationships };

  const startBrace = content.indexOf('{', tablesIndex);
  if (startBrace === -1) return { tables, relationships };

  // Parse table blocks inside Tables: { ... }
  let depth = 1;
  let currentTableName = '';
  let currentTableBody = '';
  let i = startBrace + 1;
  let tokenBuffer = '';

  while (i < content.length && depth > 0) {
    const char = content[i];

    if (char === '{') {
      depth++;
      if (depth === 2) {
        // We just entered a table definition
        const keyMatch = tokenBuffer.match(/([a-zA-Z0-9_]+)\s*:\s*$/);
        if (keyMatch) {
          currentTableName = keyMatch[1];
          currentTableBody = '';
        }
      } else if (depth > 2 && currentTableName) {
        currentTableBody += char;
      }
      tokenBuffer = '';
    } else if (char === '}') {
      depth--;
      if (depth === 1 && currentTableName) {
        // Finished capturing a table definition
        const tableName = currentTableName;
        const tableBody = currentTableBody;
        currentTableName = '';
        currentTableBody = '';

        const rowMatch = tableBody.match(/Row\s*:\s*\{([^}]*)\}/);
        if (rowMatch) {
          const rowBody = rowMatch[1];
          const columns: TableColumn[] = [];
          const lines = rowBody.split(/[\n;]/);

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            const colMatch = line.match(/^([a-zA-Z0-9_]+)\s*:\s*([^;]+)/);
            if (colMatch) {
              const colName = colMatch[1];
              const rawColType = colMatch[2].trim().replace(/[;,]$/, '');
              const isPrimary =
                colName.toLowerCase() === 'id' ||
                colName.toLowerCase() === `${tableName.toLowerCase()}_id` ||
                colName.toLowerCase() === `${tableName.toLowerCase()}id`;
              const isNullable = rawColType.includes('null') || rawColType.includes('undefined') || rawColType.includes('?');

              columns.push({
                name: colName,
                type: rawColType.replace(/\s*\|\s*null/g, '').replace(/\s*\|\s*undefined/g, '').trim(),
                isPrimary,
                isNullable,
                isForeignKey: false,
              });
            }
          }

          // Match Relationships block using bracket counting
          const relsIndex = tableBody.search(/Relationships\s*:\s*\[/);
          if (relsIndex !== -1) {
            let bDepth = 0;
            let bStart = -1;
            let relsBody = '';
            for (let b = relsIndex; b < tableBody.length; b++) {
              if (tableBody[b] === '[') {
                if (bDepth === 0) bStart = b + 1;
                bDepth++;
              } else if (tableBody[b] === ']') {
                bDepth--;
                if (bDepth === 0 && bStart !== -1) {
                  relsBody = tableBody.substring(bStart, b);
                  break;
                }
              }
            }

            if (relsBody) {
              const relBlocks = relsBody.split(/\},?\s*\{|\{|\}/).filter((s) => s.trim());
              for (const relBlock of relBlocks) {
                const colMatch = relBlock.match(/columns\s*:\s*\[\s*["']([^"']+)["']\s*\]/);
                const refRelMatch = relBlock.match(/referencedRelation\s*:\s*["']([^"']+)["']/);
                const refColMatch = relBlock.match(/referencedColumns\s*:\s*\[\s*["']([^"']+)["']\s*\]/);

                if (colMatch && refRelMatch && refColMatch) {
                  const fromColName = colMatch[1];
                  const toTableName = refRelMatch[1];
                  const toColName = refColMatch[1];

                  const targetCol = columns.find((c) => c.name === fromColName);
                  if (targetCol) {
                    targetCol.isForeignKey = true;
                    targetCol.references = {
                      table: toTableName,
                      column: toColName,
                    };
                  }

                  relationships.push({
                    id: `rel-supabase-${tableName}-${fromColName}-${toTableName}-${toColName}`,
                    fromTable: tableName,
                    fromColumn: fromColName,
                    toTable: toTableName,
                    toColumn: toColName,
                    type: 'one-to-many',
                    isInferred: false,
                  });
                }
              }
            }
          }

          if (columns.length > 0) {
            tables.push({
              name: tableName,
              columns,
              sourceFile,
              schemaType: 'supabase',
            });
          }
        }
      } else if (depth >= 2 && currentTableName) {
        currentTableBody += char;
      }
      tokenBuffer = '';
    } else {
      if (depth === 1) {
        tokenBuffer += char;
      } else if (depth >= 2 && currentTableName) {
        currentTableBody += char;
      }
    }

    i++;
  }

  return { tables, relationships };
}

function parseFirebaseSchema(
  content: string,
  sourceFile: string
): { tables: DatabaseTable[]; relationships: TableRelationship[] } {
  const tablesMap = new Map<string, DatabaseTable>();
  const relationships: TableRelationship[] = [];

  // Parse nested match /collectionName/{docId} blocks using a lexical stack
  const lines = content.split('\n');
  const collectionStack: { name: string; docId: string }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    const matchDecl = line.match(/match\s+\/([a-zA-Z0-9_]+)\/\{([a-zA-Z0-9_]+)\}/);
    if (matchDecl) {
      const colName = matchDecl[1];
      const docId = matchDecl[2];

      if (colName !== 'databases') {
        const parent = collectionStack.length > 0 ? collectionStack[collectionStack.length - 1] : null;

        if (!tablesMap.has(colName)) {
          const cols: TableColumn[] = [
            { name: docId || 'id', type: 'string', isPrimary: true, isNullable: false, isForeignKey: false },
          ];
          if (parent && parent.name !== 'databases') {
            const parentFk = `${parent.name.replace(/s$/, '')}_id`;
            cols.push({
              name: parentFk,
              type: 'string',
              isPrimary: false,
              isNullable: false,
              isForeignKey: true,
              references: { table: parent.name, column: parent.docId || 'id' },
            });
          }
          tablesMap.set(colName, {
            name: colName,
            columns: cols,
            sourceFile,
            schemaType: 'firebase',
          });
        }

        if (parent && parent.name !== 'databases') {
          const parentFk = `${parent.name.replace(/s$/, '')}_id`;
          relationships.push({
            id: `rel-firestore-${colName}-${parentFk}-${parent.name}-${parent.docId || 'id'}`,
            fromTable: colName,
            fromColumn: parentFk,
            toTable: parent.name,
            toColumn: parent.docId || 'id',
            type: 'one-to-many',
            isInferred: false,
          });
        }

        collectionStack.push({ name: colName, docId });
      } else {
        collectionStack.push({ name: 'databases', docId: 'database' });
      }
    }

    // Handle closing braces to maintain accurate hierarchy
    const closeCount = (line.match(/\}/g) || []).length;
    const openCount = (line.match(/\{/g) || []).length;
    if (closeCount > openCount) {
      const diff = closeCount - openCount;
      for (let i = 0; i < diff && collectionStack.length > 0; i++) {
        collectionStack.pop();
      }
    }
  }

  // Also parse client Firestore collection references: collection(db, 'collectionName')
  const clientCollectionRegex = /(?:collection\s*\([^,]+,\s*['"]([a-zA-Z0-9_]+)['"]|\.collection\s*\(\s*['"]([a-zA-Z0-9_]+)['"]\))/g;
  let clientMatch;
  while ((clientMatch = clientCollectionRegex.exec(content)) !== null) {
    const cName = clientMatch[1] || clientMatch[2];
    if (cName && !tablesMap.has(cName)) {
      tablesMap.set(cName, {
        name: cName,
        columns: [
          { name: 'id', type: 'string', isPrimary: true, isNullable: false, isForeignKey: false },
        ],
        sourceFile,
        schemaType: 'firebase',
      });
    }
  }

  return { tables: Array.from(tablesMap.values()), relationships };
}

function parseMongooseSchema(
  content: string,
  sourceFile: string
): { tables: DatabaseTable[]; relationships: TableRelationship[] } {
  const tables: DatabaseTable[] = [];
  const relationships: TableRelationship[] = [];

  // Match new Schema({ ... }) definitions
  const schemaRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*(?:,\s*\{[\s\S]*?\})?\s*\)/g;
  let match;

  while ((match = schemaRegex.exec(content)) !== null) {
    const schemaVarName = match[1];
    const body = match[2];
    const modelName = schemaVarName.replace(/Schema$/i, '').replace(/Model$/i, '') || schemaVarName;

    const columns: TableColumn[] = [
      { name: '_id', type: 'ObjectId', isPrimary: true, isNullable: false, isForeignKey: false },
    ];

    const fieldBlockRegex = /([a-zA-Z0-9_]+)\s*:\s*(\{[\s\S]*?\}|\[[\s\S]*?\]|[a-zA-Z0-9_.]+)/g;
    let fieldMatch;

    while ((fieldMatch = fieldBlockRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldDef = fieldMatch[2];
      if (['timestamps', 'versionKey', '_id', 'toJSON', 'toObject'].includes(fieldName)) continue;

      let fieldType = 'string';
      const typeMatch = fieldDef.match(/type\s*:\s*([a-zA-Z0-9_.]+)/);
      if (typeMatch) {
        fieldType = typeMatch[1].replace(/^(Schema\.Types\.|mongoose\.Schema\.Types\.|Types\.)/, '');
      } else if (!fieldDef.startsWith('{')) {
        fieldType = fieldDef.trim();
      }

      let references: TableColumn['references'] = undefined;
      const refMatch = fieldDef.match(/ref\s*:\s*['"]([a-zA-Z0-9_]+)['"]/);
      if (refMatch) {
        const targetTable = refMatch[1];
        references = {
          table: targetTable,
          column: '_id',
        };

        relationships.push({
          id: `rel-mongoose-${modelName}-${fieldName}-${targetTable}-_id`,
          fromTable: modelName,
          fromColumn: fieldName,
          toTable: targetTable,
          toColumn: '_id',
          type: fieldDef.startsWith('[') ? 'many-to-many' : 'one-to-many',
          isInferred: false,
        });
      }

      columns.push({
        name: fieldName,
        type: fieldType,
        isPrimary: false,
        isNullable: !fieldDef.includes('required: true'),
        isForeignKey: Boolean(references),
        references,
      });
    }

    if (columns.length > 0) {
      tables.push({
        name: modelName,
        columns,
        sourceFile,
        schemaType: 'mongodb',
      });
    }
  }

  return { tables, relationships };
}

function parseTypeOrmSchema(
  content: string,
  sourceFile: string
): { tables: DatabaseTable[]; relationships: TableRelationship[] } {
  const tables: DatabaseTable[] = [];
  const relationships: TableRelationship[] = [];

  const classBlocks = content.split(/(?=@Entity)/g);
  const classToTableMap = new Map<string, string>();

  // Pass 1: Build class to table mapping
  for (const block of classBlocks) {
    if (!block.includes('@Entity')) continue;
    const entityMatch = block.match(/@Entity\s*(?:\(\s*['"]?([a-zA-Z0-9_]+)?['"]?\s*\))?\s*(?:export\s+)?class\s+([a-zA-Z0-9_]+)/);
    if (entityMatch) {
      const tableName = entityMatch[1] || entityMatch[2];
      const className = entityMatch[2];
      classToTableMap.set(className, tableName);
    }
  }

  // Pass 2: Parse columns and relations
  for (const block of classBlocks) {
    if (!block.includes('@Entity')) continue;

    const entityMatch = block.match(/@Entity\s*(?:\(\s*['"]?([a-zA-Z0-9_]+)?['"]?\s*\))?\s*(?:export\s+)?class\s+([a-zA-Z0-9_]+)/);
    if (!entityMatch) continue;

    const tableName = entityMatch[1] || entityMatch[2];
    const columns: TableColumn[] = [];

    // Primary keys
    const pkRegex = /@(PrimaryGeneratedColumn|PrimaryColumn)\s*(?:\([^)]*\))?\s*([a-zA-Z0-9_]+)\s*(?:\??:\s*([a-zA-Z0-9_]+))?/g;
    let pkMatch;
    while ((pkMatch = pkRegex.exec(block)) !== null) {
      columns.push({
        name: pkMatch[2],
        type: pkMatch[3] || 'string',
        isPrimary: true,
        isNullable: false,
        isForeignKey: false,
      });
    }

    // Regular Columns
    const colRegex = /@Column\s*(?:\([^)]*\))?\s*([a-zA-Z0-9_]+)\s*(?:\??:\s*([a-zA-Z0-9_]+))?/g;
    let colMatch;
    while ((colMatch = colRegex.exec(block)) !== null) {
      const colName = colMatch[1];
      if (!columns.some((c) => c.name === colName)) {
        columns.push({
          name: colName,
          type: colMatch[2] || 'string',
          isPrimary: false,
          isNullable: block.includes('nullable: true'),
          isForeignKey: false,
        });
      }
    }

    // Relations: @ManyToOne or @OneToOne
    const relRegex = /@(ManyToOne|OneToOne)\s*\(\s*\(\)\s*=>\s*([a-zA-Z0-9_]+)[\s\S]*?\)\s*(?:@JoinColumn\s*\(\s*\{[^}]*name\s*:\s*['"]([a-zA-Z0-9_]+)['"][^}]*\}\s*\))?\s*([a-zA-Z0-9_]+)/g;
    let relMatch;
    while ((relMatch = relRegex.exec(block)) !== null) {
      const targetClass = relMatch[2];
      const targetTable = classToTableMap.get(targetClass) || targetClass;
      const explicitFk = relMatch[3];
      const propertyName = relMatch[4];
      const fkColName = explicitFk || (propertyName.toLowerCase().endsWith('id') ? propertyName : `${propertyName}_id`);

      let col = columns.find((c) => c.name === fkColName);
      if (!col) {
        col = {
          name: fkColName,
          type: 'string',
          isPrimary: false,
          isNullable: true,
          isForeignKey: true,
          references: {
            table: targetTable,
            column: 'id',
          },
        };
        columns.push(col);
      } else {
        col.isForeignKey = true;
        col.references = {
          table: targetTable,
          column: 'id',
        };
      }

      relationships.push({
        id: `rel-typeorm-${tableName}-${fkColName}-${targetTable}-id`,
        fromTable: tableName,
        fromColumn: fkColName,
        toTable: targetTable,
        toColumn: 'id',
        type: relMatch[1] === 'OneToOne' ? 'one-to-one' : 'one-to-many',
        isInferred: false,
      });
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'typeorm',
      });
    }
  }

  return { tables, relationships };
}

function parseDrizzleSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  const tableRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:pg|mysql|sqlite)Table\(\s*['"]([a-zA-Z0-9_]+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[2];
    const body = match[3];
    const columns: TableColumn[] = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const colMatch = line.match(/^([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\(/);
      if (colMatch) {
        const colName = colMatch[1];
        const colType = colMatch[2];
        const isPrimary = line.includes('.primaryKey()');
        const isNullable = !line.includes('.notNull()');

        let references: TableColumn['references'] = undefined;
        const refMatch = line.match(/\.references\(\s*\(\)\s*=>\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
        if (refMatch) {
          references = {
            table: refMatch[1],
            column: refMatch[2],
          };
        }

        columns.push({
          name: colName,
          type: colType,
          isPrimary,
          isNullable,
          isForeignKey: Boolean(references),
          references,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'drizzle',
      });
    }
  }

  return tables;
}

function parseDriftSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  const classRegex = /class\s+([a-zA-Z0-9_]+)\s+extends\s+Table\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = classRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: TableColumn[] = [];

    const getterRegex = /([a-zA-Z0-9_]+Column)\s+get\s+([a-zA-Z0-9_]+)\s*=>\s*([a-zA-Z0-9_]+)\(\)/g;
    let colMatch;
    while ((colMatch = getterRegex.exec(body)) !== null) {
      const colType = colMatch[1].replace('Column', '');
      const colName = colMatch[2];
      const isPrimary = body.includes(`autoIncrement()`) || colName === 'id';

      columns.push({
        name: colName,
        type: colType,
        isPrimary,
        isNullable: body.includes(`nullable()`),
        isForeignKey: false,
      });
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'drift',
      });
    }
  }

  return tables;
}

function parseRoomSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  const entityRegex = /@Entity\s*(?:\([^)]*tableName\s*=\s*["']([^"']+)["'][^)]*\))?\s*(?:data\s+)?class\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/g;
  let match;

  while ((match = entityRegex.exec(content)) !== null) {
    const tableName = match[1] || match[2];
    const body = match[3];
    const columns: TableColumn[] = [];

    const fieldLines = body.split(',');
    for (const line of fieldLines) {
      const cleanLine = line.trim();
      const fieldMatch = cleanLine.match(/(?:@PrimaryKey\s+)?(?:val|var)\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_?]+)/);
      if (fieldMatch) {
        const colName = fieldMatch[1];
        const colType = fieldMatch[2];
        const isPrimary = cleanLine.includes('@PrimaryKey') || colName === 'id';

        columns.push({
          name: colName,
          type: colType.replace('?', ''),
          isPrimary,
          isNullable: colType.endsWith('?'),
          isForeignKey: false,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'room',
      });
    }
  }

  return tables;
}

function parsePythonSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];

  // SQLAlchemy
  const sqlAlchemyRegex = /class\s+([a-zA-Z0-9_]+)\([^)]*Base[^)]*\):\s*(?:__tablename__\s*=\s*['"]([^'"]+)['"])?([\s\S]*?)(?=\nclass|\n$)/g;
  let match;
  while ((match = sqlAlchemyRegex.exec(content)) !== null) {
    const className = match[1];
    const tableName = match[2] || className;
    const body = match[3];
    const columns: TableColumn[] = [];

    const colRegex = /([a-zA-Z0-9_]+)\s*=\s*Column\(\s*([a-zA-Z0-9_]+)(?:[^)]*primary_key\s*=\s*True)?/g;
    let colMatch;
    while ((colMatch = colRegex.exec(body)) !== null) {
      const colName = colMatch[1];
      const colType = colMatch[2];
      const isPrimary = body.includes('primary_key=True') || colName === 'id';

      columns.push({
        name: colName,
        type: colType,
        isPrimary,
        isNullable: !body.includes('nullable=False'),
        isForeignKey: body.includes('ForeignKey('),
      });
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'sqlalchemy',
      });
    }
  }

  // Django ORM
  const djangoRegex = /class\s+([a-zA-Z0-9_]+)\s*\(\s*models\.Model\s*\):([\s\S]*?)(?=\nclass|\n$)/g;
  while ((match = djangoRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: TableColumn[] = [];

    const fieldRegex = /([a-zA-Z0-9_]+)\s*=\s*models\.([a-zA-Z0-9_]+)\(/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const colName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const isPrimary = colName === 'id' || fieldType === 'AutoField';

      columns.push({
        name: colName,
        type: fieldType,
        isPrimary,
        isNullable: body.includes('null=True'),
        isForeignKey: fieldType === 'ForeignKey' || fieldType === 'OneToOneField',
      });
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'django',
      });
    }
  }

  return tables;
}

function synthesizeDomainEntities(files: { path: string; content: string }[]): DatabaseTable[] {
  const tables: DatabaseTable[] = [];

  for (const file of files) {
    const code = file.content;
    const path = file.path;

    // TypeScript / JS interfaces and types e.g. "interface User { id: string; name: string; }"
    const tsInterfaceRegex = /(?:export\s+)?(?:interface|type)\s+([A-Z][a-zA-Z0-9_]+)\s*(?:=\s*)?\{([^}]+)\}/g;
    let match;
    while ((match = tsInterfaceRegex.exec(code)) !== null) {
      const entityName = match[1];
      const body = match[2];

      if (['Props', 'State', 'Config', 'Options', 'Theme', 'Params', 'Event'].some((s) => entityName.endsWith(s))) {
        continue;
      }

      const columns: TableColumn[] = [];
      const lines = body.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);

      for (const line of lines) {
        const clean = line.trim();
        const fieldMatch = clean.match(/^([a-zA-Z0-9_]+)\s*\??:\s*([a-zA-Z0-9_<>|[\]]+)/);
        if (fieldMatch) {
          const colName = fieldMatch[1];
          const colType = fieldMatch[2];
          const isPrimary =
            colName.toLowerCase() === 'id' ||
            colName.toLowerCase() === `${entityName.toLowerCase()}id` ||
            colName.toLowerCase() === `${entityName.toLowerCase()}_id`;

          columns.push({
            name: colName,
            type: colType.slice(0, 20),
            isPrimary,
            isNullable: clean.includes('?'),
            isForeignKey: !isPrimary && /(_?id|_?uuid|_?key|_?pk|_?fk)$/i.test(colName),
          });
        }
      }

      if (columns.length >= 2) {
        tables.push({
          name: entityName,
          columns,
          sourceFile: path,
          schemaType: 'typescript',
        });
      }
    }

    // Dart / Java / Kotlin / Python classes
    const classRegex = /class\s+([A-Z][a-zA-Z0-9_]+)\s*\{([^}]+)\}/g;
    while ((match = classRegex.exec(code)) !== null) {
      const entityName = match[1];
      const body = match[2];
      if (['Page', 'Widget', 'Component', 'Screen', 'View', 'Controller', 'Service', 'Provider', 'State'].some((s) => entityName.endsWith(s))) {
        continue;
      }

      const columns: TableColumn[] = [];
      const fieldRegex = /(?:final\s+|val\s+|var\s+|late\s+)?([a-zA-Z0-9_<>?, ]+?)\s+([a-zA-Z0-9_]+);/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        const colType = fieldMatch[1].trim();
        const colName = fieldMatch[2].trim();
        if (['return', 'if', 'else', 'for', 'while', 'switch', 'void'].includes(colType)) continue;

        const isPrimary = colName.toLowerCase() === 'id' || colName.toLowerCase() === `${entityName.toLowerCase()}id`;
        columns.push({
          name: colName,
          type: colType.slice(0, 30),
          isPrimary,
          isNullable: colType.includes('?') || colType.toLowerCase().includes('nullable'),
          isForeignKey: colName.toLowerCase().endsWith('id') && colName.toLowerCase() !== 'id',
        });
      }

      if (columns.length >= 2) {
        tables.push({
          name: entityName,
          columns,
          sourceFile: path,
          schemaType: 'domain',
        });
      }
    }

    // Go structs: type User struct { ID string ... }
    const goStructRegex = /type\s+([A-Z][a-zA-Z0-9_]+)\s+struct\s*\{([^}]+)\}/g;
    while ((match = goStructRegex.exec(code)) !== null) {
      const entityName = match[1];
      const body = match[2];
      const columns: TableColumn[] = [];
      const lines = body.split('\n');

      for (const line of lines) {
        const clean = line.trim();
        const tokens = clean.split(/\s+/);
        if (tokens.length >= 2 && /^[A-Z]/.test(tokens[0])) {
          const colName = tokens[0];
          const colType = tokens[1];
          columns.push({
            name: colName,
            type: colType,
            isPrimary: colName.toLowerCase() === 'id',
            isNullable: colType.startsWith('*'),
            isForeignKey: colName.toLowerCase().endsWith('id') && colName.toLowerCase() !== 'id',
          });
        }
      }

      if (columns.length >= 2) {
        tables.push({
          name: entityName,
          columns,
          sourceFile: path,
          schemaType: 'go',
        });
      }
    }

    // Python Pydantic / Dataclass models: class User(BaseModel): ...
    const pyModelRegex = /class\s+([A-Z][a-zA-Z0-9_]+)\s*(?:\([^)]*\))?:\s*(?:\n\s+"""[\s\S]*?""")?([\s\S]*?)(?=\nclass|\ndef|\n\S|$)/g;
    if (path.endsWith('.py')) {
      while ((match = pyModelRegex.exec(code)) !== null) {
        const entityName = match[1];
        const body = match[2];
        if (['View', 'ViewSet', 'Form', 'Serializer', 'Test', 'Meta', 'Config'].some((s) => entityName.endsWith(s))) {
          continue;
        }

        const columns: TableColumn[] = [];
        const lines = body.split('\n');
        for (const line of lines) {
          const clean = line.trim();
          const fieldMatch = clean.match(/^([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_\[\], ]+)/);
          if (fieldMatch) {
            const colName = fieldMatch[1];
            const colType = fieldMatch[2];
            columns.push({
              name: colName,
              type: colType.slice(0, 20),
              isPrimary: colName.toLowerCase() === 'id',
              isNullable: colType.includes('Optional'),
              isForeignKey: colName.toLowerCase().endsWith('id') && colName.toLowerCase() !== 'id',
            });
          }
        }

        if (columns.length >= 2) {
          tables.push({
            name: entityName,
            columns,
            sourceFile: path,
            schemaType: 'python',
          });
        }
      }
    }
  }

  // Deduplicate and return top domain tables
  const map = new Map<string, DatabaseTable>();
  for (const t of tables) {
    if (!map.has(t.name.toLowerCase()) || t.columns.length > map.get(t.name.toLowerCase())!.columns.length) {
      map.set(t.name.toLowerCase(), t);
    }
  }

  return Array.from(map.values()).slice(0, 16);
}

function parseMermaidSchema(
  content: string,
  sourceFile: string
): { tables: DatabaseTable[]; relationships: TableRelationship[] } {
  const tables: DatabaseTable[] = [];
  const relationships: TableRelationship[] = [];

  // Match table blocks: TABLE_NAME { ... }
  const tableRegex = /(?:^|\n)\s*([a-zA-Z0-9_]+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1].trim();
    if (['erdiagram', 'mermaid'].includes(tableName.toLowerCase())) continue;

    const body = match[2];
    const columns: TableColumn[] = [];
    const lines = body.split('\n');

    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line || line.startsWith('%%')) continue;
      // Strip comments in quotes: type name PK "comment"
      line = line.replace(/"[^"]*"/g, '').trim();

      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const type = parts[0];
        const name = parts[1];
        if (!/^[a-zA-Z0-9_<>?,\[\]]+$/.test(type) || !/^[a-zA-Z0-9_]+$/.test(name)) continue;

        const flags = parts.slice(2).map((p) => p.toUpperCase());

        const isPrimary =
          flags.includes('PK') ||
          name.toLowerCase() === 'id' ||
          name.toLowerCase() === `${tableName.toLowerCase()}_id` ||
          name.toLowerCase() === `${tableName.toLowerCase()}id`;
        const isForeignKey =
          flags.includes('FK') ||
          (name.toLowerCase().endsWith('_id') && !isPrimary && name.length > 3);

        columns.push({
          name,
          type,
          isPrimary,
          isNullable: flags.includes('NULL') || flags.includes('OPTIONAL'),
          isForeignKey,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        name: tableName,
        columns,
        sourceFile,
        schemaType: 'sql',
      });
    }
  }

  // Match explicit relationships: TABLE_A ||--o{ TABLE_B : "label"
  const relRegex = /([a-zA-Z0-9_]+)\s*([|o}{]+--[|o}{]+)\s*([a-zA-Z0-9_]+)\s*(?::\s*"([^"]*)")?/g;
  let relMatch;
  while ((relMatch = relRegex.exec(content)) !== null) {
    const fromTable = relMatch[1].trim();
    const symbol = relMatch[2].trim();
    const toTable = relMatch[3].trim();

    if (fromTable.toLowerCase() === 'erdiagram' || toTable.toLowerCase() === 'erdiagram') continue;

    let relType: TableRelationship['type'] = 'one-to-many';
    if (symbol.includes('}{') || (symbol.startsWith('}') && symbol.endsWith('{'))) {
      relType = 'many-to-many';
    } else if (symbol.includes('||') && !symbol.includes('{') && !symbol.includes('}')) {
      relType = 'one-to-one';
    }

    const fromCol = `${fromTable.toLowerCase()}_id`;
    const toCol = 'id';

    relationships.push({
      id: `rel-mermaid-${fromTable}-${toTable}-${relationships.length}`,
      fromTable,
      fromColumn: fromCol,
      toTable,
      toColumn: toCol,
      type: relType,
      isInferred: false,
    });
  }

  return { tables, relationships };
}

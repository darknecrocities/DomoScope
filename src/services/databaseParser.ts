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

    // 2. SQL DDL
    if (lowerPath.endsWith('.sql') || lowerPath.includes('migrations/')) {
      const sqlTables = parseSqlSchema(file.content, file.path);
      if (sqlTables.length > 0) {
        tables.push(...sqlTables);
        detectedTypes.add('SQL');
        sourceFiles.add(file.path);
      }
    }

    // 3. Drizzle ORM
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
  }

  // Deduplicate tables by name (keeping the most detailed)
  const uniqueTablesMap = new Map<string, DatabaseTable>();
  for (const t of tables) {
    const existing = uniqueTablesMap.get(t.name.toLowerCase());
    if (!existing || t.columns.length > existing.columns.length) {
      uniqueTablesMap.set(t.name.toLowerCase(), t);
    }
  }

  const finalTables = Array.from(uniqueTablesMap.values());

  // Extract explicit and inferred relationships
  const tableNames = new Set(finalTables.map((t) => t.name.toLowerCase()));

  for (const table of finalTables) {
    for (const col of table.columns) {
      // Explicit reference
      if (col.references) {
        const targetTableName = col.references.table.toLowerCase();
        if (tableNames.has(targetTableName)) {
          relationships.push({
            id: `rel-${table.name}-${col.name}-${targetTableName}`,
            fromTable: table.name,
            fromColumn: col.name,
            toTable: col.references.table,
            toColumn: col.references.column,
            type: 'one-to-many',
            isInferred: false,
          });
        }
      } else {
        // Inferred relationship based on naming convention: e.g. user_id -> users.id or userId -> user.id
        const colLower = col.name.toLowerCase();
        if (colLower.endsWith('_id') || colLower.endsWith('id')) {
          const stem = colLower.replace(/_?id$/, '');
          const matchingTable = finalTables.find((t) => {
            const tLower = t.name.toLowerCase();
            return (
              tLower === stem ||
              tLower === `${stem}s` ||
              tLower === `${stem}es` ||
              `${tLower}s` === stem
            );
          });

          if (matchingTable && matchingTable.name.toLowerCase() !== table.name.toLowerCase()) {
            const targetCol = matchingTable.columns.find((c) => c.isPrimary) || matchingTable.columns[0];
            relationships.push({
              id: `rel-inferred-${table.name}-${col.name}-${matchingTable.name}`,
              fromTable: table.name,
              fromColumn: col.name,
              toTable: matchingTable.name,
              toColumn: targetCol ? targetCol.name : 'id',
              type: 'one-to-many',
              isInferred: true,
            });
          }
        }
      }
    }
  }

  // Deduplicate relationships
  const relSet = new Set<string>();
  const uniqueRelationships = relationships.filter((r) => {
    const key = `${r.fromTable}-${r.fromColumn}-${r.toTable}-${r.toColumn}`;
    if (relSet.has(key)) return false;
    relSet.add(key);
    return true;
  });

  return {
    tables: finalTables,
    relationships: uniqueRelationships,
    detectedTypes: Array.from(detectedTypes),
    sourceFiles: Array.from(sourceFiles),
  };
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

        // Avoid adding relation fields (virtual relation objects) if they don't map to a scalar type
        const isScalar = ['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Json', 'BigInt', 'Decimal', 'Bytes'].includes(
          colType.replace('?', '').replace('[]', '')
        );

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

function parseSqlSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  // Match CREATE TABLE [IF NOT EXISTS] tablename ( ... );
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: TableColumn[] = [];

    const lines = body.split(/,\s*(?![^(]*\))/); // split commas outside parentheses
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (
        !line ||
        line.startsWith('--') ||
        line.startsWith('/*') ||
        line.toUpperCase().startsWith('PRIMARY KEY') ||
        line.toUpperCase().startsWith('CONSTRAINT') ||
        line.toUpperCase().startsWith('FOREIGN KEY')
      ) {
        continue;
      }

      const tokens = line.split(/\s+/);
      if (tokens.length >= 2) {
        const colName = tokens[0].replace(/["`]/g, '');
        const colType = tokens[1].replace(/["`]/g, '');
        const upperLine = line.toUpperCase();
        const isPrimary = upperLine.includes('PRIMARY KEY');
        const isNullable = !upperLine.includes('NOT NULL');

        let references: TableColumn['references'] = undefined;
        const refMatch = line.match(/REFERENCES\s+["`]?([a-zA-Z0-9_]+)["`]?\s*\(\s*["`]?([a-zA-Z0-9_]+)["`]?\s*\)/i);
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
        schemaType: 'sql',
      });
    }
  }

  return tables;
}

function parseDrizzleSchema(content: string, sourceFile: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  // Match export const tablename = pgTable('table_name', { ... });
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

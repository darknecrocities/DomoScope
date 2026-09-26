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

    // 4. Flutter Drift / Moor
    if (file.content.includes('extends Table') || file.content.includes('package:drift/')) {
      const driftTables = parseDriftSchema(file.content, file.path);
      if (driftTables.length > 0) {
        tables.push(...driftTables);
        detectedTypes.add('Flutter Drift');
        sourceFiles.add(file.path);
      }
    }

    // 5. Android Room (Java/Kotlin)
    if (file.content.includes('@Entity') || file.content.includes('androidx.room')) {
      const roomTables = parseRoomSchema(file.content, file.path);
      if (roomTables.length > 0) {
        tables.push(...roomTables);
        detectedTypes.add('Android Room');
        sourceFiles.add(file.path);
      }
    }

    // 6. Python SQLAlchemy & Django ORM
    if (file.content.includes('Base') || file.content.includes('Column(') || file.content.includes('models.Model')) {
      const pyTables = parsePythonSchema(file.content, file.path);
      if (pyTables.length > 0) {
        tables.push(...pyTables);
        detectedTypes.add(file.content.includes('models.Model') ? 'Django ORM' : 'SQLAlchemy');
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

  const tableNames = new Set(finalTables.map((t) => t.name.toLowerCase()));

  for (const table of finalTables) {
    for (const col of table.columns) {
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
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: TableColumn[] = [];

    const lines = body.split(/,\s*(?![^(]*\))/);
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
      const lines = body.split('\n');

      for (const line of lines) {
        const clean = line.trim();
        const fieldMatch = clean.match(/^([a-zA-Z0-9_]+)\s*\??:\s*([a-zA-Z0-9_<>|[\]]+)/);
        if (fieldMatch) {
          const colName = fieldMatch[1];
          const colType = fieldMatch[2];
          const isPrimary = colName.toLowerCase() === 'id' || colName.toLowerCase().endsWith('id');

          columns.push({
            name: colName,
            type: colType.slice(0, 20),
            isPrimary,
            isNullable: clean.includes('?'),
            isForeignKey: colName.toLowerCase().endsWith('id') && colName.toLowerCase() !== 'id',
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
      const fieldRegex = /(?:final\s+|val\s+|var\s+)?([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+);/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        const colType = fieldMatch[1];
        const colName = fieldMatch[2];
        columns.push({
          name: colName,
          type: colType,
          isPrimary: colName.toLowerCase() === 'id',
          isNullable: false,
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

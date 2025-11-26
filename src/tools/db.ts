import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

type McpTool = { name: string; description: string; inputSchema: any; handler: (args: any) => Promise<any> };

async function postgresHandler(args: { connectionString: string; query: string; params?: any[] }) {
  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: args.connectionString });
    await client.connect();
    const res = await client.query(args.query, args.params || []);
    await client.end();
    return { content: [{ type: "text", text: JSON.stringify({ rowCount: res.rowCount, rows: res.rows }) }] };
  } catch (error: any) {
    throw new McpError(ErrorCode.InternalError, error?.message || String(error));
  }
}

async function mysqlHandler(args: { connectionUri?: string; host?: string; port?: number; user?: string; password?: string; database?: string; query: string; params?: any[] }) {
  try {
    const mysql = await import('mysql2/promise');
    const conn = args.connectionUri
      ? await mysql.createConnection(args.connectionUri)
      : await mysql.createConnection({ host: args.host, port: args.port || 3306, user: args.user, password: args.password, database: args.database });
    const [rows] = await conn.execute(args.query, args.params || []);
    await conn.end();
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  } catch (error: any) {
    throw new McpError(ErrorCode.InternalError, error?.message || String(error));
  }
}

async function mongoHandler(args: { uri: string; database: string; collection: string; operation: string; filter?: any; update?: any; options?: any; document?: any }) {
  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(args.uri);
    await client.connect();
    const db = client.db(args.database);
    const col = db.collection(args.collection);
    let result: any;
    switch ((args.operation || '').toLowerCase()) {
      case 'find_one':
        result = await col.findOne(args.filter || {});
        break;
      case 'find_many':
        result = await col.find(args.filter || {}, args.options || {}).toArray();
        break;
      case 'insert_one':
        result = await col.insertOne(args.document || {});
        break;
      case 'update_many':
        result = await col.updateMany(args.filter || {}, args.update || {}, args.options || {});
        break;
      case 'delete_many':
        result = await col.deleteMany(args.filter || {}, args.options || {});
        break;
      default:
        throw new McpError(ErrorCode.InvalidParams, 'Operación no soportada');
    }
    await client.close();
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error: any) {
    throw new McpError(ErrorCode.InternalError, error?.message || String(error));
  }
}

export function createDbTools(): McpTool[] {
  return [
    {
      name: 'postgres_query',
      description: 'Ejecuta una consulta en Postgres con connectionString',
      inputSchema: { type: 'object', properties: { connectionString: { type: 'string' }, query: { type: 'string' }, params: { type: 'array', items: {} } }, required: ['connectionString', 'query'] },
      handler: postgresHandler,
    },
    {
      name: 'mysql_query',
      description: 'Ejecuta una consulta en MySQL mediante URI o credenciales',
      inputSchema: { type: 'object', properties: { connectionUri: { type: 'string' }, host: { type: 'string' }, port: { type: 'number' }, user: { type: 'string' }, password: { type: 'string' }, database: { type: 'string' }, query: { type: 'string' }, params: { type: 'array', items: {} } }, required: ['query'] },
      handler: mysqlHandler,
    },
    {
      name: 'mongo_query',
      description: 'Realiza operaciones en MongoDB (find, insert, update, delete)',
      inputSchema: { type: 'object', properties: { uri: { type: 'string' }, database: { type: 'string' }, collection: { type: 'string' }, operation: { type: 'string' }, filter: { type: 'object' }, update: { type: 'object' }, options: { type: 'object' }, document: { type: 'object' } }, required: ['uri', 'database', 'collection', 'operation'] },
      handler: mongoHandler,
    },
  ];
}

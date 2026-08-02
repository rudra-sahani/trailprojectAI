import pg from 'pg';
import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { hashPassword } from '../lib/auth-crypto.js';

const { Pool } = pg;

let activePool: any = null;
let isPgMem = false;

function loadMigrationFiles(): string[] {
  const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  return files.map(f => fs.readFileSync(path.join(migrationsDir, f), 'utf-8'));
}

export function initializeDatabasePool() {
  if (activePool) return activePool;

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

  if (connectionString) {
    console.log('[PostgreSQL] Connecting to production database pool...');
    activePool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    isPgMem = false;
  } else {
    console.log('[PostgreSQL] No external connection string provided. Initializing pg-mem in-memory database with full schema & seed data...');
    const memDb = newDb();

    // Register basic PostgreSQL compatibility functions
    memDb.public.registerFunction({
      name: 'now',
      returns: 'timestamp with time zone' as any,
      implementation: () => new Date()
    });

    memDb.public.registerFunction({
      name: 'char_length',
      args: ['text' as any],
      returns: 'integer' as any,
      implementation: (str: string) => (str ? str.length : 0)
    });

    const migrations = loadMigrationFiles();
    for (const sql of migrations) {
      try {
        memDb.public.none(sql);
      } catch {
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          if (stmt.toUpperCase().includes('ROW LEVEL SECURITY') || stmt.toUpperCase().includes('CREATE POLICY') || stmt.toUpperCase().includes('DROP POLICY')) {
            continue;
          }
          try {
            memDb.public.none(stmt);
          } catch {
            // ignore unsupported pg-mem syntax
          }
        }
      }
    }

    // Seed database tables in PostgreSQL memory instance
    seedPgDatabase(memDb);

    const adapter = memDb.adapters.createPg();
    activePool = new adapter.Pool();
    isPgMem = true;
  }

  return activePool;
}

function seedPgDatabase(memDb: any) {
  const engDeptId = 'd1000000-0000-0000-0000-000000000001';
  const prodDeptId = 'd1000000-0000-0000-0000-000000000002';
  const designDeptId = 'd1000000-0000-0000-0000-000000000003';

  memDb.public.none(`
    INSERT INTO departments (id, name, description, created_at) VALUES
    ('${engDeptId}', 'Engineering', 'Software Development & Systems', NOW()),
    ('${prodDeptId}', 'Product Management', 'Product Strategy & Execution', NOW()),
    ('${designDeptId}', 'Design', 'User Experience & Product Design', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  const hrAdminId = '10000000-0000-4000-a000-000000000001';
  const managerMarcusId = '10000000-0000-4000-a000-000000000002';
  const empAlexId = '10000000-0000-4000-a000-000000000003';
  const empMariaId = '10000000-0000-4000-a000-000000000004';

  const teamEngId = '20000000-0000-4000-a000-000000000001';

  memDb.public.none(`
    INSERT INTO users (id, employee_code, full_name, email, role, department_id, is_active, created_at) VALUES
    ('${hrAdminId}', 'EMP-001', 'HR Admin Sarah', 'hr.admin@verireview.ai', 'HR_ADMIN', '${engDeptId}', true, NOW()),
    ('${managerMarcusId}', 'EMP-002', 'Marcus Vance', 'marcus.vance@verireview.ai', 'MANAGER', '${engDeptId}', true, NOW()),
    ('${empAlexId}', 'EMP-003', 'Alex Morgan', 'alex.employee@verireview.ai', 'EMPLOYEE', '${engDeptId}', true, NOW()),
    ('${empMariaId}', 'EMP-004', 'Maria Santos', 'maria.santos@verireview.ai', 'EMPLOYEE', '${engDeptId}', true, NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  memDb.public.none(`
    INSERT INTO teams (id, department_id, manager_id, name, created_at) VALUES
    ('${teamEngId}', '${engDeptId}', '${managerMarcusId}', 'Core Backend Team', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  memDb.public.none(`
    UPDATE users SET team_id = '${teamEngId}' WHERE id IN ('${empAlexId}', '${empMariaId}');
  `);

  // Auth credentials seed
  const defaultHashObj = hashPassword('VeriReview2026!');
  for (const uid of [hrAdminId, managerMarcusId, empAlexId, empMariaId]) {
    const userRes = memDb.public.many(`SELECT email FROM users WHERE id = '${uid}'`);
    if (userRes && userRes.length > 0) {
      const email = userRes[0].email;
      memDb.public.none(`
        INSERT INTO user_credentials (user_id, email, password_hash, salt, is_email_verified, updated_at) VALUES
        ('${uid}', '${email}', '${defaultHashObj.hash}', '${defaultHashObj.salt}', true, NOW())
        ON CONFLICT (user_id) DO NOTHING;
      `);
    }
  }

  // Review Cycles Seed
  const reviewAlexId = '30000000-0000-4000-a000-000000000001';
  const reviewMariaId = '30000000-0000-4000-a000-000000000002';

  memDb.public.none(`
    INSERT INTO review_cycles (id, employee_id, manager_id, review_period, status, created_at, updated_at) VALUES
    ('${reviewAlexId}', '${empAlexId}', '${managerMarcusId}', '2026-Q1', 'HUMAN_REVIEW', NOW(), NOW()),
    ('${reviewMariaId}', '${empMariaId}', '${managerMarcusId}', '2026-Q1', 'ESCALATED', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Raw Feedback Seed
  const fb1Id = 'f1000000-0000-0000-0000-000000000001';
  const fb2Id = 'f1000000-0000-0000-0000-000000000002';
  const fb3Id = 'f1000000-0000-0000-0000-000000000003';

  memDb.public.none(`
    INSERT INTO raw_feedback (id, review_id, submitted_by, source_type, title, content, submitted_at, created_at) VALUES
    ('${fb1Id}', '${reviewAlexId}', '${empAlexId}', 'SELF_ASSESSMENT', 'Q1 Self Assessment', 'Spearheaded the PostgreSQL migration and optimized backend query performance by 40%.', NOW(), NOW()),
    ('${fb2Id}', '${reviewAlexId}', '${managerMarcusId}', 'MANAGER_FEEDBACK', 'Manager Performance Summary', 'Alex demonstrated outstanding ownership in architecting zero-downtime database pipelines.', NOW(), NOW()),
    ('${fb3Id}', '${reviewAlexId}', '${empMariaId}', 'PEER_FEEDBACK', 'Peer Feedback from Maria', 'Alex is always supportive during code reviews and mentored junior devs on high-concurrency systems.', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Evidence Nodes Seed
  const ev1Id = 'e1000000-0000-0000-0000-000000000001';
  const ev2Id = 'e1000000-0000-0000-0000-000000000002';
  const ev3Id = 'e1000000-0000-0000-0000-000000000003';

  memDb.public.none(`
    INSERT INTO evidence_nodes (id, review_id, raw_feedback_id, source_type, author_role, author_id, title, normalized_text, tags, confidence, status, metadata, created_at) VALUES
    ('${ev1Id}', '${reviewAlexId}', '${fb1Id}', 'SELF_ASSESSMENT', 'self', '${empAlexId}', 'Self Assessment Unit', 'Spearheaded the PostgreSQL migration and optimized backend query performance by 40%.', '["architecture", "performance"]'::jsonb, 1.0, 'ACCEPTED', '{}'::jsonb, NOW()),
    ('${ev2Id}', '${reviewAlexId}', '${fb2Id}', 'MANAGER_FEEDBACK', 'manager', '${managerMarcusId}', 'Manager Summary Unit', 'Alex demonstrated outstanding ownership in architecting zero-downtime database pipelines.', '["leadership", "ownership"]'::jsonb, 1.0, 'ACCEPTED', '{}'::jsonb, NOW()),
    ('${ev3Id}', '${reviewAlexId}', '${fb3Id}', 'PEER_FEEDBACK', 'peer', '${empMariaId}', 'Peer Review Unit', 'Alex is always supportive during code reviews and mentored junior devs on high-concurrency systems.', '["mentorship", "collaboration"]'::jsonb, 1.0, 'ACCEPTED', '{}'::jsonb, NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Claim Candidates Seed
  const claim1Id = 'c1000000-0000-0000-0000-000000000001';
  const claim2Id = 'c1000000-0000-0000-0000-000000000002';

  memDb.public.none(`
    INSERT INTO claim_candidates (id, review_id, claim_text, theme, evidence_ids, source_count, role_diversity, coverage_confidence, status, created_at) VALUES
    ('${claim1Id}', '${reviewAlexId}', 'Demonstrated exceptional technical leadership and system optimization impact.', 'Technical Leadership & Architecture', '["${ev1Id}", "${ev2Id}"]'::jsonb, 2, '{"self":1,"peer":0,"manager":1}'::jsonb, 0.88, 'SUFFICIENT', NOW()),
    ('${claim2Id}', '${reviewAlexId}', 'Fostered high-performing engineering culture through mentorship.', 'Mentorship & Team Collaboration', '["${ev3Id}"]'::jsonb, 1, '{"self":0,"peer":1,"manager":0}'::jsonb, 0.75, 'SUFFICIENT', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Bias Flags Seed
  const bias1Id = 'b1000000-0000-0000-0000-000000000001';
  memDb.public.none(`
    INSERT INTO bias_flags (id, review_id, claim_id, bias_type, severity, explanation, evidence_refs, detector_type, check_status, created_at) VALUES
    ('${bias1Id}', '${reviewAlexId}', '${claim2Id}', 'source_imbalance', 'low', 'Claim supported exclusively by peer feedback without manager verification.', '["${ev3Id}"]'::jsonb, 'deterministic', 'COMPLETED', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Draft Report Seed
  const report1Id = 'a1000000-0000-0000-0000-000000000001';
  const reportSectionsJson = JSON.stringify([
    {
      theme_title: 'Technical Leadership & Architecture',
      claims: [
        {
          claim_id: claim1Id,
          text: 'Demonstrated exceptional technical leadership and system optimization impact.',
          source_count: 2,
          role_diversity: { self: 1, peer: 0, manager: 1 },
          coverage_confidence: 0.88,
          status: 'SUFFICIENT',
          evidence_ids: [ev1Id, ev2Id],
          evidence_quotes: [
            { quote_id: ev1Id, text: 'Spearheaded the PostgreSQL migration and optimized backend query performance by 40%.', source_type: 'self_assessment', author_role: 'self', author_id: empAlexId },
            { quote_id: ev2Id, text: 'Alex demonstrated outstanding ownership in architecting zero-downtime database pipelines.', source_type: 'manager_feedback', author_role: 'manager', author_id: managerMarcusId }
          ],
          bias_flags: [],
          reviewer_decision: 'ACCEPTED'
        }
      ],
      section_confidence: 0.88
    },
    {
      theme_title: 'Mentorship & Team Collaboration',
      claims: [
        {
          claim_id: claim2Id,
          text: 'Fostered high-performing engineering culture through mentorship.',
          source_count: 1,
          role_diversity: { self: 0, peer: 1, manager: 0 },
          coverage_confidence: 0.75,
          status: 'SUFFICIENT',
          evidence_ids: [ev3Id],
          evidence_quotes: [
            { quote_id: ev3Id, text: 'Alex is always supportive during code reviews and mentored junior devs on high-concurrency systems.', source_type: 'peer_feedback', author_role: 'peer', author_id: empMariaId }
          ],
          bias_flags: [
            { flag_id: bias1Id, bias_type: 'source_imbalance', severity: 'low', explanation: 'Claim supported exclusively by peer feedback without manager verification.' }
          ],
          reviewer_decision: 'PENDING'
        }
      ],
      section_confidence: 0.75
    }
  ]);

  memDb.public.none(`
    INSERT INTO reports (id, review_id, subject_employee_id, status, overall_confidence, sections, prompt_version, created_at, updated_at) VALUES
    ('${report1Id}', '${reviewAlexId}', '${empAlexId}', 'DRAFT', 0.82, '${reportSectionsJson.replace(/'/g, "''")}'::jsonb, 'synthesis_v1', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Operations Queue Seed
  const op1Id = 'a2000000-0000-0000-0000-000000000001';
  memDb.public.none(`
    INSERT INTO operations_queue (id, review_id, failed_stage, failure_reason, retry_count, assigned_to, status, created_at) VALUES
    ('${op1Id}', '${reviewMariaId}', 'BIAS_CHECKING', 'Bias-Detection agent timeout during LLM-assisted sentiment analysis.', 1, '${hrAdminId}', 'OPEN', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Audit Log Seed
  memDb.public.none(`
    INSERT INTO audit_log (id, review_id, claim_id, actor_id, actor_type, event_type, metadata, created_at) VALUES
    ('${uuidv4()}', '${reviewAlexId}', NULL, '${managerMarcusId}', 'human', 'REVIEW_CREATED', '{"action": "REVIEW_CREATED"}'::jsonb, NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
}

export async function query(text: string, params?: any[]): Promise<any> {
  const pool = initializeDatabasePool();
  return pool.query(text, params);
}

export async function getClient(): Promise<pg.PoolClient> {
  const pool = initializeDatabasePool();
  return pool.connect();
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withRlsTransaction<T>(
  user: { id: string; role: string },
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = '${user.id.replace(/'/g, "''")}'`);
    await client.query(`SET LOCAL app.current_user_role = '${user.role.replace(/'/g, "''")}'`);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

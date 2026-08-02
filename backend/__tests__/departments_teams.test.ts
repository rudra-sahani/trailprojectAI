import express from 'express';
import authRoutes from '../routes/auth.js';
import departmentsRoutes from '../routes/departments.js';
import teamsRoutes from '../routes/teams.js';
import usersRoutes from '../routes/users.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runDepartmentsAndTeamsTests() {
  console.log('\n🧪 Running VeriReview AI Departments & Teams Management Test Suite...\n');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/departments', departmentsRoutes);
  app.use('/api/v1/teams', teamsRoutes);
  app.use('/api/v1/users', usersRoutes);

  const server = app.listen(0);
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  try {
    // 1. Authenticate HR Admin
    console.log('Setup: Authenticate HR Admin...');
    const hrLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr.admin@verireview.ai', password: 'VeriReview2026!' })
    });
    const hrLoginData = await hrLoginRes.json();
    assert(hrLoginRes.status === 200 && hrLoginData.success, 'HR Admin login failed');
    const hrToken = hrLoginData.data.accessToken || hrLoginData.data.token;

    // 2. Authenticate Regular Employee
    console.log('Setup: Authenticate Employee...');
    const empLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.employee@verireview.ai', password: 'VeriReview2026!' })
    });
    const empLoginData = await empLoginRes.json();
    assert(empLoginRes.status === 200 && empLoginData.success, 'Employee login failed');
    const empToken = empLoginData.data.accessToken || empLoginData.data.token;

    // -------------------------------------------------------------
    // DEPARTMENT TESTS
    // -------------------------------------------------------------

    // Test 1: RBAC check - Employee cannot create department
    console.log('Test 1: RBAC - Employee attempting department creation should be blocked (403)');
    const empCreateDeptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`
      },
      body: JSON.stringify({ name: 'Unauthorized Dept' })
    });
    assert(empCreateDeptRes.status === 403, `Expected 403 status for employee, got ${empCreateDeptRes.status}`);

    // Test 2: HR Admin creates a new department
    console.log('Test 2: HR Admin creates "AI Research & Platform" department');
    const createDeptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        name: 'AI Research & Platform',
        description: 'Advanced Gemini & Reasoning Model Integration Division'
      })
    });
    const createDeptData = await createDeptRes.json();
    if (!createDeptData.success) {
      console.error('Department Creation Error Output:', createDeptRes.status, createDeptData);
    }
    assert(createDeptRes.status === 201 && createDeptData.success, 'Department creation failed');
    const newDeptId = createDeptData.data.id;
    assert(createDeptData.data.name === 'AI Research & Platform', 'Department name mismatch');
    assert(createDeptData.data.status === 'ACTIVE', 'Department status should be ACTIVE');

    // Test 3: List departments
    console.log('Test 3: Fetch active departments list');
    const listDeptRes = await fetch(`${baseUrl}/departments`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const listDeptData = await listDeptRes.json();
    assert(listDeptRes.status === 200 && listDeptData.success, 'List departments failed');
    assert(Array.isArray(listDeptData.data) && listDeptData.data.length > 0, 'Departments array should not be empty');
    const foundDept = listDeptData.data.find((d: any) => d.id === newDeptId);
    assert(!!foundDept, 'Newly created department should exist in directory list');

    // Test 4: Update department description & head
    console.log('Test 4: HR Admin updates department information');
    const updateDeptRes = await fetch(`${baseUrl}/departments/${newDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        name: 'AI Platform & Deep Learning',
        description: 'Core AI Platform and Zero-Hallucination Pipeline'
      })
    });
    const updateDeptData = await updateDeptRes.json();
    assert(updateDeptRes.status === 200 && updateDeptData.success, 'Department update failed');
    assert(updateDeptData.data.name === 'AI Platform & Deep Learning', 'Updated name mismatch');

    // Test 5: Archive Department
    console.log('Test 5: Archive department');
    const archiveDeptRes = await fetch(`${baseUrl}/departments/${newDeptId}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const archiveDeptData = await archiveDeptRes.json();
    assert(archiveDeptRes.status === 200 && archiveDeptData.success, 'Archive department failed');
    assert(archiveDeptData.data.is_archived === true, 'Department should be flagged as archived');
    assert(archiveDeptData.data.status === 'ARCHIVED', 'Department status should be ARCHIVED');

    // Test 6: Restore Department
    console.log('Test 6: Restore department');
    const restoreDeptRes = await fetch(`${baseUrl}/departments/${newDeptId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const restoreDeptData = await restoreDeptRes.json();
    assert(restoreDeptRes.status === 200 && restoreDeptData.success, 'Restore department failed');
    assert(restoreDeptData.data.is_archived === false, 'Department should no longer be archived');

    // -------------------------------------------------------------
    // TEAM TESTS
    // -------------------------------------------------------------

    // Test 7: HR Admin creates a new team attached to the department
    console.log('Test 7: Create team "Gemini Reasoning Core" under department');
    const createTeamRes = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        name: 'Gemini Reasoning Core',
        description: 'Building multi-turn reasoning and bias guardrail agents',
        department_id: newDeptId
      })
    });
    const createTeamData = await createTeamRes.json();
    assert(createTeamRes.status === 201 && createTeamData.success, 'Team creation failed');
    const newTeamId = createTeamData.data.id;
    assert(createTeamData.data.name === 'Gemini Reasoning Core', 'Team name mismatch');
    assert(createTeamData.data.department_id === newDeptId, 'Department association mismatch');

    // Test 8: List teams with department filtering
    console.log('Test 8: Filter teams by department ID');
    const filterTeamRes = await fetch(`${baseUrl}/teams?department_id=${newDeptId}`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const filterTeamData = await filterTeamRes.json();
    assert(filterTeamRes.status === 200 && filterTeamData.success, 'Filtered teams query failed');
    assert(filterTeamData.data.length === 1, 'Should find exactly 1 team for this department');
    assert(filterTeamData.data[0].id === newTeamId, 'Team ID mismatch in filter response');

    // Test 9: Safe Delete Department Protection (Should Fail when team belongs to it)
    console.log('Test 9: Safe Delete Department should fail if teams are assigned');
    const safeDeleteRes = await fetch(`${baseUrl}/departments/${newDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(safeDeleteRes.status === 400, 'Deleting department with active teams must return 400 error');

    // Test 10: Archive & Restore Team
    console.log('Test 10: Archive and Restore Team');
    const archiveTeamRes = await fetch(`${baseUrl}/teams/${newTeamId}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(archiveTeamRes.status === 200, 'Team archive failed');

    const restoreTeamRes = await fetch(`${baseUrl}/teams/${newTeamId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(restoreTeamRes.status === 200, 'Team restore failed');

    // Test 11: Delete Team
    console.log('Test 11: Delete Team');
    const deleteTeamRes = await fetch(`${baseUrl}/teams/${newTeamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(deleteTeamRes.status === 200, 'Team deletion failed');

    // Test 12: Delete Department now succeeds
    console.log('Test 12: Delete Department now succeeds after team is removed');
    const deleteDeptRes = await fetch(`${baseUrl}/departments/${newDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(deleteDeptRes.status === 200, 'Department deletion failed after clearing teams');

    console.log('\n✅ All Department & Team Management tests passed successfully!\n');
  } finally {
    server.close();
  }
}

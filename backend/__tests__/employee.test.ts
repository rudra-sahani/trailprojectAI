import express from 'express';
import authRoutes from '../routes/auth.js';
import usersRoutes from '../routes/users.js';
import { usersRepository } from '../repositories/db.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runEmployeeTests() {
  console.log('\n🧪 Running VeriReview AI Employee Management Test Suite...\n');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);

  const server = app.listen(0);
  const address = server.address() as { port: number };
  const authUrl = `http://localhost:${address.port}/api/v1/auth`;
  const usersUrl = `http://localhost:${address.port}/api/v1/users`;

  try {
    // 1. Authenticate HR Admin
    console.log('Setup: Login HR Admin...');
    const hrLoginRes = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr.admin@verireview.ai', password: 'VeriReview2026!' })
    });
    const hrLoginData = await hrLoginRes.json();
    assert(hrLoginRes.status === 200 && hrLoginData.success, 'HR Admin login failed');
    const hrToken = hrLoginData.data.accessToken || hrLoginData.data.token;
    assert(!!hrToken, 'HR Token must exist');

    // 2. Authenticate Manager (Marcus Vance)
    console.log('Setup: Login Manager...');
    const mgrLoginRes = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marcus.vance@verireview.ai', password: 'VeriReview2026!' })
    });
    const mgrLoginData = await mgrLoginRes.json();
    assert(mgrLoginRes.status === 200 && mgrLoginData.success, 'Manager login failed');
    const mgrToken = mgrLoginData.data.accessToken || mgrLoginData.data.token;
    assert(!!mgrToken, 'Manager Token must exist');

    // 3. Authenticate Employee (Alex Rivera)
    console.log('Setup: Login Employee...');
    const empLoginRes = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.employee@verireview.ai', password: 'VeriReview2026!' })
    });
    const empLoginData = await empLoginRes.json();
    assert(empLoginRes.status === 200 && empLoginData.success, 'Employee login failed');
    const empToken = empLoginData.data.accessToken || empLoginData.data.token;
    assert(!!empToken, 'Employee Token must exist');

    // ------------------------------------------------------------------------
    // Test 1: Employee Create (HR Admin)
    // ------------------------------------------------------------------------
    console.log('Test 1: Employee Create (HR Admin)...');
    const newEmpEmail = `test.employee.${Date.now()}@verireview.ai`;
    const createRes = await fetch(`${usersUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        full_name: 'Samantha Vance',
        email: newEmpEmail,
        role: 'EMPLOYEE',
        job_title: 'Senior QA Engineer',
        phone: '+1 555-0199',
        employment_type: 'Full-time',
        location: 'New York HQ'
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, `Employee create failed with status ${createRes.status}`);
    assert(createData.success === true, 'Response success should be true');
    assert(createData.data.full_name === 'Samantha Vance', 'Full name match');
    assert(createData.data.email === newEmpEmail, 'Email match');
    assert(!!createData.data.employee_code, 'Employee code should be generated');
    const createdEmployeeId = createData.data.id;
    console.log('   ✅ Created Employee:', createdEmployeeId, createData.data.employee_code);

    // ------------------------------------------------------------------------
    // Test 2: Invalid Employee Create (Missing Full Name / Duplicate Email)
    // ------------------------------------------------------------------------
    console.log('Test 2: Invalid Employee Create Validation...');
    const invalidRes1 = await fetch(`${usersUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ full_name: '', email: 'invalid@verireview.ai' })
    });
    assert(invalidRes1.status === 400, 'Empty name should return 400 Bad Request');

    const duplicateRes = await fetch(`${usersUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ full_name: 'Duplicate Test', email: newEmpEmail })
    });
    assert(duplicateRes.status === 400, 'Duplicate email should return 400 Bad Request');
    console.log('   ✅ Invalid create payloads rejected correctly.');

    // ------------------------------------------------------------------------
    // Test 3: Employee Update (HR Admin)
    // ------------------------------------------------------------------------
    console.log('Test 3: Employee Update...');
    const updateRes = await fetch(`${usersUrl}/${createdEmployeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        job_title: 'Lead QA Architect',
        phone: '+1 555-9988',
        location: 'Remote US'
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.success, 'Update employee failed');
    assert(updateData.data.job_title === 'Lead QA Architect', 'Job title updated');
    assert(updateData.data.location === 'Remote US', 'Location updated');
    console.log('   ✅ Employee profile updated successfully.');

    // ------------------------------------------------------------------------
    // Test 4: Archive Employee (Soft Delete)
    // ------------------------------------------------------------------------
    console.log('Test 4: Archive Employee (Soft Delete)...');
    const archiveRes = await fetch(`${usersUrl}/${createdEmployeeId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const archiveData = await archiveRes.json();
    assert(archiveRes.status === 200 && archiveData.success, 'Archive request failed');
    assert(archiveData.data.is_archived === true, 'is_archived should be true');
    assert(archiveData.data.is_active === false, 'is_active should be false');
    console.log('   ✅ Employee archived successfully.');

    // ------------------------------------------------------------------------
    // Test 5: Restore Employee
    // ------------------------------------------------------------------------
    console.log('Test 5: Restore Employee...');
    const restoreRes = await fetch(`${usersUrl}/${createdEmployeeId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const restoreData = await restoreRes.json();
    assert(restoreRes.status === 200 && restoreData.success, 'Restore request failed');
    assert(restoreData.data.is_archived === false, 'is_archived should be false');
    assert(restoreData.data.is_active === true, 'is_active should be true');
    console.log('   ✅ Employee restored successfully.');

    // ------------------------------------------------------------------------
    // Test 6: Permission Enforcement (RBAC)
    // ------------------------------------------------------------------------
    console.log('Test 6: Permission Enforcement (RBAC)...');
    
    // Regular employee forbidden from creating employee
    const forbiddenCreateRes = await fetch(`${usersUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`
      },
      body: JSON.stringify({
        full_name: 'Unauthorized Create',
        email: `unauthorized.${Date.now()}@verireview.ai`
      })
    });
    assert(forbiddenCreateRes.status === 403, 'Employee role forbidden from creating users');

    // Regular employee forbidden from archiving employee
    const forbiddenArchiveRes = await fetch(`${usersUrl}/${createdEmployeeId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(forbiddenArchiveRes.status === 403, 'Employee role forbidden from archiving users');

    // Manager editing user outside their reporting hierarchy
    const unassignedEmpEmail = `unassigned.${Date.now()}@verireview.ai`;
    const createUnassignedRes = await fetch(`${usersUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        full_name: 'Unassigned Person',
        email: unassignedEmpEmail,
        manager_id: '10000000-0000-4000-a000-000000000001' // HR Admin manager id, NOT Marcus
      })
    });
    const unassignedData = await createUnassignedRes.json();
    const unassignedId = unassignedData.data.id;

    const mgrForbiddenUpdateRes = await fetch(`${usersUrl}/${unassignedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`
      },
      body: JSON.stringify({ job_title: 'Manager Hijack Attempt' })
    });
    assert(mgrForbiddenUpdateRes.status === 403, 'Manager forbidden from updating user outside hierarchy');
    console.log('   ✅ All RBAC restrictions enforced correctly.');

    // ------------------------------------------------------------------------
    // Test 7: Get Employee Profile with Details
    // ------------------------------------------------------------------------
    console.log('Test 7: Get Employee Profile with Details...');
    const getRes = await fetch(`${usersUrl}/${createdEmployeeId}`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const getData = await getRes.json();
    assert(getRes.status === 200 && getData.success, 'Get employee details failed');
    assert(getData.data.id === createdEmployeeId, 'Returned correct employee ID');
    console.log('   ✅ Employee details fetched successfully.');

    console.log('\n✨ All Employee Management tests completed successfully!\n');
  } finally {
    server.close();
  }
}

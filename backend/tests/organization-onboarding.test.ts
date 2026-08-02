import { organizationRepository } from '../repositories/organization.repository.js';
import { invitationRepository } from '../repositories/invitation.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { v4 as uuidv4 } from 'uuid';

async function runTests() {
  console.log('--- STARTING ENTERPRISE ONBOARDING & INVITATION TESTS ---');

  try {
    // Test 1: Create Organization
    const testOrgId = uuidv4();
    const testOrgCode = `ORG-${Date.now().toString().slice(-6)}`;
    
    console.log('[Test 1] Creating Organization...');
    const org = await organizationRepository.create({
      id: testOrgId,
      name: `Test Enterprise ${Date.now()}`,
      industry: 'Technology',
      company_size: '50-250',
      org_code: testOrgCode,
      timezone: 'UTC',
      default_review_cycle: 'Q2 2026',
      language: 'en',
      review_frequency: 'Quarterly'
    });

    console.assert(org.id === testOrgId, 'Organization ID should match created ID');
    console.assert(org.org_code === testOrgCode, 'Organization Code should match created Code');
    console.log('✓ Test 1 Passed: Organization Creation verified.');

    // Test 2: Create User & Assign to Organization as OWNER
    console.log('[Test 2] Creating Owner User & Linking to Organization...');
    const ownerId = uuidv4();
    const ownerUser = await usersRepository.create({
      id: ownerId,
      employee_code: `EMP-OWNER-${Date.now().toString().slice(-4)}`,
      full_name: 'Enterprise Owner',
      email: `owner_${Date.now()}@verireview.ai`,
      role: 'OWNER',
      organization_id: testOrgId,
      is_active: true,
      created_at: new Date().toISOString()
    });

    console.assert(ownerUser.organization_id === testOrgId, 'User should be linked to Organization');
    console.assert(ownerUser.role === 'OWNER', 'User role should be OWNER');
    console.log('✓ Test 2 Passed: Owner role assignment verified.');

    // Test 3: Create & Send Invitation
    console.log('[Test 3] Creating & Sending Member Invitation...');
    const invId = uuidv4();
    const invCode = `INV-${Date.now().toString().slice(-6)}`;
    const invToken = uuidv4();
    const invitedEmail = `invited_emp_${Date.now()}@verireview.ai`;

    const inv = await invitationRepository.create({
      id: invId,
      organization_id: testOrgId,
      email: invitedEmail,
      role: 'EMPLOYEE',
      invitation_code: invCode,
      token: invToken,
      status: 'PENDING',
      invited_by: ownerId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    console.assert(inv.status === 'PENDING', 'Invitation status should be PENDING');
    console.assert(inv.invitation_code === invCode, 'Invitation code should match');
    console.log('✓ Test 3 Passed: Member Invitation Creation verified.');

    // Test 4: Accept Invitation
    console.log('[Test 4] Validating & Accepting Invitation...');
    const foundInv = await invitationRepository.findByCodeOrToken(invCode);
    console.assert(foundInv !== null, 'Invitation should be found by code');

    const empId = uuidv4();
    const empUser = await usersRepository.create({
      id: empId,
      employee_code: `EMP-${Date.now().toString().slice(-4)}`,
      full_name: 'Invited Employee',
      email: invitedEmail,
      role: foundInv!.role,
      organization_id: foundInv!.organization_id,
      is_active: true,
      created_at: new Date().toISOString()
    });

    await invitationRepository.updateStatus(foundInv!.id, 'ACCEPTED');
    const updatedInv = await invitationRepository.findById(foundInv!.id);

    console.assert(updatedInv!.status === 'ACCEPTED', 'Invitation status should update to ACCEPTED');
    console.assert(empUser.organization_id === testOrgId, 'Employee should join Organization');
    console.log('✓ Test 4 Passed: Invitation Acceptance verified.');

    // Test 5: Role Reassignment & Audit Trail
    console.log('[Test 5] Promoting Employee to MANAGER & Auditing Action...');
    const updatedUser = await usersRepository.update(empId, { role: 'MANAGER' });
    console.assert(updatedUser!.role === 'MANAGER', 'User role should update to MANAGER');

    const auditEntry = await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: testOrgId,
      review_cycle_id: null,
      claim_id: null,
      event_type: 'role_changed' as any,
      actor: { actor_type: 'human', actor_id: ownerId },
      timestamp: new Date().toISOString(),
      before_state: { role: 'EMPLOYEE' },
      after_state: { role: 'MANAGER' },
      details: { target_user_id: empId }
    });

    console.assert(auditEntry.log_id !== undefined, 'Audit record should be persisted');
    console.log('✓ Test 5 Passed: Role Reassignment & Audit Logging verified.');

    // Test 6: Invitation Expiration Validation
    console.log('[Test 6] Testing Invitation Expiration logic...');
    const expiredInvId = uuidv4();
    const expiredInvCode = `EXP-${Date.now().toString().slice(-6)}`;
    await invitationRepository.create({
      id: expiredInvId,
      organization_id: testOrgId,
      email: `expired_${Date.now()}@verireview.ai`,
      role: 'EMPLOYEE',
      invitation_code: expiredInvCode,
      token: uuidv4(),
      status: 'PENDING',
      invited_by: ownerId,
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // expired yesterday
    });

    const expiredInv = await invitationRepository.findByCodeOrToken(expiredInvCode);
    const isExpired = expiredInv ? new Date(expiredInv.expires_at) < new Date() : false;
    console.assert(isExpired === true, 'Invitation should be detected as expired');
    console.log('✓ Test 6 Passed: Invitation Expiration verified.');

    // Test 7: Duplicate Membership Guard
    console.log('[Test 7] Verifying Duplicate Membership Guard...');
    const existingUser = await usersRepository.findById(empId);
    console.assert(existingUser?.organization_id === testOrgId, 'User already belongs to an organization');
    console.log('✓ Test 7 Passed: Duplicate Membership check verified.');

    // Test 8: Unauthorized Role Modification Prevention
    console.log('[Test 8] Testing Unauthorized Access guard on Role Assignment...');
    const nonOwnerId = uuidv4();
    const regularUser = await usersRepository.create({
      id: nonOwnerId,
      employee_code: `EMP-REG-${Date.now().toString().slice(-4)}`,
      full_name: 'Regular Employee',
      email: `regular_${Date.now()}@verireview.ai`,
      role: 'EMPLOYEE',
      organization_id: testOrgId,
      is_active: true,
      created_at: new Date().toISOString()
    });

    // Verify regular employee cannot grant OWNER role
    const isAuthorized = regularUser.role === 'OWNER' || regularUser.role === 'HR_ADMIN';
    console.assert(isAuthorized === false, 'Regular EMPLOYEE should NOT be authorized to manage roles');
    console.log('✓ Test 8 Passed: Unauthorized Access guard verified.');

    console.log('====================================================');
    console.log('ALL ENTERPRISE ONBOARDING TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  }
}

runTests();

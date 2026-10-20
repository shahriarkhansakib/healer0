import {
  db,
  users,
  accounts,
  sessions,
  patientProfiles,
  patientRecords,
  appointments,
  counselingSessions,
  sessionNotes,
  prescriptions,
  doctorPatientMessages,
  doctorReviews,
  eq,
  inArray,
  or,
} from './index';

async function main() {
  console.log('--- Flushing Hardcoded Mock Patient & User Data ---');

  const fakeEmails = [
    'patient@healer.app',
    'patient1@healer.app',
    'patient2@healer.app',
    'patient3@healer.app',
    'patient4@healer.app',
    'patient5@healer.app',
    'test_user_1790877773946@gmail.com',
    'e2e_user_1790878904132@gmail.com',
    'e2e_user_1790878952341@gmail.com',
    'e2e_user_1790879032541@gmail.com',
  ];

  const fakePatientNames = [
    'Sarah Jenkins',
    'Michael Chang',
    'Emily Davis',
    'David Miller',
    'Lisa Anderson',
    'Test Patient',
    'Test Patient 10m',
  ];

  // 1. Find all matching users
  const fakeUsers = await db.query.users.findMany({
    where: inArray(users.email, fakeEmails),
  });
  const fakeUserIds = fakeUsers.map((u) => u.id);
  console.log(`Found ${fakeUserIds.length} fake user accounts to remove.`);

  // 2. Find their patientProfiles
  let fakeProfileIds: string[] = [];
  if (fakeUserIds.length > 0) {
    const profiles = await db.query.patientProfiles.findMany({
      where: inArray(patientProfiles.userId, fakeUserIds),
    });
    fakeProfileIds = profiles.map((p) => p.id);
  }
  console.log(`Found ${fakeProfileIds.length} fake patient profiles.`);

  const allPatientIds = [...new Set([...fakeUserIds, ...fakeProfileIds])];

  // 3. Delete Prescriptions
  if (allPatientIds.length > 0) {
    await db.delete(prescriptions).where(
      or(
        inArray(prescriptions.patientId, allPatientIds),
        inArray(prescriptions.patientName, fakePatientNames)
      )
    );
    console.log('✓ Cleared fake prescriptions.');
  }

  // 4. Delete Session Notes
  if (allPatientIds.length > 0) {
    await db.delete(sessionNotes).where(
      or(
        inArray(sessionNotes.patientId, allPatientIds),
        inArray(sessionNotes.patientName, fakePatientNames)
      )
    );
    console.log('✓ Cleared fake session notes.');
  }

  // 5. Delete Counseling Sessions
  if (allPatientIds.length > 0) {
    await db.delete(counselingSessions).where(
      or(
        inArray(counselingSessions.patientId, allPatientIds),
        inArray(counselingSessions.patientName, fakePatientNames)
      )
    );
    console.log('✓ Cleared fake counseling sessions.');
  }

  // 6. Delete Appointments
  if (allPatientIds.length > 0) {
    await db.delete(appointments).where(
      or(
        inArray(appointments.patientId, allPatientIds),
        inArray(appointments.patientName, fakePatientNames)
      )
    );
    console.log('✓ Cleared fake appointments.');
  }

  // 7. Delete Patient Records
  if (allPatientIds.length > 0) {
    await db.delete(patientRecords).where(
      or(
        inArray(patientRecords.patientId, allPatientIds),
        inArray(patientRecords.patientName, fakePatientNames)
      )
    );
    console.log('✓ Cleared fake patient records.');
  }

  // 8. Delete Doctor-Patient Messages
  if (fakeUserIds.length > 0) {
    await db.delete(doctorPatientMessages).where(
      or(
        inArray(doctorPatientMessages.patientUserId, fakeUserIds),
        inArray(doctorPatientMessages.senderId, fakeUserIds)
      )
    );
    console.log('✓ Cleared fake doctor-patient messages.');
  }

  // 9. Delete Doctor Reviews from fake patients
  await db.delete(doctorReviews).where(
    inArray(doctorReviews.patientName, ['Sarah J.', 'David M.', 'Sarah Jenkins', 'David Miller', 'Michael Chang'])
  );
  console.log('✓ Cleared fake doctor reviews.');

  // 10. Delete Patient Profiles
  if (fakeProfileIds.length > 0) {
    await db.delete(patientProfiles).where(inArray(patientProfiles.id, fakeProfileIds));
    console.log('✓ Cleared fake patient profiles.');
  }

  // 11. Delete Accounts & Sessions for fake users
  if (fakeUserIds.length > 0) {
    await db.delete(accounts).where(inArray(accounts.userId, fakeUserIds));
    await db.delete(sessions).where(inArray(sessions.userId, fakeUserIds));
    await db.delete(users).where(inArray(users.id, fakeUserIds));
    console.log('✓ Cleared fake user auth accounts and user records.');
  }

  console.log('--- Hardcoded user data flush complete! ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Flush failed:', err);
  process.exit(1);
});

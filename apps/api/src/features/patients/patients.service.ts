import { db, patientProfiles } from '@healer/db';

export const PatientsService = {
  async list() {
    return db.query.patientProfiles.findMany();
  }
};

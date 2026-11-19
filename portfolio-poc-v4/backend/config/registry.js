import { createHash } from 'node:crypto';
import { ensure } from '../utils/errors.js';
// Immutable demo policy, not a school-approved production policy.
const profiles = Object.freeze({
  admin: ['manage', 'workspace'],
  teacher: ['workspace'],
  student: ['workspace'],
  denied: []
});
export const policy = Object.freeze({
  key: 'stage1-demo',
  version: '1',
  profiles
});
export const policyHash = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
export function actions(profile) {
  ensure(Object.hasOwn(profiles, profile), 422, 'Unknown permission profile');
  return profiles[profile];
}
export function validateArtifact(artifact, expectedHash) {
  ensure(artifact && typeof artifact.key === 'string' && typeof artifact.version === 'string' && Array.isArray(artifact.axes) && artifact.axes.length > 0, 422, 'Incomplete rubric artifact');
  ensure(new Set(artifact.axes.map(a => a.key)).size === artifact.axes.length, 422, 'Duplicate rubric axis');
  for (const a of artifact.axes) ensure(a.key && Array.isArray(a.levels) && a.levels.length > 0 && a.levels.every((l, i) => l.order === i + 1 && typeof l.condition === 'string' && l.condition.trim()), 422, 'Invalid ordered rubric conditions');
  const hash = createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  ensure(hash === expectedHash, 422, 'Artifact hash mismatch');
  return Object.freeze({
    ...artifact,
    hash
  });
}
// No rubric is active in Stage 1; later stages publish validated, retained artifacts.

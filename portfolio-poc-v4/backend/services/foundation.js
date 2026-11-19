import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { ensure, timestamp } from '../utils/errors.js';
import { actions, policyHash } from '../config/registry.js';
const publicUser = ({
  password_hash,
  ...user
}) => user;
const effective = (a, now) => a.status === 'active' && !a.deassigned_at && a.effective_from <= now && (!a.effective_until || now < a.effective_until);
export function foundation(store) {
  function scope(user) {
    const active = store.list('assignments', user.school_id).filter(a => a.user_id === user.id && effective(a, timestamp()));
    const grants = new Set();
    for (const a of active) {
      if (a.assignment_kind === 'role') {
        const role = store.get('roles', a.role_id);
        if (role?.status === 'active') actions(role.permission_profile_key).forEach(x => grants.add(x));
      }
      if (a.assignment_kind === 'override' && a.effect === 'allow') grants.add(a.action_key);
    }
    for (const a of active) if (a.assignment_kind === 'override' && a.effect === 'deny') grants.delete(a.action_key);
    return {
      user: publicUser(user),
      actions: [...grants],
      assignments: active,
      policyHash
    };
  }
  function permit(user, action) {
    ensure(scope(user).actions.includes(action), 403, 'Not permitted in your current assignment scope');
  }
  function same(t, id, user) {
    const row = store.get(t, id);
    ensure(row && (t === 'schools' ? row.id : row.school_id) === user.school_id, 404, 'Record not found');
    return row;
  }
  function text(value, label) {
    ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= 200, 422, `${label} is required (maximum 200 characters)`);
    return value.trim();
  }
  function reason(body) {
    return text(body.reason, 'Reason');
  }
  function date(value, optional = false) {
    if (optional && (value === null || value === '')) return null;
    ensure(typeof value === 'string' && Number.isFinite(Date.parse(value)), 422, 'Invalid effective date');
    return new Date(value).toISOString();
  }
  function write(t, user, b, fn) {
    permit(user, 'manage');
    const why = reason(b);
    return store.mutate(t, user.id, why, fn);
  }
  return {
    scope,
    permit,
    same,
    authenticate(email, password) {
      const u = store.findUser(email);
      const salt = u?.id || 'invalid';
      const supplied = scryptSync(typeof password === 'string' ? password : '', salt, 64);
      ensure(u && u.status === 'active' && store.get('schools', u.school_id)?.status === 'active' && timingSafeEqual(supplied, Buffer.from(u.password_hash, 'hex')), 401, 'Invalid credentials');
      return u;
    },
    user(id) {
      const u = store.get('users', id);
      ensure(u && u.status === 'active' && store.get('schools', u.school_id)?.status === 'active', 401, 'Session unavailable');
      return u;
    },
    list(t, u) {
      permit(u, 'manage');
      return store.list(t, u.school_id).map(r => t === 'users' ? publicUser(r) : r);
    },
    person(u, id) {
      if (id !== u.id) permit(u, 'manage');
      return publicUser(same('users', id, u));
    },
    createPerson(u, b) {
      const result = write('users', u, b, () => {
        const name = text(b.display_name, 'Name'),
          email = text(b.email, 'Email').toLowerCase();
        ensure(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 422, 'Invalid email');
        ensure(['student', 'staff'].includes(b.user_kind), 422, 'Invalid user kind');
        ensure(typeof b.password === 'string' && b.password.length >= 10 && b.password.length <= 200, 422, 'Password must contain 10–200 characters');
        const id = randomUUID();
        return store.insert('users', {
          id,
          school_id: u.school_id,
          source_id: id,
          display_name: name,
          email,
          user_kind: b.user_kind,
          password_hash: scryptSync(b.password, id, 64).toString('hex'),
          status: 'active'
        });
      });
      return {
        ...result,
        record: publicUser(result.record)
      };
    },
    createRole(u, b) {
      return write('roles', u, b, () => {
        actions(b.permission_profile_key);
        return store.insert('roles', {
          id: randomUUID(),
          school_id: u.school_id,
          code: text(b.code, 'Code'),
          name_en: text(b.name_en, 'Label'),
          name_zh: text(b.name_zh, 'Chinese label'),
          permission_profile_key: b.permission_profile_key,
          permission_profile_version: '1',
          status: 'active'
        });
      });
    },
    createDefinition(u, b) {
      return write('school_definitions', u, b, () => {
        const parents = {
          year: null,
          period: 'year',
          class: 'year',
          subject: null,
          group: null,
          department: null,
          position: null,
          label: null
        };
        ensure(Object.hasOwn(parents, b.kind), 422, 'Invalid definition kind');
        if (parents[b.kind]) {
          const p = same('school_definitions', b.parent_definition_id, u);
          ensure(p.kind === parents[b.kind], 422, 'Invalid parent kind');
        } else ensure(!b.parent_definition_id, 422, 'Parent not permitted for this kind');
        const start = b.start_at ? date(b.start_at) : null,
          end = b.end_at ? date(b.end_at) : null;
        ensure(!start || !end || end > start, 422, 'End must follow start');
        return store.insert('school_definitions', {
          id: randomUUID(),
          school_id: u.school_id,
          kind: b.kind,
          code: text(b.code, 'Code'),
          name: text(b.name, 'Name'),
          parent_definition_id: b.parent_definition_id || null,
          start_at: start,
          end_at: end,
          status: 'active'
        });
      });
    },
    assign(u, b) {
      return write('assignments', u, b, () => {
        const assignedUser = same('users', b.user_id, u);
        ensure(['role', 'membership', 'override'].includes(b.assignment_kind), 422, 'Invalid assignment kind');
        let role = null,
          definition = null,
          period = null;
        if (b.assignment_kind === 'role') {
          role = same('roles', b.role_id, u);
          ensure(role.status === 'active', 422, 'Role inactive');
        }
        if (b.assignment_kind === 'membership') {
          definition = same('school_definitions', b.school_definition_id, u);
          ensure(['class', 'group', 'position'].includes(definition.kind) && definition.status === 'active', 422, 'Invalid membership scope');
        }
        if (b.period_id) {
          period = same('school_definitions', b.period_id, u);
          ensure(period.kind === 'period', 422, 'Period required');
        }
        if (b.assignment_kind === 'override') ensure(['manage', 'workspace'].includes(b.action_key) && ['allow', 'deny'].includes(b.effect), 422, 'Invalid override');
        if (b.assignment_kind === 'membership' && assignedUser.user_kind === 'student') ensure(period, 422, 'Student membership requires a reporting period');
        if (period) ensure(period.start_at && period.end_at, 422, 'Reporting period dates must be configured');
        const from = period ? period.start_at : date(b.effective_from),
          until = period ? period.end_at : date(b.effective_until ?? null, true);
        ensure(!until || until > from, 422, 'End must follow start');
        const duplicate = store.list('assignments', u.school_id).some(a => a.user_id === b.user_id && a.assignment_kind === b.assignment_kind && a.role_id === (role?.id || null) && a.school_definition_id === (definition?.id || null) && a.action_key === (b.assignment_kind === 'override' ? b.action_key : null) && a.status === 'active' && !a.deassigned_at && (!a.effective_until || from < a.effective_until) && (!until || a.effective_from < until));
        ensure(!duplicate, 409, 'Overlapping assignment exists');
        return store.insert('assignments', {
          id: randomUUID(),
          school_id: u.school_id,
          assignment_kind: b.assignment_kind,
          user_id: b.user_id,
          role_id: role?.id || null,
          school_definition_id: definition?.id || null,
          period_id: period?.id || null,
          action_key: b.assignment_kind === 'override' ? b.action_key : null,
          effect: b.assignment_kind === 'override' ? b.effect : null,
          assigned_by: u.id,
          assigned_at: timestamp(),
          effective_from: from,
          effective_until: until,
          status: 'active'
        });
      });
    },
    deassign(u, id, b) {
      return write('assignments', u, b, () => {
        const a = same('assignments', id, u);
        ensure(a.status === 'active', 409, 'Assignment already ended');
        ensure(Number.isInteger(b.row_version), 422, 'Expected row version required');
        return store.update('assignments', id, b.row_version, {
          status: 'inactive',
          deassigned_by: u.id,
          deassigned_at: timestamp()
        });
      });
    },
    link(u, b) {
      return write('record_links', u, b, () => {
        ensure(b.relation === 'subject_department' && b.source_type === 'school_definitions' && b.target_type === 'school_definitions', 422, 'Unsupported relation');
        const source = same(b.source_type, b.source_id, u),
          target = same(b.target_type, b.target_id, u);
        ensure(source.kind === 'subject' && target.kind === 'department', 422, 'Invalid relation endpoints');
        return store.insert('record_links', {
          id: randomUUID(),
          school_id: u.school_id,
          relation: b.relation,
          source_type: b.source_type,
          source_id: b.source_id,
          target_type: b.target_type,
          target_id: b.target_id,
          status: 'active'
        });
      });
    },
    events(u) {
      permit(u, 'manage');
      return store.list('change_logs', u.school_id).filter(e => e.kind === 'event').reverse();
    },
    snapshot(u, id) {
      permit(u, 'manage');
      return store.snapshot(id, u.school_id);
    }
  };
}

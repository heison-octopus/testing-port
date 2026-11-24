import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { ensure, timestamp } from '../utils/errors.js';
import { actions, permissionKeys, profileLabels, policyHash, validatePermission } from '../config/registry.js';
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
        if (role?.status === 'active') {
          const mappings = store.list('role_permissions', user.school_id).filter(p => p.role_id === role.id && p.status === 'active');
          (mappings.length ? mappings : actions(role.permission_profile_key).map(permission_key => ({ permission_key, effect: 'allow' }))).forEach(p => p.effect === 'allow' ? grants.add(p.permission_key) : grants.delete(p.permission_key));
        }
      }
      if (a.assignment_kind === 'override' && a.effect === 'allow') grants.add(a.action_key);
      if (a.assignment_kind === 'override' && a.effect === 'deny') grants.delete(a.action_key);
    }
    return { user: publicUser(user), actions: [...grants], assignments: active, policyHash };
  }
  function permit(user, action) {
    ensure(permissionKeys.includes(action), 422, 'Unknown permission');
    ensure(scope(user).actions.includes(action), 403, `Permission required: ${action}`);
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
    const permission = { users: 'people.create', roles: 'roles.create', school_definitions: 'school-definitions.create', assignments: 'assignments.create', record_links: 'assignments.update', activities: 'activity.create' }[t];
    permit(user, permission);
    const why = reason(b);
    return store.mutate(t, user.id, why, fn);
  }
  return {
    scope,
    permit,
    same,
    authenticate(identifier, password) {
      const u = store.findUser(identifier);
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
      const readPermission = { users: 'people.read', roles: 'roles.read', school_definitions: 'school-definitions.read', assignments: 'assignments.read', record_links: 'assignments.read', role_permissions: 'roles.read' }[t] || 'workspace.read';
      permit(u, readPermission);
      return store.list(t, u.school_id).map(r => t === 'users' ? publicUser(r) : r);
    },
    person(u, id) {
      if (id !== u.id) permit(u, 'people.read');
      return publicUser(same('users', id, u));
    },
    createPerson(u, b) {
      const result = write('users', u, b, () => {
        const name = text(b.display_name, 'Name'),
          email = text(b.email, 'Email').toLowerCase(),
          inSchoolId = text(b.in_school_id, 'In-school ID');
        ensure(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 422, 'Invalid email');
        ensure(!store.list('users', u.school_id).some(existing => existing.in_school_id === inSchoolId), 409, 'In-school ID is already used');
        ensure(['student', 'staff'].includes(b.user_kind), 422, 'Invalid user kind');
        ensure(typeof b.password === 'string' && b.password.length >= 10 && b.password.length <= 200, 422, 'Password must contain 10–200 characters');
        const id = randomUUID();
        return store.insert('users', {
          id,
          school_id: u.school_id,
          source_id: id,
          in_school_id: inSchoolId,
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
    disablePerson(u, id, b = {}) {
      permit(u, 'people.delete');
      const row = same('users', id, u);
      const why = reason(b);
      return store.transaction(() => {
        const updated = store.update('users', id, row.row_version, { status: 'disabled' });
        return { record: publicUser(updated), event_id: store.audit('users', updated, u.id, why) };
      });
    },
    createRole(u, b) {
      permit(u, 'roles.create');
      const why = reason(b);
      return store.transaction(() => {
        const profile = b.permission_profile_key || 'denied';
        actions(profile);
        const role = store.insert('roles', { id: randomUUID(), school_id: u.school_id, code: text(b.code, 'Code'), name_en: text(b.name_en, 'Label'), name_zh: text(b.name_zh, 'Chinese label'), permission_profile_key: profile, permission_profile_version: '2', status: 'active' });
        const keys = Array.isArray(b.permission_keys) ? b.permission_keys : actions(profile);
        for (const key of keys) { validatePermission(key); store.insert('role_permissions', { id: randomUUID(), school_id: u.school_id, role_id: role.id, permission_key: key, effect: 'allow', assigned_by: u.id, assigned_at: timestamp(), status: 'active' }); }
        return { record: role, event_id: store.audit('roles', role, u.id, why) };
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
        ensure(['role', 'membership', 'override', 'activity_staff', 'participant'].includes(b.assignment_kind), 422, 'Invalid assignment kind');
        let role = null,
          definition = null,
          period = null;
        if (['activity_staff', 'participant'].includes(b.assignment_kind)) {
          const activity = same('activities', b.activity_id, u);
          ensure(activity.operational_status !== 'cancelled', 422, 'Activity is unavailable');
        }
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
        if (b.assignment_kind === 'override') ensure(permissionKeys.includes(b.action_key) && ['allow', 'deny'].includes(b.effect), 422, 'Invalid override');
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
          activity_id: ['activity_staff', 'participant'].includes(b.assignment_kind) ? b.activity_id : null,
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
      permit(u, 'assignments.update');
      const why = reason(b);
      return store.transaction(() => {
        const a = same('assignments', id, u);
        ensure(a.status === 'active', 409, 'Assignment already ended');
        ensure(Number.isInteger(b.row_version), 422, 'Expected row version required');
        const updated = store.update('assignments', id, b.row_version, { status: 'inactive', deassigned_by: u.id, deassigned_at: timestamp() });
        return { record: updated, event_id: store.audit('assignments', updated, u.id, why) };
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
    listActivities(u) {
      const grants = scope(u).actions;
      permit(u, 'activity.read');
      if (grants.includes('activity.create') || grants.includes('activity.update')) return store.list('activities', u.school_id);
      const ids = new Set(store.list('assignments', u.school_id).filter(a => a.user_id === u.id && a.activity_id && effective(a, timestamp())).map(a => a.activity_id));
      return store.list('activities', u.school_id).filter(a => ids.has(a.id));
    },
    activity(u, id) { permit(u, 'activity.read'); const row = same('activities', id, u); const canManage = scope(u).actions.includes('activity.update') && (row.owner_id === u.id || scope(u).actions.includes('activity.create')); ensure(canManage || store.list('assignments', u.school_id).some(a => a.activity_id === id && a.user_id === u.id && effective(a, timestamp())), 404, 'Activity not found'); return row; },
    createActivity(u, b) {
      permit(u, 'activity.create');
      const why = reason(b);
      const result = store.mutate('activities', u.id, why, () => { const period = b.period_id ? same('school_definitions', b.period_id, u) : null; if (period) ensure(period.kind === 'period', 422, 'Invalid period'); return store.insert('activities', { id: randomUUID(), school_id: u.school_id, kind: 'activity', parent_activity_id: null, title: text(b.title, 'Title'), description: text(b.description, 'Description'), owner_id: u.id, source_key: b.source_key || null, activity_type: text(b.activity_type, 'Activity type'), period_id: b.period_id || null, start_at: date(b.start_at), end_at: date(b.end_at), questionnaire_definition_id: b.questionnaire_definition_id || null, reviewer_id: b.reviewer_id || null, operational_status: 'draft', published_status: 'draft' }); });
      return result;
    },
    updateActivity(u, id, b) { permit(u, 'activity.update'); const row = this.activity(u, id); const why = reason(b); return store.transaction(() => { const updated = store.update('activities', id, b.row_version, { title: text(b.title ?? row.title, 'Title'), description: text(b.description ?? row.description, 'Description'), activity_type: text(b.activity_type ?? row.activity_type, 'Activity type'), start_at: date(b.start_at ?? row.start_at), end_at: date(b.end_at ?? row.end_at), source_key: b.source_key ?? row.source_key }); return { record: updated, event_id: store.audit('activities', updated, u.id, why) }; }); },
    removeActivity(u, id, b) { permit(u, 'activity.delete'); const row = this.activity(u, id); const why = reason(b); return store.transaction(() => { const updated = store.update('activities', id, b.row_version, { operational_status: 'cancelled' }); return { record: updated, event_id: store.audit('activities', updated, u.id, why) }; }); },
    activityParticipants(u, id) { permit(u, 'activity.update'); this.activity(u, id); return store.list('assignments', u.school_id).filter(a => a.activity_id === id); },
    previewAssignmentImport(u, b) {
      permit(u, 'assignments.create'); ensure(typeof b.csv === 'string' && b.csv.trim(), 422, 'CSV content required');
      const lines = b.csv.trim().split(/\r?\n/).map(x => x.split(',').map(v => v.trim())); const header = lines.shift(); const required = ['user_id', 'new_class', 'class_number', 'effective_period']; ensure(header?.join(',') === required.join(','), 422, `Columns must be exactly: ${required.join(',')}`);
      const seen = new Set(), errors = [], valid = [];
      lines.forEach((values, i) => { const row = i + 2, data = Object.fromEntries(required.map((key, j) => [key, values[j] || ''])); const issue = (column, message) => errors.push({ row, column, message }); if (values.length !== required.length) issue('columns', 'Unexpected number of columns'); const user = store.get('users', data.user_id); if (!user || user.school_id !== u.school_id) issue('user_id', 'Unknown user in this school'); const klass = store.list('school_definitions', u.school_id).find(x => x.kind === 'class' && (x.code === data.new_class || x.name === data.new_class)); if (!klass) issue('new_class', `Class ${data.new_class} is not configured`); const period = store.list('school_definitions', u.school_id).find(x => x.kind === 'period' && (x.code === data.effective_period || x.id === data.effective_period)); if (!period) issue('effective_period', `Period ${data.effective_period} is not configured`); const key = `${data.user_id}|${data.effective_period}`; if (seen.has(key)) issue('user_id', 'Duplicate user and period row'); seen.add(key); if (user && klass && period && !errors.some(e => e.row === row)) { const previous = store.list('assignments', u.school_id).find(x => x.user_id === user.id && x.assignment_kind === 'membership' && x.period_id === period.id && x.status === 'active'); valid.push({ ...data, user_id: user.id, class_id: klass.id, period_id: period.id, effective_from: period.start_at, effective_until: period.end_at, changes: [{ field: 'school_definition_id', before: previous?.school_definition_id || null, after: klass.id }, { field: 'period_id', before: previous?.period_id || null, after: period.id }] }); } }); return { headers: required, valid, errors, can_commit: errors.length === 0 && valid.length > 0 };
    },
    commitAssignmentImport(u, b) { const preview = this.previewAssignmentImport(u, b); ensure(preview.can_commit, 422, 'Correct CSV errors before commit'); return store.transaction(() => { const events = []; for (const row of preview.valid) { const record = store.insert('assignments', { id: randomUUID(), school_id: u.school_id, assignment_kind: 'membership', user_id: row.user_id, role_id: null, school_definition_id: row.class_id, activity_id: null, period_id: row.period_id, assigned_by: u.id, assigned_at: timestamp(), effective_from: row.effective_from, effective_until: row.effective_until, status: 'active' }); events.push(store.audit('assignments', record, u.id, b.reason || 'Batch class/period import')); } return { imported: preview.valid.length, event_ids: events }; }); },
    listRolePermissions(u, roleId) { permit(u, 'roles.read'); const role = same('roles', roleId, u); return store.list('role_permissions', u.school_id).filter(p => p.role_id === role.id); },
    previewUserImport(u, b) {
      permit(u, 'people.update'); ensure(typeof b.csv === 'string' && b.csv.trim(), 422, 'CSV content required');
      const base = ['user_id', 'in_school_id', 'display_name', 'email', 'user_kind', 'status'], createHeader = [...base, 'password'];
      const lines = b.csv.trim().split(/\r?\n/).map(x => x.split(',').map(v => v.trim()));
      const header = lines.shift(); const extended = header?.join(',') === createHeader.join(','); const exported = header?.join(',') === base.join(',');
      ensure(extended || exported || header?.join(',') === ['user_id', 'display_name', 'email', 'user_kind', 'status'].join(','), 422, `Columns must be ${base.join(',')} or ${createHeader.join(',')}`);
      const required = header?.includes('in_school_id') ? base : ['user_id', 'display_name', 'email', 'user_kind', 'status'];
      const errors = [], valid = [], seen = new Set();
      lines.forEach((values, i) => {
        const row = i + 2, data = Object.fromEntries(header.map((key, j) => [key, values[j] || ''])); const issue = (column, message) => errors.push({ row, column, message });
        if (values.length !== header.length) issue('columns', 'Unexpected number of columns');
        const user = data.user_id ? store.get('users', data.user_id) : null; const isCreate = !user && extended && Boolean(data.password);
        if (!user && !isCreate) issue('user_id', 'Unknown user; include a password to create a new user');
        if (user && user.school_id !== u.school_id) issue('user_id', 'Unknown user in this school');
        if (seen.has(data.user_id || data.in_school_id)) issue('user_id', 'Duplicate user row'); seen.add(data.user_id || data.in_school_id);
        if (!data.display_name) issue('display_name', 'Display name is required');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) issue('email', 'Invalid email');
        if (!['student', 'staff'].includes(data.user_kind)) issue('user_kind', 'Must be student or staff');
        if (!['active', 'pending', 'suspended', 'disabled'].includes(data.status)) issue('status', 'Unsupported status');
        if (isCreate && (!data.in_school_id || data.password.length < 10)) issue('password', 'New users require an in-school ID and a password of at least 10 characters');
        if (data.in_school_id && store.list('users', u.school_id).some(x => x.in_school_id === data.in_school_id && x.id !== data.user_id)) issue('in_school_id', 'In-school ID is already used');
        if (user && data.email !== user.email) { const duplicate = store.list('users', u.school_id).find(x => x.id !== user.id && x.email === data.email); if (duplicate) issue('email', 'Email is already used by another user'); }
        if (isCreate && store.list('users', u.school_id).some(x => x.email === data.email)) issue('email', 'Email is already used by another user');
        if (!errors.some(e => e.row === row)) {
          const changes = isCreate ? [{ field: 'record', before: null, after: 'new user' }] : [['in_school_id', user.in_school_id, data.in_school_id || user.in_school_id], ['display_name', user.display_name, data.display_name], ['email', user.email, data.email.toLowerCase()], ['user_kind', user.user_kind, data.user_kind], ['status', user.status, data.status]].filter(([, before, after]) => String(before ?? '') !== String(after ?? '')).map(([field, before, after]) => ({ field, before, after }));
          valid.push({ ...data, row_version: user?.row_version || null, create: isCreate, changes });
        }
      });
      return { headers: required, valid, errors, can_commit: errors.length === 0 && valid.length > 0 };
    },
    commitUserImport(u, b) {
      const preview = this.previewUserImport(u, b); ensure(preview.can_commit, 422, 'Correct CSV errors before commit');
      return store.transaction(() => { const events = []; for (const row of preview.valid) { let updated; if (row.create) { const id = randomUUID(); updated = store.insert('users', { id, school_id: u.school_id, source_id: randomUUID(), in_school_id: row.in_school_id, display_name: row.display_name, email: row.email.toLowerCase(), user_kind: row.user_kind, password_hash: scryptSync(row.password, id, 64).toString('hex'), status: row.status }); } else { updated = store.update('users', row.user_id, row.row_version, { display_name: row.display_name, email: row.email.toLowerCase(), user_kind: row.user_kind, status: row.status, in_school_id: row.in_school_id || store.get('users', row.user_id).in_school_id }); } events.push(store.audit('users', updated, u.id, b.reason || (row.create ? 'User CSV create' : 'User CSV import'))); } return { updated: preview.valid.length, created: preview.valid.filter(row => row.create).length, event_ids: events }; });
    },
    exportUsers(u, filters = {}) { permit(u, 'people.read'); const query = String(filters.q || '').trim().toLowerCase(); const rows = store.list('users', u.school_id).filter(x => (!filters.status || x.status === filters.status) && (!filters.user_kind || x.user_kind === filters.user_kind) && (!query || `${x.id} ${x.in_school_id} ${x.display_name} ${x.email}`.toLowerCase().includes(query))); return [['user_id','in_school_id','display_name','email','user_kind','status'], ...rows.map(x => [x.id, x.in_school_id, x.display_name, x.email, x.user_kind, x.status])].map(row => row.map(v => `\"${String(v ?? '').replaceAll('\"', '\\"')}\"`).join(',')).join('\n') + '\n'; },
    exportAssignments(u) { permit(u, 'assignments.read'); const rows = store.list('assignments', u.school_id); return [['assignment_id','user_id','assignment_kind','role_id','school_definition_id','activity_id','period_id','effective_from','effective_until','status'], ...rows.map(x => [x.id,x.user_id,x.assignment_kind,x.role_id,x.school_definition_id,x.activity_id,x.period_id,x.effective_from,x.effective_until,x.status])].map(row => row.map(v => `\"${String(v ?? '').replaceAll('\"', '\\"')}\"`).join(',')).join('\n') + '\n'; },
    previewRoleRefresh(u, b) {
      permit(u, 'assignments.update'); ensure(typeof b.csv === 'string' && b.csv.trim(), 422, 'CSV content required');
      const required = ['user_id', 'role_code', 'effective_period', 'action']; const lines = b.csv.trim().split(/\r?\n/).map(x => x.split(',').map(v => v.trim())); const header = lines.shift(); ensure(header?.join(',') === required.join(','), 422, `Columns must be exactly: ${required.join(',')}`);
      const errors = [], valid = [], seen = new Set();
      lines.forEach((values, i) => { const row = i + 2, data = Object.fromEntries(required.map((key,j)=>[key,values[j]||''])); const issue=(column,message)=>errors.push({row,column,message}); const user=store.get('users',data.user_id); const role=store.list('roles',u.school_id).find(x=>x.code===data.role_code); const period=store.list('school_definitions',u.school_id).find(x=>x.kind==='period'&&(x.code===data.effective_period||x.id===data.effective_period)); const key=`${data.user_id}|${data.role_code}|${data.effective_period}`; if(seen.has(key)) issue('user_id','Duplicate refresh row'); seen.add(key); if(!user||user.school_id!==u.school_id) issue('user_id','Unknown user in this school'); if(!role) issue('role_code','Role is not configured'); if(!period||!period.start_at||!period.end_at) issue('effective_period','Period is not configured with dates'); if(!['assign','remove'].includes(data.action)) issue('action','Must be assign or remove'); if(data.action==='remove'&&user&&role&&!store.list('assignments',u.school_id).some(a=>a.user_id===user.id&&a.role_id===role.id&&a.assignment_kind==='role'&&a.status==='active'&&!a.deassigned_at&&a.effective_from<period?.end_at&&( !a.effective_until||a.effective_until>period?.start_at))) issue('action','No active role assignment to remove'); if(!errors.some(e=>e.row===row)) { const previous = store.list('assignments',u.school_id).find(a=>a.user_id===user.id&&a.role_id===role.id&&a.assignment_kind==='role'&&a.status==='active'); valid.push({...data,user_id:user.id,role_id:role.id,period_id:period.id,effective_from:period.start_at,effective_until:period.end_at,changes:[{field:'role_id',before:previous?.role_id||null,after:role.id},{field:'action',before:previous?'assigned':'unassigned',after:data.action}]}); } }); return {headers:required,valid,errors,can_commit:errors.length===0&&valid.length>0};
    },
    commitRoleRefresh(u,b) { const preview=this.previewRoleRefresh(u,b); ensure(preview.can_commit,422,'Correct CSV errors before commit'); return store.transaction(()=>{const events=[]; for(const row of preview.valid){const active=store.list('assignments',u.school_id).filter(a=>a.user_id===row.user_id&&a.role_id===row.role_id&&a.assignment_kind==='role'&&a.status==='active'&&!a.deassigned_at&&a.effective_from<row.effective_until&&(!a.effective_until||a.effective_until>row.effective_from)); for(const old of active) store.update('assignments',old.id,old.row_version,{effective_until:row.effective_from,status:'inactive',deassigned_by:u.id,deassigned_at:timestamp()}); if(row.action==='assign'){const record=store.insert('assignments',{id:randomUUID(),school_id:u.school_id,assignment_kind:'role',user_id:row.user_id,role_id:row.role_id,school_definition_id:null,activity_id:null,period_id:row.period_id,action_key:null,effect:null,assigned_by:u.id,assigned_at:timestamp(),effective_from:row.effective_from,effective_until:row.effective_until,status:'active'}); events.push(store.audit('assignments',record,u.id,b.reason||'Role period refresh'));} } return {refreshed:preview.valid.length,event_ids:events}; }); },
  updateRolePermissions(u, roleId, b) { permit(u, 'roles.update'); const role = same('roles', roleId, u); ensure(Array.isArray(b.permission_keys), 422, 'permission_keys must be an array'); return store.transaction(() => { const wanted = new Set(b.permission_keys.map(validatePermission)); const current = store.list('role_permissions', u.school_id).filter(p => p.role_id === role.id); for (const p of current) store.update('role_permissions', p.id, p.row_version, { status: wanted.has(p.permission_key) ? 'active' : 'inactive' }); for (const key of wanted) if (!current.some(p => p.permission_key === key)) store.insert('role_permissions', { id: randomUUID(), school_id: u.school_id, role_id: role.id, permission_key: key, effect: 'allow', assigned_by: u.id, assigned_at: timestamp(), status: 'active' }); return { record: role, event_id: store.audit('roles', role, u.id, reason(b)) }; }); },
  events(u) {
      permit(u, 'audit.read');
      return store.list('change_logs', u.school_id).filter(e => e.kind === 'event').reverse();
    },
    snapshot(u, id) {
      permit(u, 'audit.read');
      return store.snapshot(id, u.school_id);
    }
  };
}

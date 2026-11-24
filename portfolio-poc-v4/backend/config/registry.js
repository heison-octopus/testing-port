import { createHash } from 'node:crypto';
import { ensure } from '../utils/errors.js';
// Demo permission profiles are explicit examples; school policy remains configurable.
export const permissionKeys = Object.freeze([
  'workspace.read', 'people.read', 'people.create', 'people.update', 'people.delete',
  'roles.read', 'roles.create', 'roles.update', 'roles.delete',
  'assignments.read', 'assignments.create', 'assignments.update', 'assignments.delete',
  'school-definitions.read', 'school-definitions.create', 'school-definitions.update', 'school-definitions.delete',
  'activity.read', 'activity.create', 'activity.update', 'activity.delete',
  'questionnaire.read', 'questionnaire.create', 'questionnaire.update', 'questionnaire.delete',
  'media.read', 'media.create', 'media.update', 'media.delete',
  'portfolio.read', 'portfolio.create', 'portfolio.update', 'portfolio.delete', 'portfolio.approve',
  'audit.read'
]);
const crud = resource => permissionKeys.filter(key => key.startsWith(`${resource}.`));
const profiles = Object.freeze({
  admin: [...permissionKeys],
  teacher: ['workspace.read','activity.read','activity.create','activity.update','assignments.read','assignments.create','assignments.update','questionnaire.read','portfolio.read','media.read','audit.read'],
  student: ['workspace.read','activity.read','questionnaire.read','questionnaire.create','questionnaire.update','portfolio.read','portfolio.update','media.read'],
  denied: [],
  'portfolio-reader': ['workspace.read','portfolio.read'],
  'portfolio-approver': ['workspace.read','portfolio.read','portfolio.approve'],
  'activity-creator': ['workspace.read','activity.read','activity.create','activity.update','assignments.read','assignments.create'],
  'class-teacher': ['workspace.read','activity.read','assignments.read','assignments.create','assignments.update','portfolio.read'],
  'assistant-teacher': ['workspace.read','activity.read','assignments.read','questionnaire.read','media.read'],
  'activity-coordinator': ['workspace.read','activity.read','activity.create','activity.update','assignments.read','assignments.create','assignments.update','questionnaire.read'],
  'vice-principal': ['workspace.read','people.read','roles.read','assignments.read','school-definitions.read','activity.read','questionnaire.read','portfolio.read','portfolio.approve','audit.read'],
  'super-teacher': ['workspace.read','activity.read','activity.create','activity.update','assignments.read','assignments.create','assignments.update','questionnaire.read','portfolio.read','portfolio.approve','media.read'],
  'subject-teacher': ['workspace.read','activity.read','assignments.read','questionnaire.read','portfolio.read'],
  'peer-reviewer': ['workspace.read','activity.read','questionnaire.read','questionnaire.create']
});
export const profileLabels = Object.freeze({
  admin:['SchoolAdmin','學校管理員'], teacher:['Teacher','教師'], student:['Student','學生'], denied:['Denied','未獲授權'], 'portfolio-reader':['Portfolio reader','Portfolio 閱讀者'], 'portfolio-approver':['Portfolio approver','Portfolio 批核者'], 'activity-creator':['Activity creator','活動建立者'], 'class-teacher':['Class teacher','班主任'], 'assistant-teacher':['Assistant teacher','助理老師'], 'activity-coordinator':['Activity coordinator','活動主任'], 'vice-principal':['Vice principal','副校長'], 'super-teacher':['SuperTeacher','SuperTeacher'], 'subject-teacher':['Subject teacher','科任老師'], 'peer-reviewer':['Peer reviewer','同儕互評者']
});
export const policy = Object.freeze({key:'stage1-explicit-permissions',version:'2',profiles});
export const policyHash=createHash('sha256').update(JSON.stringify(policy)).digest('hex');
export function actions(profile){ensure(Object.hasOwn(profiles,profile),422,'Unknown permission profile');return profiles[profile];}
export function hasPermission(profile,key){return actions(profile).includes(key);}
export function validatePermission(key){ensure(permissionKeys.includes(key),422,'Unknown permission key');return key;}
export function validateArtifact(artifact,expectedHash){ensure(artifact&&typeof artifact.key==='string'&&typeof artifact.version==='string'&&Array.isArray(artifact.axes)&&artifact.axes.length>0,422,'Incomplete rubric artifact');ensure(new Set(artifact.axes.map(a=>a.key)).size===artifact.axes.length,422,'Duplicate rubric axis');for(const a of artifact.axes)ensure(a.key&&Array.isArray(a.levels)&&a.levels.length>0&&a.levels.every((l,i)=>l.order===i+1&&typeof l.condition==='string'&&l.condition.trim()),422,'Invalid ordered rubric conditions');const hash=createHash('sha256').update(JSON.stringify(artifact)).digest('hex');ensure(hash===expectedHash,422,'Artifact hash mismatch');return Object.freeze({...artifact,hash});}

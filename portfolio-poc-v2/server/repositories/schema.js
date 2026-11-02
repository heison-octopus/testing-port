export const schemaVersion = 'poc-v2-2026-11-02-template-foundation';

export const schema = String.raw`
CREATE TABLE academic_periods(
        period_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        academic_year_id TEXT NOT NULL,
        academic_year_label TEXT NOT NULL,
        period_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        is_summer INTEGER NOT NULL,
        portfolio_snapshot_due TEXT,
        resolution_priority INTEGER NOT NULL,
        status TEXT NOT NULL
      );

CREATE TABLE activities(activity_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,external_activity_id TEXT,activity_template_id TEXT,group_id TEXT,created_by_user_id TEXT NOT NULL,latest_revision_id TEXT,current_approved_revision_id TEXT,operational_status TEXT NOT NULL,resolved_period_id TEXT,period_resolution_status TEXT,period_resolved_at TEXT,period_exception_approved_by TEXT,period_exception_reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL, disabled_previous_status TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT);

CREATE TABLE activity_change_requests(activity_change_request_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,base_revision_id TEXT NOT NULL,requested_by_user_id TEXT NOT NULL,target_owner_user_id TEXT NOT NULL,field_key TEXT NOT NULL,current_value TEXT,proposed_value TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL,resolved_by_user_id TEXT,resolution_note TEXT,resulting_revision_id TEXT,requested_at TEXT NOT NULL,resolved_at TEXT);

CREATE TABLE activity_dependency_impacts(
        activity_dependency_impact_id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL REFERENCES activities(activity_id),
        dependency_type TEXT NOT NULL,
        dependency_id TEXT NOT NULL,
        impact_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        triggered_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        triggered_at TEXT NOT NULL,
        resolved_by_user_id TEXT,
        resolved_at TEXT,
        resolution_note TEXT
      );

CREATE TABLE activity_label_assignments(
    activity_label_assignment_id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(activity_id),
    activity_revision_id TEXT NOT NULL REFERENCES activity_revisions(activity_revision_id),
    rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
    axis_id TEXT NOT NULL REFERENCES rubric_axes(axis_id),
    catalogue_version TEXT NOT NULL,
    label_role TEXT NOT NULL,
    source TEXT NOT NULL,
    rationale TEXT,
    approval_state TEXT NOT NULL,
    assigned_by_user_id TEXT NOT NULL REFERENCES users(user_id),
    assigned_at TEXT NOT NULL,
    status TEXT NOT NULL,
    disabled_reason TEXT,
    disabled_by_user_id TEXT,
    disabled_at TEXT,
    UNIQUE(activity_revision_id,axis_id,label_role)
  );

CREATE TABLE activity_media(
        activity_media_id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL REFERENCES activities(activity_id),
        media_asset_id TEXT NOT NULL REFERENCES media_assets(media_asset_id),
        relationship_type TEXT NOT NULL,
        added_by_user_id TEXT NOT NULL,
        added_at TEXT NOT NULL,
        status TEXT NOT NULL,
        UNIQUE(activity_id,media_asset_id,relationship_type)
      );

CREATE TABLE activity_people(activity_person_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(activity_id),user_id TEXT NOT NULL REFERENCES users(user_id),person_type TEXT NOT NULL,relationship_type TEXT NOT NULL,role_assignment_id TEXT,group_code TEXT,planned_attendance_status TEXT,actual_attendance_status TEXT,attendance_approval_status TEXT,can_edit INTEGER NOT NULL,can_view_raw_media INTEGER NOT NULL,can_submit_response INTEGER NOT NULL,effective_from TEXT,effective_until TEXT,assigned_by_user_id TEXT,assigned_at TEXT, status TEXT NOT NULL DEFAULT 'active', supersedes_activity_person_id TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT, updated_by_user_id TEXT, updated_at TEXT);

CREATE TABLE activity_revision_risk_flags(
        activity_revision_id TEXT NOT NULL REFERENCES activity_revisions(activity_revision_id),
        flag_code TEXT NOT NULL,
        PRIMARY KEY(activity_revision_id,flag_code)
      );

CREATE TABLE activity_revisions(activity_revision_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL REFERENCES activities(activity_id),revision_number INTEGER NOT NULL,title_en TEXT NOT NULL,title_zh TEXT,description_en TEXT NOT NULL,description_zh TEXT,activity_type TEXT,subject_id TEXT,department_id TEXT,start_at TEXT,end_at TEXT,owner_user_id TEXT,requested_form_version_id TEXT,media_capture_expected INTEGER,location TEXT,approval_status TEXT NOT NULL,publication_status TEXT NOT NULL,material_change_reason TEXT,supersedes_revision_id TEXT,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL,submitted_at TEXT,approved_by_user_id TEXT,approved_at TEXT, requested_publisher_user_id TEXT,UNIQUE(activity_id,revision_number));

CREATE TABLE ai_candidate_decisions(
        decision_id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL REFERENCES ai_draft_candidates(candidate_id),
        outcome TEXT NOT NULL,
        reason TEXT NOT NULL,
        decided_by_user_id TEXT NOT NULL,
        decided_at TEXT NOT NULL
      );

CREATE TABLE ai_draft_candidates(
        candidate_id TEXT PRIMARY KEY,
        manifest_id TEXT NOT NULL REFERENCES ai_input_manifests(manifest_id),
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        generated_text_en TEXT,
        generated_text_zh TEXT,
        source_refs_json TEXT NOT NULL,
        review_status TEXT NOT NULL,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL
      );

CREATE TABLE ai_input_manifests(
        manifest_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        student_user_id TEXT NOT NULL REFERENCES users(user_id),
        period_from TEXT NOT NULL,
        period_to TEXT NOT NULL,
        controlled_profile TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        status TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

CREATE TABLE ai_manifest_sources(
        manifest_source_id TEXT PRIMARY KEY,
        manifest_id TEXT NOT NULL REFERENCES ai_input_manifests(manifest_id),
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        summary_en TEXT NOT NULL,
        summary_zh TEXT,
        display_order INTEGER NOT NULL
      );

CREATE TABLE approval_assignments(approval_assignment_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,approval_policy_version_id TEXT NOT NULL REFERENCES approval_policy_versions(approval_policy_version_id),approval_policy_step_id TEXT NOT NULL REFERENCES approval_policy_steps(approval_policy_step_id),target_type TEXT NOT NULL,target_id TEXT NOT NULL,target_version_id TEXT,assignee_user_id TEXT,assignee_role_assignment_id TEXT,assigned_by_user_id TEXT,status TEXT NOT NULL,assigned_at TEXT NOT NULL,accepted_at TEXT,due_at TEXT,delegated_from_assignment_id TEXT,delegation_effective_until TEXT);

CREATE TABLE approval_decisions(approval_decision_id TEXT PRIMARY KEY,approval_assignment_id TEXT NOT NULL REFERENCES approval_assignments(approval_assignment_id),school_id TEXT NOT NULL,step_number INTEGER NOT NULL,outcome TEXT NOT NULL,reason TEXT NOT NULL,decided_by_user_id TEXT NOT NULL,used_capability_id TEXT NOT NULL,used_scope_type TEXT NOT NULL,used_scope_id TEXT NOT NULL,decided_at TEXT NOT NULL);

CREATE TABLE approval_escalations(approval_escalation_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,approval_assignment_id TEXT,target_type TEXT NOT NULL,target_id TEXT NOT NULL,target_period_id TEXT,trigger_reason TEXT NOT NULL,queue_key TEXT NOT NULL,status TEXT NOT NULL,triggered_at TEXT NOT NULL,owned_by_user_id TEXT,resolved_at TEXT,resolution_note TEXT);

CREATE TABLE approval_policy_steps(approval_policy_step_id TEXT PRIMARY KEY,approval_policy_version_id TEXT NOT NULL REFERENCES approval_policy_versions(approval_policy_version_id),step_number INTEGER NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,required_capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),assignee_strategy TEXT NOT NULL,required_decision_count INTEGER NOT NULL,reason_required INTEGER NOT NULL,status TEXT NOT NULL);

CREATE TABLE approval_policy_versions(approval_policy_version_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,workflow_type TEXT NOT NULL,policy_version INTEGER NOT NULL,mode TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,allow_self_assignment INTEGER NOT NULL,allow_self_approval INTEGER NOT NULL,publication_separate INTEGER NOT NULL,max_human_steps INTEGER NOT NULL,default_queue_key TEXT,unassigned_escalation_minutes INTEGER,overdue_escalation_minutes INTEGER,status TEXT NOT NULL,effective_from TEXT,effective_until TEXT,configured_by_user_id TEXT,configured_at TEXT);

CREATE TABLE assessment_assignments(
        activity_form_assignment_id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL REFERENCES activities(activity_id),
        form_version_id TEXT NOT NULL REFERENCES form_versions(form_version_id),
        assigned_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        assigned_at TEXT NOT NULL,
        opens_at TEXT,
        due_at TEXT,
        assignment_status TEXT NOT NULL,
        eligibility_check TEXT NOT NULL,
        notes TEXT
      );

CREATE TABLE assessment_submissions(
        assessment_submission_id TEXT PRIMARY KEY,
        assignment_recipient_id TEXT NOT NULL REFERENCES assignment_recipients(assignment_recipient_id),
        revision_number INTEGER NOT NULL,
        supersedes_submission_id TEXT,
        perspective TEXT NOT NULL,
        content_status TEXT NOT NULL,
        processing_status TEXT NOT NULL,
        visibility_status TEXT NOT NULL,
        submitted_at TEXT,
        reviewed_by_user_id TEXT,
        reviewed_at TEXT,
        review_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(assignment_recipient_id,revision_number)
      );

CREATE TABLE assignment_recipients(
    assignment_recipient_id TEXT PRIMARY KEY,
    assessment_assignment_id TEXT NOT NULL REFERENCES assessment_assignments(activity_form_assignment_id),
    respondent_user_id TEXT NOT NULL REFERENCES users(user_id),
    subject_user_id TEXT NOT NULL REFERENCES users(user_id),
    reviewer_user_id TEXT,
    perspective TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    assigned_by_user_id TEXT,
    assigner_role_assignment_id TEXT,
    due_at TEXT,
    moderation_required INTEGER NOT NULL DEFAULT 0,
    notes TEXT
  );

CREATE TABLE audit_events(audit_event_id INTEGER PRIMARY KEY AUTOINCREMENT,school_id TEXT NOT NULL,actor_user_id TEXT NOT NULL,action_code TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,reason TEXT,occurred_at TEXT NOT NULL);

CREATE TABLE capability_definitions(capability_id TEXT PRIMARY KEY,capability_key TEXT NOT NULL UNIQUE,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,resource_type TEXT NOT NULL,sensitive INTEGER NOT NULL,status TEXT NOT NULL);

CREATE TABLE capability_policy_overrides(capability_policy_override_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,target_type TEXT NOT NULL,target_id TEXT NOT NULL,capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),effect TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,effective_from TEXT,effective_until TEXT,reason TEXT NOT NULL,configured_by_user_id TEXT NOT NULL,configured_at TEXT NOT NULL,status TEXT NOT NULL);

CREATE TABLE definition_sources(
        definition_source_id TEXT PRIMARY KEY,
        school_id TEXT REFERENCES schools(school_id),
        source_kind TEXT NOT NULL,
        source_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        version TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        content_sha256 TEXT,
        status TEXT NOT NULL,
        uploaded_by_user_id TEXT,
        uploaded_at TEXT,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT,
        UNIQUE(school_id,source_code,version)
      );

CREATE TABLE department_subjects(department_subject_id TEXT PRIMARY KEY,department_id TEXT NOT NULL,subject_id TEXT NOT NULL,school_id TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT,assigned_by_user_id TEXT,assigned_at TEXT);

CREATE TABLE departments(department_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),department_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,parent_department_id TEXT,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);

CREATE TABLE external_media_references(
    external_media_reference_id TEXT PRIMARY KEY,
    source_system_id TEXT NOT NULL REFERENCES source_systems(source_system_id),
    opaque_reference TEXT NOT NULL,
    student_id TEXT,
    activity_id TEXT,
    proof_item_id TEXT,
    content_type_hint TEXT,
    captured_at TEXT,
    consent_status TEXT NOT NULL,
    last_resolution_status TEXT,
    last_resolved_at TEXT,
    availability_status TEXT NOT NULL,
    notes TEXT
  );

CREATE TABLE feedback(
        feedback_id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL REFERENCES activities(activity_id),
        subject_user_id TEXT NOT NULL REFERENCES users(user_id),
        author_user_id TEXT NOT NULL REFERENCES users(user_id),
        assessment_submission_id TEXT REFERENCES assessment_submissions(assessment_submission_id),
        feedback_type TEXT NOT NULL,
        overall_comment TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        perspective TEXT NOT NULL,
        status TEXT NOT NULL,
        visibility TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

CREATE TABLE form_version_blocks(
        form_version_id TEXT NOT NULL REFERENCES form_versions(form_version_id),
        question_block_version_id TEXT NOT NULL REFERENCES question_block_versions(question_block_version_id),
        display_order INTEGER NOT NULL,
        PRIMARY KEY(form_version_id,question_block_version_id)
      );

CREATE TABLE form_versions(
        form_template_id TEXT NOT NULL,
        form_version_id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        version_number TEXT NOT NULL,
        supersedes_form_version_id TEXT,
        review_status TEXT NOT NULL,
        publication_status TEXT NOT NULL,
        visibility_scope TEXT,
        is_system_default INTEGER NOT NULL,
        respondent_roles TEXT,
        valid_from TEXT,
        valid_until TEXT,
        submitted_for_review_at TEXT,
        approved_by_user_id TEXT,
        approved_at TEXT,
        published_by_user_id TEXT,
        published_at TEXT,
        retired_at TEXT,
        notes TEXT
      );

CREATE TABLE framework_observations(
        framework_observation_id TEXT PRIMARY KEY,
        feedback_id TEXT NOT NULL REFERENCES feedback(feedback_id),
        axis_id TEXT NOT NULL REFERENCES rubric_axes(axis_id),
        observed_step INTEGER,
        consistency_rating INTEGER,
        comment TEXT NOT NULL,
        suggested_next_step INTEGER,
        review_status TEXT NOT NULL,
        human_confirmed INTEGER NOT NULL,
        included_in_aggregation INTEGER NOT NULL,
        inclusion_decided_by_user_id TEXT,
        inclusion_reason TEXT,
        created_at TEXT NOT NULL
      );

CREATE TABLE import_batch_events(
        import_batch_event_id TEXT PRIMARY KEY,
        import_batch_id TEXT NOT NULL REFERENCES import_batches(import_batch_id),
        from_status TEXT,
        to_status TEXT NOT NULL,
        event_code TEXT NOT NULL,
        actor_user_id TEXT,
        reason TEXT,
        details_json TEXT,
        occurred_at TEXT NOT NULL
      );

CREATE TABLE import_batches(
        import_batch_id TEXT PRIMARY KEY,
        external_batch_key TEXT,
        school_id TEXT NOT NULL REFERENCES schools(school_id),
        source_system_id TEXT NOT NULL REFERENCES source_systems(source_system_id),
        import_contract_version_id TEXT NOT NULL REFERENCES import_contract_versions(import_contract_version_id),
        target_entity_type TEXT,
        target_entity_id TEXT,
        source_parent_key TEXT,
        ingress_channel TEXT NOT NULL,
        source_relative_path TEXT,
        original_file_name TEXT,
        content_type TEXT,
        content_sha256 TEXT NOT NULL,
        source_uploaded_at TEXT,
        uploaded_by_user_id TEXT,
        requested_by_user_id TEXT,
        service_actor_id TEXT,
        received_at TEXT NOT NULL,
        parsed_at TEXT,
        validated_at TEXT,
        committed_at TEXT,
        committed_by_user_id TEXT,
        seeded_at TEXT,
        processing_status TEXT NOT NULL,
        declared_processing_status TEXT,
        parser_name TEXT NOT NULL,
        parser_version TEXT NOT NULL,
        total_rows INTEGER NOT NULL DEFAULT 0,
        valid_rows INTEGER NOT NULL DEFAULT 0,
        warning_rows INTEGER NOT NULL DEFAULT 0,
        error_rows INTEGER NOT NULL DEFAULT 0,
        excluded_rows INTEGER NOT NULL DEFAULT 0,
        committed_rows INTEGER NOT NULL DEFAULT 0,
        supersedes_import_batch_id TEXT,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT,
        updated_by_user_id TEXT,
        updated_at TEXT NOT NULL
      );

CREATE TABLE import_contract_versions(
        import_contract_version_id TEXT PRIMARY KEY,
        contract_code TEXT NOT NULL,
        version_number TEXT NOT NULL,
        target_entity_type TEXT NOT NULL,
        accepted_formats_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT,
        UNIQUE(contract_code,version_number)
      );

CREATE TABLE import_record_corrections(
        import_record_correction_id TEXT PRIMARY KEY,
        import_record_id TEXT NOT NULL REFERENCES import_records(import_record_id),
        field_name TEXT NOT NULL,
        before_value TEXT,
        after_value TEXT,
        original_student_id TEXT,
        resolved_student_id TEXT,
        correction_reason TEXT NOT NULL,
        corrected_by_user_id TEXT NOT NULL,
        corrected_at TEXT NOT NULL
      );

CREATE TABLE import_record_decisions(
        import_record_decision_id TEXT PRIMARY KEY,
        import_record_id TEXT NOT NULL REFERENCES import_records(import_record_id),
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        decided_by_user_id TEXT NOT NULL,
        decided_at TEXT NOT NULL
      );

CREATE TABLE import_record_links(
        import_record_link_id TEXT PRIMARY KEY,
        import_record_id TEXT NOT NULL REFERENCES import_records(import_record_id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_version_id TEXT,
        commit_action TEXT NOT NULL,
        reconciliation_status TEXT NOT NULL,
        committed_by_user_id TEXT,
        committed_at TEXT,
        notes TEXT
      );

CREATE TABLE import_records(
        import_record_id TEXT PRIMARY KEY,
        import_batch_id TEXT NOT NULL REFERENCES import_batches(import_batch_id),
        row_number INTEGER NOT NULL,
        source_record_key TEXT NOT NULL,
        original_payload_json TEXT NOT NULL,
        normalized_payload_json TEXT NOT NULL,
        payload_sha256 TEXT NOT NULL,
        identity_status TEXT NOT NULL,
        validation_status TEXT NOT NULL,
        validation_errors_json TEXT NOT NULL,
        validation_warnings_json TEXT NOT NULL,
        resolved_user_id TEXT,
        current_decision TEXT NOT NULL,
        current_status TEXT NOT NULL,
        supersedes_import_record_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(import_batch_id,row_number),
        UNIQUE(import_batch_id,source_record_key)
      );

CREATE TABLE learner_narrative_versions(learner_narrative_version_id TEXT PRIMARY KEY,portfolio_working_version_id TEXT NOT NULL REFERENCES portfolio_working_versions(portfolio_working_version_id),narrative_kind TEXT NOT NULL,revision_number INTEGER NOT NULL,generated_text TEXT,teacher_edited_text TEXT,final_approved_text TEXT,prompt_version TEXT,source_manifest_id TEXT,edited_by_user_id TEXT,edit_reason TEXT,approval_status TEXT NOT NULL,approved_by_user_id TEXT,created_at TEXT NOT NULL,approved_at TEXT);

CREATE TABLE media_assets(
    media_asset_id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(school_id),
    owner_user_id TEXT,
    uploaded_by_user_id TEXT NOT NULL REFERENCES users(user_id),
    uploaded_at TEXT NOT NULL,
    title TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    media_type TEXT NOT NULL,
    mime_type TEXT,
    source_system_id TEXT REFERENCES source_systems(source_system_id),
    external_media_reference_id TEXT REFERENCES external_media_references(external_media_reference_id),
    storage_reference TEXT,
    checksum_sha256 TEXT,
    consent_status TEXT NOT NULL,
    visibility TEXT NOT NULL,
    moderation_status TEXT NOT NULL,
    processing_status TEXT NOT NULL,
    captured_at TEXT,
    retention_review_date TEXT,
    operational_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_by_user_id TEXT,
    updated_at TEXT,
    disabled_reason TEXT,
    disabled_by_user_id TEXT,
    disabled_at TEXT
  );

CREATE TABLE media_extractions(
        media_extraction_id TEXT PRIMARY KEY,
        media_asset_id TEXT NOT NULL REFERENCES media_assets(media_asset_id),
        extraction_type TEXT NOT NULL,
        provider_key TEXT NOT NULL,
        provider_version TEXT,
        processing_status TEXT NOT NULL,
        requested_by_user_id TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        started_at TEXT,
        processed_finished_at TEXT,
        content_text TEXT,
        content_json TEXT,
        confidence REAL,
        review_status TEXT NOT NULL,
        reviewed_by_user_id TEXT,
        reviewed_at TEXT,
        review_reason TEXT,
        corrected_content_text TEXT,
        supersedes_media_extraction_id TEXT,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT
      );

CREATE TABLE portfolio_templates(
        portfolio_template_id TEXT PRIMARY KEY,
        owner_scope_type TEXT NOT NULL CHECK(owner_scope_type IN ('system','school')),
        school_id TEXT REFERENCES schools(school_id),
        template_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        description_en TEXT,
        description_zh TEXT,
        status TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        created_at TEXT NOT NULL,
        UNIQUE(school_id,template_code)
      );

CREATE TABLE portfolio_template_versions(
        portfolio_template_version_id TEXT PRIMARY KEY,
        portfolio_template_id TEXT NOT NULL REFERENCES portfolio_templates(portfolio_template_id),
        version_number INTEGER NOT NULL,
        lifecycle_status TEXT NOT NULL,
        manifest_sha256 TEXT NOT NULL,
        supersedes_template_version_id TEXT REFERENCES portfolio_template_versions(portfolio_template_version_id),
        created_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        created_at TEXT NOT NULL,
        published_by_user_id TEXT REFERENCES users(user_id),
        published_at TEXT,
        UNIQUE(portfolio_template_id,version_number)
      );

CREATE TABLE portfolio_template_sections(
        portfolio_template_section_id TEXT PRIMARY KEY,
        portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),
        section_key TEXT NOT NULL,
        title_en TEXT NOT NULL,
        title_zh TEXT NOT NULL,
        content_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        parent_section_id TEXT REFERENCES portfolio_template_sections(portfolio_template_section_id),
        layout_region TEXT NOT NULL,
        visual_variant TEXT NOT NULL,
        presentation_mode TEXT NOT NULL CHECK(presentation_mode IN ('inline','disclosure','link_button')),
        default_expanded INTEGER NOT NULL,
        visible INTEGER NOT NULL,
        status TEXT NOT NULL,
        UNIQUE(portfolio_template_version_id,section_key)
      );

CREATE TABLE school_portfolio_template_assignments(
        school_portfolio_template_assignment_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(school_id),
        portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),
        scope_type TEXT NOT NULL CHECK(scope_type IN ('school','grade','programme')),
        scope_id TEXT NOT NULL,
        effective_from TEXT NOT NULL,
        effective_until TEXT,
        status TEXT NOT NULL,
        assigned_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        assigned_at TEXT NOT NULL,
        reason TEXT NOT NULL
      );

CREATE TABLE portfolio_snapshots(portfolio_snapshot_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL,period_id TEXT NOT NULL,approved_portfolio_working_version_id TEXT NOT NULL,version_number INTEGER NOT NULL,publication_status TEXT NOT NULL,approved_by_user_id TEXT NOT NULL,published_at TEXT NOT NULL, rubric_catalogue_id TEXT REFERENCES rubric_catalogues(rubric_catalogue_id),portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),template_manifest_sha256 TEXT NOT NULL);

CREATE TABLE portfolio_version_items(portfolio_version_item_id TEXT PRIMARY KEY,portfolio_working_version_id TEXT NOT NULL REFERENCES portfolio_working_versions(portfolio_working_version_id),section_key TEXT NOT NULL,source_type TEXT NOT NULL,source_id TEXT,student_selected INTEGER NOT NULL,class_teacher_decision TEXT NOT NULL,display_order INTEGER NOT NULL,authorship_origin TEXT NOT NULL,student_text TEXT,decision_reason TEXT,decided_by_user_id TEXT,decided_at TEXT);

CREATE TABLE portfolio_working_versions(portfolio_working_version_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_user_id TEXT NOT NULL REFERENCES users(user_id),period_id TEXT NOT NULL,version_number INTEGER NOT NULL,supersedes_version_id TEXT,status TEXT NOT NULL,created_by_user_id TEXT NOT NULL,created_at TEXT NOT NULL,student_submitted_at TEXT,class_teacher_user_id TEXT,class_teacher_reviewed_at TEXT,approved_by_user_id TEXT,approved_at TEXT,published_snapshot_id TEXT,is_student_latest INTEGER NOT NULL, rubric_catalogue_id TEXT REFERENCES rubric_catalogues(rubric_catalogue_id),portfolio_template_version_id TEXT NOT NULL REFERENCES portfolio_template_versions(portfolio_template_version_id),template_manifest_sha256 TEXT NOT NULL,UNIQUE(student_user_id,period_id,version_number));

CREATE TABLE proof_items(
        proof_item_id TEXT PRIMARY KEY,
        proof_type_id TEXT NOT NULL,
        student_id TEXT NOT NULL REFERENCES users(user_id),
        activity_id TEXT,
        source_entity_type TEXT NOT NULL,
        source_entity_id TEXT NOT NULL,
        perspective TEXT NOT NULL,
        summary TEXT NOT NULL,
        occurred_at TEXT,
        submitted_by_user_id TEXT NOT NULL,
        provenance_status TEXT NOT NULL,
        review_status TEXT NOT NULL,
        visibility_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        disabled_at TEXT
      );

CREATE TABLE proof_links(
    proof_link_id TEXT PRIMARY KEY,
    proof_item_id TEXT NOT NULL REFERENCES proof_items(proof_item_id),
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    support_role TEXT NOT NULL,
    linked_by_user_id TEXT NOT NULL,
    linked_at TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT
  );

CREATE TABLE proud_moment_selections(
        selection_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES users(user_id),
        academic_year TEXT NOT NULL,
        period_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        proof_item_id TEXT,
        selection_reason TEXT NOT NULL,
        selected_label_codes TEXT,
        submission_status TEXT NOT NULL,
        publication_status TEXT NOT NULL,
        reviewer_user_id TEXT,
        reviewed_at TEXT,
        include_in_portfolio INTEGER NOT NULL,
        internal_review_note TEXT,
        UNIQUE(student_id,period_id,source_type,source_id)
      );

CREATE TABLE proud_moment_windows(
        period_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        status TEXT NOT NULL,
        opens_at TEXT NOT NULL,
        closes_at TEXT NOT NULL,
        max_selections INTEGER NOT NULL,
        configured_by_user_id TEXT NOT NULL
      );

CREATE TABLE published_rubric_results(
        published_rubric_result_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES users(user_id),
        rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
        rubric_version TEXT NOT NULL,
        axis_id TEXT NOT NULL REFERENCES rubric_axes(axis_id),
        period_id TEXT NOT NULL,
        aggregation_policy_id TEXT,
        published_level_id TEXT REFERENCES rubric_levels(level_id),
        published_numeric_value INTEGER,
        contributing_observation_ids TEXT,
        calculation_trace TEXT,
        published_by_user_id TEXT,
        published_at TEXT,
        status TEXT NOT NULL
      );

CREATE TABLE question_bank_versions(
        question_bank_version_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(school_id),
        definition_source_id TEXT NOT NULL REFERENCES definition_sources(definition_source_id),
        bank_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        activated_by_user_id TEXT,
        activated_at TEXT,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT,
        UNIQUE(school_id,bank_code,version_number)
      );

CREATE TABLE question_block_items(
    question_block_item_id TEXT PRIMARY KEY,
    question_block_version_id TEXT NOT NULL REFERENCES question_block_versions(question_block_version_id),
    display_order INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    source_question_block_item_id TEXT REFERENCES question_block_items(question_block_item_id),
    question_id TEXT REFERENCES question_definitions(question_id),
    question_version_id TEXT REFERENCES question_versions(question_version_id),
    required INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    prompt_en TEXT NOT NULL,
    prompt_zh TEXT NOT NULL,
    respondent_role_code TEXT NOT NULL,
    answer_scale TEXT,
    ability_code TEXT,
    ability_name_en TEXT,
    ability_name_zh TEXT,
    proof_intent TEXT,
    UNIQUE(question_block_version_id,display_order),
    UNIQUE(question_block_version_id,item_key)
  );

CREATE TABLE question_block_versions(
        question_block_version_id TEXT PRIMARY KEY,
        question_block_id TEXT NOT NULL REFERENCES question_blocks(question_block_id),
        version_number INTEGER NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        respondent_role_code TEXT NOT NULL,
        ability_code TEXT,
        ability_name_en TEXT,
        ability_name_zh TEXT,
        review_status TEXT NOT NULL,
        publication_status TEXT NOT NULL,
        supersedes_question_block_version_id TEXT,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        submitted_at TEXT,
        approved_by_user_id TEXT,
        approved_at TEXT,
        published_by_user_id TEXT,
        published_at TEXT,
        UNIQUE(question_block_id,version_number)
      );

CREATE TABLE question_blocks(
        question_block_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(school_id),
        block_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        latest_version_id TEXT,
        current_published_version_id TEXT,
        operational_status TEXT NOT NULL,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        updated_by_user_id TEXT,
        updated_at TEXT,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT,
        UNIQUE(school_id,block_code)
      );

CREATE TABLE question_definitions(
        question_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(school_id),
        stable_code TEXT NOT NULL,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        operational_status TEXT NOT NULL,
        UNIQUE(school_id,stable_code)
      );

CREATE TABLE question_responses(
        question_response_id TEXT PRIMARY KEY,
        assessment_submission_id TEXT NOT NULL REFERENCES assessment_submissions(assessment_submission_id),
        item_key TEXT NOT NULL,
        prompt_en TEXT NOT NULL,
        prompt_zh TEXT NOT NULL,
        text_value TEXT,
        raw_numeric_value REAL,
        authorship_origin TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(assessment_submission_id,item_key)
      );

CREATE TABLE question_versions(
        question_version_id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES question_definitions(question_id),
        question_bank_version_id TEXT NOT NULL REFERENCES question_bank_versions(question_bank_version_id),
        version_number INTEGER NOT NULL,
        source_sheet TEXT,
        source_row INTEGER,
        source_construct_en TEXT,
        source_construct_zh TEXT,
        subdomain TEXT,
        prompt_en TEXT,
        prompt_zh TEXT NOT NULL,
        response_type TEXT NOT NULL,
        scale_type TEXT,
        scale_options_json TEXT,
        is_negative INTEGER NOT NULL DEFAULT 0,
        ability_code TEXT,
        ability_name_en TEXT,
        ability_name_zh TEXT,
        ability_description_en TEXT,
        ability_description_zh TEXT,
        approval_status TEXT NOT NULL,
        status TEXT NOT NULL,
        supersedes_question_version_id TEXT,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        disabled_reason TEXT,
        disabled_by_user_id TEXT,
        disabled_at TEXT,
        UNIQUE(question_id,version_number)
      );

CREATE TABLE role_capabilities(role_capability_id TEXT PRIMARY KEY,role_id TEXT NOT NULL REFERENCES role_definitions(role_id),capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),effect TEXT NOT NULL,condition_key TEXT,status TEXT NOT NULL,configured_by_user_id TEXT,configured_at TEXT);

CREATE TABLE role_definitions(role_id TEXT PRIMARY KEY,role_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,role_category TEXT NOT NULL,assignable INTEGER NOT NULL,description_en TEXT,description_zh TEXT,status TEXT NOT NULL);

CREATE TABLE role_definition_versions(
        role_definition_version_id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL REFERENCES role_definitions(role_id),
        version_number INTEGER NOT NULL,
        lifecycle_status TEXT NOT NULL,
        effective_from TEXT NOT NULL,
        effective_until TEXT,
        supersedes_role_definition_version_id TEXT REFERENCES role_definition_versions(role_definition_version_id),
        created_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        created_at TEXT NOT NULL,
        activated_by_user_id TEXT REFERENCES users(user_id),
        activated_at TEXT,
        UNIQUE(role_id,version_number)
      );

CREATE TABLE role_version_capabilities(
        role_version_capability_id TEXT PRIMARY KEY,
        role_definition_version_id TEXT NOT NULL REFERENCES role_definition_versions(role_definition_version_id),
        capability_id TEXT NOT NULL REFERENCES capability_definitions(capability_id),
        effect TEXT NOT NULL CHECK(effect IN ('allow','deny')),
        condition_key TEXT,
        status TEXT NOT NULL,
        configured_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        configured_at TEXT NOT NULL,
        UNIQUE(role_definition_version_id,capability_id,effect,condition_key)
      );

CREATE TABLE rubric_axes(
        axis_id TEXT PRIMARY KEY,
        rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
        axis_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        axis_kind TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        status TEXT NOT NULL,
        notes TEXT
      , rubric_group_id TEXT);

CREATE TABLE rubric_catalogues(
        rubric_catalogue_id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        version TEXT NOT NULL,
        labelling_capable INTEGER NOT NULL,
        assessment_capable INTEGER NOT NULL,
        radar_eligible INTEGER NOT NULL,
        level_order_type TEXT,
        definition_completeness TEXT,
        source_reference TEXT,
        status TEXT NOT NULL,
        notes TEXT
      , selection_mode TEXT NOT NULL DEFAULT 'definition_only', score_out_of REAL, supersedes_rubric_catalogue_id TEXT, activated_by_user_id TEXT, activated_at TEXT, disabled_reason TEXT, disabled_by_user_id TEXT, disabled_at TEXT, definition_source_id TEXT REFERENCES definition_sources(definition_source_id));

CREATE TABLE rubric_groups(
        rubric_group_id TEXT PRIMARY KEY,
        rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
        group_code TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        status TEXT NOT NULL,
        disabled INTEGER NOT NULL DEFAULT 0
      );

CREATE TABLE rubric_levels(
        level_id TEXT PRIMARY KEY,
        rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
        level_code TEXT NOT NULL,
        level_order INTEGER NOT NULL,
        numeric_value INTEGER NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        is_prerequisite_chain INTEGER NOT NULL,
        status TEXT NOT NULL
      );

CREATE TABLE school_rubric_assignments(
        school_rubric_assignment_id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(school_id),
        purpose TEXT NOT NULL CHECK(purpose IN ('activity_labelling','assessment_rubric')),
        rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
        scope_type TEXT NOT NULL CHECK(scope_type IN ('school','grade','programme')),
        scope_id TEXT NOT NULL,
        effective_from TEXT NOT NULL,
        effective_until TEXT,
        status TEXT NOT NULL,
        assigned_by_user_id TEXT NOT NULL REFERENCES users(user_id),
        assigned_at TEXT NOT NULL,
        reason TEXT NOT NULL
      );

CREATE TABLE rubric_step_definitions(
        step_definition_id TEXT PRIMARY KEY,
        rubric_catalogue_id TEXT NOT NULL REFERENCES rubric_catalogues(rubric_catalogue_id),
        rubric_group_id TEXT NOT NULL REFERENCES rubric_groups(rubric_group_id),
        axis_id TEXT NOT NULL REFERENCES rubric_axes(axis_id),
        level_id TEXT NOT NULL REFERENCES rubric_levels(level_id),
        step_number INTEGER NOT NULL,
        step_name_en TEXT,
        step_name_zh TEXT NOT NULL,
        definition_en TEXT,
        definition_zh TEXT NOT NULL,
        score_min REAL,
        score_max REAL,
        score_out_of REAL,
        source_reference TEXT NOT NULL,
        status TEXT NOT NULL,
        disabled INTEGER NOT NULL DEFAULT 0,
        UNIQUE(rubric_catalogue_id,axis_id,step_number)
      );

CREATE TABLE schools(school_id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,status TEXT NOT NULL);

CREATE TABLE source_systems(
    source_system_id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(school_id),
    source_code TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_zh TEXT NOT NULL,
    source_purpose TEXT NOT NULL DEFAULT 'data_import',
    connector_type TEXT NOT NULL,
    endpoint_env_key TEXT,
    authentication_profile_ref TEXT,
    resolution_mode TEXT,
    allowed_reference_pattern TEXT,
    returns_metadata INTEGER NOT NULL DEFAULT 0,
    returns_short_lived_url INTEGER NOT NULL DEFAULT 0,
    returns_streamed_bytes INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL,
    import_status TEXT,
    media_status TEXT,
    disabled_reason TEXT,
    disabled_by_user_id TEXT,
    disabled_at TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_by_user_id TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(school_id,source_code)
  );

CREATE TABLE staff_group_memberships(staff_group_membership_id TEXT PRIMARY KEY,staff_group_id TEXT NOT NULL REFERENCES staff_groups(staff_group_id),user_id TEXT NOT NULL REFERENCES users(user_id),membership_role TEXT,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,assigned_by_user_id TEXT,assigned_at TEXT);

CREATE TABLE staff_groups(staff_group_id TEXT PRIMARY KEY,school_id TEXT NOT NULL,group_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,group_purpose TEXT,department_id TEXT,subject_id TEXT,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);

CREATE TABLE staff_position_definitions(position_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),position_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,position_category TEXT,sort_order INTEGER,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);

CREATE TABLE student_class_memberships(student_class_membership_id TEXT PRIMARY KEY,student_user_id TEXT NOT NULL REFERENCES users(user_id),school_id TEXT NOT NULL,class_id TEXT NOT NULL,period_id TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL);

CREATE TABLE subjects(subject_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),subject_code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,created_by_user_id TEXT,created_at TEXT);

CREATE TABLE user_position_assignments(user_position_assignment_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(user_id),position_id TEXT NOT NULL REFERENCES staff_position_definitions(position_id),school_id TEXT NOT NULL,department_id TEXT,subject_id TEXT,effective_from TEXT,effective_until TEXT,is_primary INTEGER,status TEXT NOT NULL,assigned_by_user_id TEXT,assigned_at TEXT);

CREATE TABLE user_role_assignments(user_role_assignment_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(user_id),role_id TEXT NOT NULL REFERENCES role_definitions(role_id),role_definition_version_id TEXT NOT NULL REFERENCES role_definition_versions(role_definition_version_id),school_id TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,effective_from TEXT,effective_until TEXT,status TEXT NOT NULL,assigned_by_user_id TEXT,assigned_at TEXT,ended_reason TEXT);

CREATE TABLE users(user_id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(school_id),external_user_id TEXT,user_type TEXT NOT NULL,student_number TEXT,staff_number TEXT,name_en TEXT NOT NULL,name_zh TEXT,email TEXT,status TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE activity_source_bindings(
  activity_source_binding_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(school_id),
  activity_id TEXT NOT NULL REFERENCES activities(activity_id),
  source_system_id TEXT NOT NULL REFERENCES source_systems(source_system_id),
  base_reference TEXT NOT NULL,
  validation_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  disabled_reason TEXT,
  disabled_by_user_id TEXT,
  disabled_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by_user_id TEXT,
  updated_at TEXT,
  UNIQUE(activity_id,source_system_id,base_reference)
);

CREATE TABLE entity_lifecycle_events(
  entity_lifecycle_event_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(school_id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(user_id),
  source_entity_type TEXT,
  source_entity_id TEXT,
  occurred_at TEXT NOT NULL
);

CREATE INDEX idx_activity_dependency_impacts ON activity_dependency_impacts(activity_id,impact_status,dependency_type);

CREATE INDEX idx_activity_media_activity ON activity_media(activity_id,status,media_asset_id);

CREATE INDEX idx_activity_people_user ON activity_people(user_id,activity_id);

CREATE INDEX idx_ai_candidate_manifest ON ai_draft_candidates(manifest_id,created_at);

CREATE INDEX idx_ai_manifest_student ON ai_input_manifests(student_user_id,period_from,period_to);

CREATE INDEX idx_approval_assignee ON approval_assignments(assignee_user_id,status);

CREATE INDEX idx_definition_sources_school ON definition_sources(school_id,source_kind,status);

CREATE INDEX idx_feedback_subject ON feedback(subject_user_id,activity_id);

CREATE INDEX idx_import_batches_scope ON import_batches(school_id,target_entity_id,processing_status,received_at);

CREATE INDEX idx_import_events_batch ON import_batch_events(import_batch_id,occurred_at);

CREATE INDEX idx_import_links_entity ON import_record_links(entity_type,entity_id,reconciliation_status);

CREATE INDEX idx_import_records_batch ON import_records(import_batch_id,current_status,row_number);

CREATE INDEX idx_media_extractions_asset ON media_extractions(media_asset_id,requested_at,processing_status);

CREATE INDEX idx_overrides_target ON capability_policy_overrides(target_type,target_id,capability_id,status);

CREATE INDEX idx_period_range ON academic_periods(school_id,start_date,end_date,status);

CREATE INDEX idx_portfolio_rubric ON portfolio_working_versions(rubric_catalogue_id,student_user_id,period_id);

CREATE INDEX idx_portfolio_student ON portfolio_working_versions(student_user_id,period_id,version_number DESC);

CREATE INDEX idx_portfolio_template_assignment ON school_portfolio_template_assignments(school_id,status,effective_from,effective_until,scope_type,scope_id);

CREATE INDEX idx_portfolio_template_sections ON portfolio_template_sections(portfolio_template_version_id,parent_section_id,display_order);

CREATE INDEX idx_proud_student ON proud_moment_selections(student_id,period_id);

CREATE INDEX idx_published_result_student ON published_rubric_results(student_id,period_id,status);

CREATE INDEX idx_question_block_versions_state ON question_block_versions(review_status,publication_status,respondent_role_code);

CREATE INDEX idx_question_blocks_school ON question_blocks(school_id,operational_status,block_code);

CREATE INDEX idx_question_versions_search ON question_versions(question_bank_version_id,status,source_construct_en,ability_code);

CREATE INDEX idx_rubric_groups_catalogue ON rubric_groups(rubric_catalogue_id,display_order);

CREATE INDEX idx_rubric_steps_axis ON rubric_step_definitions(rubric_catalogue_id,axis_id,step_number);

CREATE INDEX idx_school_rubric_assignment ON school_rubric_assignments(school_id,purpose,status,effective_from,effective_until,scope_type,scope_id);

CREATE INDEX idx_submissions_recipient ON assessment_submissions(assignment_recipient_id,revision_number DESC);

CREATE INDEX idx_user_roles_user ON user_role_assignments(user_id,status);

CREATE INDEX idx_role_version_capabilities ON role_version_capabilities(role_definition_version_id,status,capability_id);

CREATE INDEX idx_recipients_respondent ON assignment_recipients(respondent_user_id,status);

CREATE INDEX idx_assignment_recipients_subject ON assignment_recipients(subject_user_id,perspective,status);

CREATE INDEX idx_activity_labels_revision ON activity_label_assignments(activity_revision_id,status,axis_id);

CREATE INDEX idx_media_assets_school ON media_assets(school_id,operational_status,media_type);

CREATE INDEX idx_activity_source_bindings ON activity_source_bindings(school_id,activity_id,status);

CREATE INDEX idx_entity_lifecycle_target ON entity_lifecycle_events(entity_type,entity_id,occurred_at);
PRAGMA user_version=1;
`;


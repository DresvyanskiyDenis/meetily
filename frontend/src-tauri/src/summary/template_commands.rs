use crate::summary::templates;
use serde::{Deserialize, Serialize};
use tauri::Runtime;
use tracing::{info, warn};

/// Template metadata for UI display
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateInfo {
    /// Template identifier (e.g., "daily_standup", "standard_meeting")
    pub id: String,

    /// Display name for the template
    pub name: String,

    /// Brief description of the template's purpose
    pub description: String,

    /// Whether this template is a custom (user-created) template
    pub is_custom: bool,
}

/// Detailed template structure for preview/debugging
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateDetails {
    /// Template identifier
    pub id: String,

    /// Display name
    pub name: String,

    /// Description
    pub description: String,

    /// List of section titles in order
    pub sections: Vec<String>,
}

/// Lists all available templates
///
/// Returns templates from both built-in (embedded) and custom (user data directory) sources.
/// Templates are automatically discovered - no code changes needed to add new templates.
///
/// # Returns
/// Vector of TemplateInfo with id, name, and description for each template
#[tauri::command]
pub async fn api_list_templates<R: Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<TemplateInfo>, String> {
    info!("api_list_templates called");

    let templates_list = templates::list_templates();

    let template_infos: Vec<TemplateInfo> = templates_list
        .into_iter()
        .map(|(id, name, description)| {
            let is_custom = templates::is_custom_template(&id);
            TemplateInfo {
                id,
                name,
                description,
                is_custom,
            }
        })
        .collect();

    info!("Found {} available templates", template_infos.len());

    Ok(template_infos)
}

/// Gets detailed information about a specific template
///
/// # Arguments
/// * `template_id` - Template identifier (e.g., "daily_standup")
///
/// # Returns
/// TemplateDetails with full template structure
#[tauri::command]
pub async fn api_get_template_details<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<TemplateDetails, String> {
    info!("api_get_template_details called for template_id: {}", template_id);

    let template = templates::get_template(&template_id)?;

    let section_titles: Vec<String> = template
        .sections
        .iter()
        .map(|section| section.title.clone())
        .collect();

    let details = TemplateDetails {
        id: template_id,
        name: template.name,
        description: template.description,
        sections: section_titles,
    };

    info!("Retrieved template details for '{}'", details.name);

    Ok(details)
}

/// Validates a custom template JSON string
///
/// Useful for template editor UI or validation before saving custom templates
///
/// # Arguments
/// * `template_json` - Raw JSON string of the template
///
/// # Returns
/// Ok(template_name) if valid, Err(error_message) if invalid
#[tauri::command]
pub async fn api_validate_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_json: String,
) -> Result<String, String> {
    info!("api_validate_template called");

    match templates::validate_and_parse_template(&template_json) {
        Ok(template) => {
            info!("Template '{}' validated successfully", template.name);
            Ok(template.name)
        }
        Err(e) => {
            warn!("Template validation failed: {}", e);
            Err(e)
        }
    }
}

/// Full template detail with section data (for template editor)
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateFullDetails {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_custom: bool,
    pub sections: Vec<TemplateSectionDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateSectionDetail {
    pub title: String,
    pub instruction: String,
    pub format: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_format: Option<String>,
}

/// Gets full template data including section instructions (for editor)
#[tauri::command]
pub async fn api_get_template_full<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<TemplateFullDetails, String> {
    info!("api_get_template_full called for template_id: {}", template_id);

    let template = templates::get_template(&template_id)?;
    let is_custom = templates::is_custom_template(&template_id);

    let details = TemplateFullDetails {
        id: template_id.clone(),
        name: template.name,
        description: template.description,
        is_custom,
        sections: template
            .sections
            .into_iter()
            .map(|s| TemplateSectionDetail {
                title: s.title,
                instruction: s.instruction,
                format: s.format,
                item_format: s.item_format,
            })
            .collect(),
    };

    info!("Retrieved full template details for '{}'", details.name);
    Ok(details)
}

/// Saves a custom template to the user's templates directory
#[tauri::command]
pub async fn api_save_custom_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
    template_json: String,
) -> Result<String, String> {
    info!("api_save_custom_template called for template_id: {}", template_id);

    let template = templates::validate_and_parse_template(&template_json)?;
    templates::save_custom_template(&template_id, &template)?;

    info!("Custom template '{}' saved successfully", template.name);
    Ok(template.name)
}

/// Deletes a custom template from the user's templates directory
#[tauri::command]
pub async fn api_delete_custom_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<(), String> {
    info!("api_delete_custom_template called for template_id: {}", template_id);
    templates::delete_custom_template(&template_id)
}

/// Checks if a template is a custom (user-editable) template
#[tauri::command]
pub async fn api_is_custom_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<bool, String> {
    Ok(templates::is_custom_template(&template_id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_list_templates() {
        // This test requires the templates to be embedded/available
        // In a real test environment, you might want to mock the templates module

        // For now, just verify the function compiles and runs
        // You can expand this with more specific assertions
    }

    #[tokio::test]
    async fn test_validate_template_valid() {
        let valid_json = r#"
        {
            "name": "Test Template",
            "description": "A test template",
            "sections": [
                {
                    "title": "Summary",
                    "instruction": "Provide a summary",
                    "format": "paragraph"
                }
            ]
        }"#;

        // Mock app handle would be needed for actual testing
        // For now, test the validation logic directly
        let result = templates::validate_and_parse_template(valid_json);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_validate_template_invalid() {
        let invalid_json = "invalid json";

        let result = templates::validate_and_parse_template(invalid_json);
        assert!(result.is_err());
    }
}

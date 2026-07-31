/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::models::scatter::{ScatterFile, ScatterPartition};
use crate::services::scatter_parser::ScatterParser;
use mtk_scatter_parser::{
    load_scatter_manifest, build_preview_plan, FlashPlanOptions, Mode, StorageSelect,
};
use std::collections::HashMap;
use std::path::Path;

#[tauri::command]
pub async fn parse_scatter_file(file_path: String) -> Result<ScatterFile, AppError> {
    ScatterParser::parse(&file_path)
}

#[allow(unused_variables)]
#[tauri::command]
pub async fn detect_image_files(
    scatter_path: String,
    partitions: Vec<ScatterPartition>,
) -> Result<HashMap<String, String>, AppError> {
    let scatter = load_scatter_manifest(&scatter_path)
        .map_err(|e| AppError::Parse(format!("Failed to parse scatter: {e}")))?;

    let firmware_dir = Path::new(&scatter_path).parent().map(Path::to_path_buf);
    let package_root = firmware_dir
        .as_ref()
        .and_then(|p| p.parent().map(Path::to_path_buf))
        .or_else(|| firmware_dir.clone());

    let plan = build_preview_plan(
        &scatter,
        FlashPlanOptions {
            mode: Mode::DryRun,
            storage: StorageSelect::Auto,
            slot_policy: mtk_scatter_parser::SlotPolicy::Auto,
            parts: Vec::new(),
            groups: Vec::new(),
            firmware_dir,
            package_root,
            check_images: true,
            image_search: false,
            include_preloader: false,
            allow_incomplete_slots: false,
        },
    );

    let mut image_map: HashMap<String, String> = plan
        .actions
        .iter()
        .filter_map(|action| {
            action
                .image_resolved_path()
                .map(|path| (action.partition.clone(), path.to_string()))
        })
        .collect();

    // Synthesize _b image entries for any _a lacking a _b counterpart.
    // The crate's slot synthesis only creates _b actions when _b exists
    // in the scatter file, so we handle the common case where only _a is defined.
    for name in image_map.keys().cloned().collect::<Vec<_>>() {
        if let Some(base) = name.strip_suffix("_a") {
            let b_name = format!("{}_b", base);
            if !image_map.contains_key(&b_name) {
                if let Some(image) = image_map.get(&name).cloned() {
                    image_map.insert(b_name, image);
                }
            }
        }
    }

    Ok(image_map)
}

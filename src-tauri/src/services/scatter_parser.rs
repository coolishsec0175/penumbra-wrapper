/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::models::scatter::{ScatterFile, ScatterPartition};
use std::collections::HashSet;

pub struct ScatterParser;

impl ScatterParser {
    /// Parse scatter file using the mtk-scatter-parser library.
    /// Auto-detects XML vs YAML format internally.
    /// Synthesizes _b slot partitions for any _a that lacks a _b counterpart.
    pub fn parse(file_path: &str) -> Result<ScatterFile, AppError> {
        let scatter = mtk_scatter_parser::parse_scatter(file_path)
            .map_err(|e| AppError::Parse(format!("Failed to parse scatter file: {e}")))?;

        let storage_type = scatter
            .layouts
            .keys()
            .find(|k| k.to_uppercase() == "UFS")
            .or_else(|| scatter.layouts.keys().find(|k| k.to_uppercase() == "EMMC"))
            .or_else(|| scatter.layouts.keys().next())
            .cloned()
            .unwrap_or_default();

        let selected = scatter.selected_layouts(mtk_scatter_parser::StorageSelect::Auto);
        let mut partitions: Vec<ScatterPartition> = selected.into_values().flatten()
            .into_iter()
            .map(|p| ScatterPartition {
                index: p.index.unwrap_or_default(),
                partition_name: p.name,
                file_name: p.file_name,
                is_download: p.is_download,
                partition_type: p.image_type.unwrap_or_default(),
                linear_start_addr: format!("{:#x}", p.linear_start),
                physical_start_addr: format!("{:#x}", p.physical_start),
                partition_size: format!("{:#x}", p.size),
                region: p.region,
                storage: p.storage.unwrap_or_default(),
                operation_type: p.operation_type.unwrap_or_default(),
            })
            .collect();

        // Synthesize _b slot partitions for any _a that lacks a _b counterpart.
        // This allows flashing both slots even when the scatter only defines _a.
        let names: HashSet<&str> = partitions.iter().map(|p| p.partition_name.as_str()).collect();
        let mut extra = Vec::new();

        for p in &partitions {
            if let Some(base) = p.partition_name.strip_suffix("_a") {
                let b_name = format!("{}_b", base);
                if !names.contains(b_name.as_str()) {
                    extra.push(ScatterPartition {
                        partition_name: b_name,
                        is_download: true,
                        ..p.clone()
                    });
                }
            }
        }

        partitions.extend(extra);

        // Force is_download on existing _b partitions that have a _a counterpart
        // AND have an associated image file (either directly or via _a).
        // Pre-build a lookup of which _a partitions have file_name to avoid
        // borrowing conflicts in the mutation loop below.
        let a_has_file: HashSet<String> = partitions.iter()
            .filter_map(|p| p.partition_name.strip_suffix("_a").filter(|_| p.file_name.is_some()).map(String::from))
            .collect();
        let existing_names: HashSet<String> = partitions.iter().map(|p| p.partition_name.clone()).collect();
        let mut enable: Vec<usize> = Vec::new();
        for (i, p) in partitions.iter().enumerate() {
            if !p.is_download {
                if let Some(base) = p.partition_name.strip_suffix("_b") {
                    let a_name = format!("{}_a", base);
                    if existing_names.contains(&a_name) && (p.file_name.is_some() || a_has_file.contains(base)) {
                        enable.push(i);
                    }
                }
            }
        }
        for i in enable {
            partitions[i].is_download = true;
        }

        Ok(ScatterFile {
            platform: scatter.platform.unwrap_or_default(),
            project: scatter.project.unwrap_or_default(),
            storage_type,
            partitions,
            file_path: file_path.to_string(),
        })
    }
}

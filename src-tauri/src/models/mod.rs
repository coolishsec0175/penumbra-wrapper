/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

pub mod scatter;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Partition {
    pub name: String,
    pub start: String,
    pub size: String, // Hex value (e.g., "0x80000")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_size: Option<String>, // Human readable (e.g., "512 KiB")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionListResult {
    pub partitions: Vec<Partition>,
    pub operation_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashProgress {
    pub current: u64,
    pub total: u64,
    pub percentage: f32,
    pub partition_name: String,
    pub operation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationOutputEvent {
    pub operation_id: String,
    pub line: String,
    pub timestamp: String,
    pub is_stderr: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationCompleteEvent {
    pub operation_id: String,
    pub success: bool,
    pub error: Option<String>,
}

import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import type { FlashSection } from '../../types';

/**
 * Options for reading a partition.
 */
export interface ReadPartitionOptions {
  /** Path to the Download Agent (DA) file */
  daPath: string;
  /** Name of the partition to read */
  partition: string;
  /** Output file path where partition data will be saved */
  outputPath: string;
  /** Optional path to preloader file */
  preloaderPath?: string;
  /** Optional operation ID for tracking (auto-generated if not provided) */
  operationId?: string;
}

/**
 * Options for writing to a partition.
 */
export interface WritePartitionOptions {
  /** Path to the Download Agent (DA) file */
  daPath: string;
  /** Name of the partition to write to */
  partition: string;
  /** Path to the image file to flash */
  imagePath: string;
  /** Optional path to preloader file */
  preloaderPath?: string;
  /** Optional operation ID for tracking (auto-generated if not provided) */
  operationId?: string;
}

/**
 * Partition API service - Handles partition read/write/format/erase operations.
 * Centralizes all Tauri invoke calls related to partition management.
 */
export class PartitionApi {
  /**
   * Read partition data to a file.
   * 
   * @param options - Read operation options
   * @returns Promise resolving when operation completes
   * @throws Error if read fails
   */
  static async read(options: ReadPartitionOptions): Promise<void> {
    return invoke('read_partition', {
      daPath: options.daPath,
      partition: options.partition,
      outputPath: options.outputPath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Write (flash) an image file to a partition.
   * 
   * @param options - Write operation options
   * @returns Promise resolving when operation completes
   * @throws Error if write fails
   */
  static async write(options: WritePartitionOptions): Promise<void> {
    return invoke('flash_partition', {
      daPath: options.daPath,
      partition: options.partition,
      imagePath: options.imagePath,
      preloaderPath: options.preloaderPath || null,
      operationId: options.operationId || uuidv4(),
    });
  }

  /**
   * Format a partition (clear all data).
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param partition - Name of the partition to format
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when operation completes
   * @throws Error if format fails
   */
  static async format(
    daPath: string,
    partition: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('format_partition', {
      daPath,
      partition,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Erase a partition (similar to format, but may use different method).
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param partition - Name of the partition to erase
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when operation completes
   * @throws Error if erase fails
   */
  static async erase(
    daPath: string,
    partition: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('erase_partition', {
      daPath,
      partition,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Read all partitions (bulk backup operation).
   * 
   * @param daPath - Path to the Download Agent (DA) file
   * @param outputDir - Directory where partition backups will be saved
   * @param skipPartitions - Array of partition names to skip
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when all operations complete
   * @throws Error if any read operation fails
   */
  static async readAll(
    daPath: string,
    outputDir: string,
    skipPartitions: string[],
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('read_all_partitions', {
      daPath,
      outputDir,
      skipPartitions,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Write all partitions (restore) from a backup directory.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param inputDir - Directory containing the backup partition images
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when the restore completes
   * @throws Error if any write operation fails
   */
  static async writeAll(
    daPath: string,
    inputDir: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('write_all_partitions', {
      daPath,
      inputDir,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Flash all partitions from a scatter file using the DA protocol.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param scatterPath - Path to the scatter file (.txt)
   * @param firmwareDir - Directory containing firmware image files
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking (auto-generated if not provided)
   * @returns Promise resolving when flash completes
   * @throws Error if flash fails
   */
  static async flashScatter(
    daPath: string,
    scatterPath: string,
    firmwareDir: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('flash_scatter', {
      daPath,
      scatterPath,
      firmwareDir,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Read raw flash at a specific offset and size.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param address - Start address (hex string, e.g. "0x0")
   * @param size - Size in bytes (hex string, e.g. "0x40000")
   * @param section - Storage section: 'user', 'boot1', 'boot2', 'lu0', 'lu1', 'lu2'
   * @param outputPath - Output file path
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async readOffset(
    daPath: string,
    address: string,
    size: string,
    section: FlashSection,
    outputPath: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('read_offset', {
      daPath,
      address,
      size,
      section,
      outputPath,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Write raw flash at a specific offset.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param address - Start address (hex string, e.g. "0x0")
   * @param section - Storage section: 'user', 'boot1', 'boot2', 'lu0', 'lu1', 'lu2'
   * @param inputPath - Input file to write
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async writeOffset(
    daPath: string,
    address: string,
    section: FlashSection,
    inputPath: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('write_offset', {
      daPath,
      address,
      section,
      inputPath,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Erase raw flash at a specific offset.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param address - Start address (hex string, e.g. "0x0")
   * @param size - Size in bytes (hex string, e.g. "0x40000")
   * @param section - Storage section: 'user', 'boot1', 'boot2', 'lu0', 'lu1', 'lu2'
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async eraseOffset(
    daPath: string,
    address: string,
    size: string,
    section: FlashSection,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('erase_offset', {
      daPath,
      address,
      size,
      section,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

  /**
   * Read efuses from the device and save to file.
   *
   * @param daPath - Path to the Download Agent (DA) file
   * @param outputPath - Output file path for efuse dump
   * @param preloaderPath - Optional path to preloader file
   * @param operationId - Optional operation ID for tracking
   */
  static async readEfuses(
    daPath: string,
    outputPath: string,
    preloaderPath?: string,
    operationId?: string
  ): Promise<void> {
    return invoke('read_efuses', {
      daPath,
      outputPath,
      preloaderPath: preloaderPath || null,
      operationId: operationId || uuidv4(),
    });
  }

}

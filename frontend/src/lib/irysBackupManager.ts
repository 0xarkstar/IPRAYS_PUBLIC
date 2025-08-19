import { EnhancedIrysClient } from './irysClientEnhanced';

export interface CanvasSnapshot {
  pixels: any[];
  timestamp: number;
  version: number;
  totalPixels: number;
  metadata: {
    width: number;
    height: number;
    contractAddress: string;
    blockNumber?: number;
  };
}

export interface BackupManifest {
  snapshots: string[]; // Array of snapshot txIds
  latestSnapshot: string;
  createdAt: number;
  version: string;
}

export class IrysBackupManager {
  private irysClient: EnhancedIrysClient;
  private snapshots: Map<string, CanvasSnapshot> = new Map();
  private manifestTxId: string | null = null;

  constructor(irysClient: EnhancedIrysClient) {
    this.irysClient = irysClient;
  }

  /**
   * Create a full canvas snapshot and upload to Irys
   * @param canvasData Current canvas data
   * @param metadata Canvas metadata
   */
  async createSnapshot(canvasData: any[], metadata: any): Promise<string> {
    try {
      const snapshot: CanvasSnapshot = {
        pixels: canvasData,
        timestamp: Date.now(),
        version: this.getNextVersion(),
        totalPixels: canvasData.length,
        metadata: {
          width: metadata.width || 1024,
          height: metadata.height || 1024,
          contractAddress: metadata.contractAddress,
          blockNumber: metadata.blockNumber
        }
      };

      console.log('Creating canvas snapshot...', {
        pixelCount: snapshot.totalPixels,
        version: snapshot.version,
        size: JSON.stringify(snapshot).length
      });

      // Upload snapshot with mutability if previous exists
      const result = await this.irysClient.uploadWithMutability(snapshot, {
        mutability: true,
        description: `Canvas snapshot v${snapshot.version} - ${snapshot.totalPixels} pixels`
      });

      // Store in local cache
      this.snapshots.set(result.txId, snapshot);

      // Update manifest
      await this.updateManifest(result.txId);

      console.log('Snapshot created successfully:', {
        txId: result.txId,
        version: snapshot.version,
        uploaderUrl: result.uploaderUrl
      });

      return result.txId;
    } catch (error) {
      console.error('Snapshot creation failed:', error);
      throw new Error(`Failed to create snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore canvas from snapshot
   * @param txId Snapshot transaction ID
   */
  async restoreFromSnapshot(txId: string): Promise<CanvasSnapshot> {
    try {
      // Try local cache first
      if (this.snapshots.has(txId)) {
        console.log('Restoring from local cache:', txId);
        return this.snapshots.get(txId)!;
      }

      console.log('Restoring from Irys storage:', txId);
      
      // Fetch from Irys using best practice URL
      const snapshotData = await this.irysClient.getData(txId, true);
      
      if (!snapshotData || !snapshotData.pixels) {
        throw new Error('Invalid snapshot data structure');
      }

      const snapshot: CanvasSnapshot = {
        pixels: snapshotData.pixels,
        timestamp: snapshotData.timestamp,
        version: snapshotData.version,
        totalPixels: snapshotData.totalPixels,
        metadata: snapshotData.metadata
      };

      // Store in local cache
      this.snapshots.set(txId, snapshot);

      console.log('Snapshot restored successfully:', {
        txId,
        version: snapshot.version,
        pixelCount: snapshot.totalPixels,
        age: Date.now() - snapshot.timestamp
      });

      return snapshot;
    } catch (error) {
      console.error('Snapshot restoration failed:', error);
      throw new Error(`Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest snapshot
   */
  async getLatestSnapshot(): Promise<CanvasSnapshot | null> {
    try {
      if (!this.manifestTxId) {
        await this.loadManifest();
      }

      if (!this.manifestTxId) {
        console.log('No manifest found, no snapshots available');
        return null;
      }

      const manifest = await this.irysClient.getData(this.manifestTxId);
      if (!manifest || !manifest.latestSnapshot) {
        return null;
      }

      return await this.restoreFromSnapshot(manifest.latestSnapshot);
    } catch (error) {
      console.error('Failed to get latest snapshot:', error);
      return null;
    }
  }

  /**
   * List all available snapshots
   */
  async listSnapshots(): Promise<string[]> {
    try {
      if (!this.manifestTxId) {
        await this.loadManifest();
      }

      if (!this.manifestTxId) {
        return [];
      }

      const manifest = await this.irysClient.getData(this.manifestTxId);
      return manifest?.snapshots || [];
    } catch (error) {
      console.error('Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Update backup manifest
   * @param newSnapshotTxId New snapshot transaction ID
   */
  private async updateManifest(newSnapshotTxId: string): Promise<void> {
    try {
      let currentManifest: BackupManifest;

      if (this.manifestTxId) {
        try {
          currentManifest = await this.irysClient.getData(this.manifestTxId);
        } catch {
          // If manifest fetch fails, create new one
          currentManifest = {
            snapshots: [],
            latestSnapshot: '',
            createdAt: Date.now(),
            version: '1.0'
          };
        }
      } else {
        currentManifest = {
          snapshots: [],
          latestSnapshot: '',
          createdAt: Date.now(),
          version: '1.0'
        };
      }

      // Update manifest
      currentManifest.snapshots.push(newSnapshotTxId);
      currentManifest.latestSnapshot = newSnapshotTxId;

      // Keep only last 10 snapshots to prevent manifest from growing too large
      if (currentManifest.snapshots.length > 10) {
        currentManifest.snapshots = currentManifest.snapshots.slice(-10);
      }

      // Upload updated manifest with mutability
      const result = await this.irysClient.uploadWithMutability(currentManifest, {
        mutability: !!this.manifestTxId,
        previousTxId: this.manifestTxId || undefined,
        description: 'Updated backup manifest'
      });

      this.manifestTxId = result.txId;

      console.log('Manifest updated:', {
        manifestTxId: this.manifestTxId,
        snapshotCount: currentManifest.snapshots.length,
        latestSnapshot: newSnapshotTxId
      });
    } catch (error) {
      console.error('Manifest update failed:', error);
      // Don't throw error, as this shouldn't break snapshot creation
    }
  }

  /**
   * Load existing manifest
   */
  private async loadManifest(): Promise<void> {
    try {
      // Try to load manifest from localStorage first
      const cachedManifestTxId = localStorage.getItem('iprays_manifest_txid');
      if (cachedManifestTxId) {
        try {
          await this.irysClient.getData(cachedManifestTxId);
          this.manifestTxId = cachedManifestTxId;
          console.log('Loaded manifest from cache:', cachedManifestTxId);
          return;
        } catch {
          // If cached manifest is invalid, remove it
          localStorage.removeItem('iprays_manifest_txid');
        }
      }

      console.log('No valid manifest found, will create new one on first snapshot');
    } catch (error) {
      console.error('Manifest loading failed:', error);
    }
  }

  /**
   * Save manifest to localStorage for persistence
   */
  private saveManifestToCache(): void {
    if (this.manifestTxId) {
      localStorage.setItem('iprays_manifest_txid', this.manifestTxId);
    }
  }

  /**
   * Get next version number
   */
  private getNextVersion(): number {
    const versions = Array.from(this.snapshots.values()).map(s => s.version);
    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  }

  /**
   * Create incremental backup (only changed pixels)
   * @param changedPixels Only pixels that have changed
   * @param previousSnapshotTxId Previous snapshot for delta calculation
   */
  async createIncrementalBackup(changedPixels: any[], previousSnapshotTxId: string): Promise<string> {
    try {
      const incrementalData = {
        type: 'incremental',
        baseSnapshot: previousSnapshotTxId,
        changes: changedPixels,
        timestamp: Date.now(),
        changeCount: changedPixels.length
      };

      const result = await this.irysClient.uploadWithMutability(incrementalData, {
        mutability: false, // Incremental backups are immutable
        description: `Incremental backup - ${changedPixels.length} changes`
      });

      console.log('Incremental backup created:', {
        txId: result.txId,
        changeCount: changedPixels.length,
        baseSnapshot: previousSnapshotTxId
      });

      return result.txId;
    } catch (error) {
      console.error('Incremental backup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup old snapshots (keep only recent ones)
   * @param keepCount Number of snapshots to keep
   */
  async cleanupOldSnapshots(keepCount = 5): Promise<void> {
    try {
      const snapshots = await this.listSnapshots();
      if (snapshots.length <= keepCount) {
        return;
      }

      const toRemove = snapshots.slice(0, -keepCount);
      console.log(`Cleaning up ${toRemove.length} old snapshots`);

      // Note: We can't actually delete from Irys, but we can remove from manifest
      const newManifest: BackupManifest = {
        snapshots: snapshots.slice(-keepCount),
        latestSnapshot: snapshots[snapshots.length - 1],
        createdAt: Date.now(),
        version: '1.0'
      };

      const result = await this.irysClient.uploadWithMutability(newManifest, {
        mutability: !!this.manifestTxId,
        previousTxId: this.manifestTxId || undefined,
        description: `Cleaned up manifest - kept ${keepCount} snapshots`
      });

      this.manifestTxId = result.txId;
      this.saveManifestToCache();

      console.log('Cleanup completed:', {
        removed: toRemove.length,
        kept: keepCount,
        newManifestTxId: this.manifestTxId
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export default IrysBackupManager;
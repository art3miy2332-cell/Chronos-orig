
import { 
    MapSnapshot, MapNodeEntity, MapEdgeEntity, MapActionType, MapEvolutionMetrics 
} from '../types';

const HISTORY_LIMIT = 50; // Keep local storage sane
const STORAGE_KEY_PREFIX = 'chronos_map_history_';

export class MapHistoryManager {
    private mapId: string;
    private timeline: MapSnapshot[] = [];
    private currentIndex: number = -1;

    constructor(mapId: string) {
        this.mapId = mapId;
        this.load();
    }

    private getStorageKey(): string {
        return `${STORAGE_KEY_PREFIX}${this.mapId}`;
    }

    private load() {
        const raw = localStorage.getItem(this.getStorageKey());
        if (raw) {
            try {
                const data = JSON.parse(raw);
                this.timeline = data.timeline || [];
                this.currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : this.timeline.length - 1;
            } catch (e) {
                console.error("Failed to load map history", e);
                this.timeline = [];
                this.currentIndex = -1;
            }
        }
    }

    private save() {
        // Optimize: Don't store full deep clones if objects are massive, but for MVP full snapshot is safest to avoid reference bugs.
        localStorage.setItem(this.getStorageKey(), JSON.stringify({
            timeline: this.timeline,
            currentIndex: this.currentIndex
        }));
    }

    /**
     * Push a new state to history.
     * Removes "future" states if we are in the middle of the stack.
     */
    public push(nodes: MapNodeEntity[], edges: MapEdgeEntity[], action: MapActionType, desc?: string) {
        // 1. Check if state actually changed (simple length check or deep compare)
        // For performance, we assume the UI calls push() only on actual change events (Drag End, Connect, etc.)
        
        // 2. Slice future
        if (this.currentIndex < this.timeline.length - 1) {
            this.timeline = this.timeline.slice(0, this.currentIndex + 1);
        }

        // 3. Create Snapshot
        const snapshot: MapSnapshot = {
            id: crypto.randomUUID(),
            mapId: this.mapId,
            timestamp: Date.now(),
            nodes: JSON.parse(JSON.stringify(nodes)), // Deep copy
            edges: JSON.parse(JSON.stringify(edges)), // Deep copy
            actionType: action,
            description: desc
        };

        this.timeline.push(snapshot);

        // 4. Enforce Limit
        if (this.timeline.length > HISTORY_LIMIT) {
            this.timeline.shift(); // Remove oldest
        }

        this.currentIndex = this.timeline.length - 1;
        this.save();
    }

    public undo(): MapSnapshot | null {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.save();
            return this.timeline[this.currentIndex];
        }
        return null;
    }

    public redo(): MapSnapshot | null {
        if (this.currentIndex < this.timeline.length - 1) {
            this.currentIndex++;
            this.save();
            return this.timeline[this.currentIndex];
        }
        return null;
    }

    public canUndo(): boolean {
        return this.currentIndex > 0;
    }

    public canRedo(): boolean {
        return this.currentIndex < this.timeline.length - 1;
    }

    public getCurrentSnapshot(): MapSnapshot | null {
        if (this.currentIndex >= 0 && this.currentIndex < this.timeline.length) {
            return this.timeline[this.currentIndex];
        }
        return null;
    }

    /**
     * AI Analysis: Calculate Evolution Metrics
     * Compares the oldest snapshot (or specific date) with current.
     */
    public analyzeEvolution(): MapEvolutionMetrics {
        if (this.timeline.length < 2) {
            return {
                nodeCountDelta: 0,
                complexityScore: 0,
                growthTrend: 'STAGNANT',
                lastMajorPivot: Date.now()
            };
        }

        const start = this.timeline[0];
        const end = this.timeline[this.currentIndex];

        const nodeDelta = end.nodes.length - start.nodes.length;
        const currentComplexity = end.nodes.length > 0 ? end.edges.length / end.nodes.length : 0;
        const prevComplexity = start.nodes.length > 0 ? start.edges.length / start.nodes.length : 0;

        let trend: MapEvolutionMetrics['growthTrend'] = 'STAGNANT';
        if (nodeDelta > 2) trend = 'GROWING';
        if (nodeDelta < -1) trend = 'SIMPLIFYING';
        if (Math.abs(currentComplexity - prevComplexity) > 0.5) trend = 'CHAOTIC'; // Big shift in structure

        // Check for major pivot (e.g., Future Self deleted or moved drastically)
        // Simple heuristic: > 30% node change
        const changeRatio = Math.abs(nodeDelta) / Math.max(1, start.nodes.length);
        const lastPivot = changeRatio > 0.3 ? end.timestamp : 0;

        return {
            nodeCountDelta: nodeDelta,
            complexityScore: parseFloat(currentComplexity.toFixed(2)),
            growthTrend: trend,
            lastMajorPivot: lastPivot
        };
    }
}

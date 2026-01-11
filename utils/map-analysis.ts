
import { 
    MapNodeEntity, MapEdgeEntity, MapNodeType, UserEntity, 
    GraphAnalysisResult, MapIssue, AnalysisRuleId 
} from '../types';

export const MapAnalysisService = {
    
    analyze: (nodes: MapNodeEntity[], edges: MapEdgeEntity[], userContext?: UserEntity): GraphAnalysisResult => {
        const issues: MapIssue[] = [];
        const activeNodes = nodes.filter(n => !n.meta.isDeleted);
        const activeEdges = edges.filter(e => !e.meta.isDeleted);

        const adjList = new Map<string, string[]>();
        const revAdjList = new Map<string, string[]>();

        activeNodes.forEach(n => {
            adjList.set(n.id, []);
            revAdjList.set(n.id, []);
        });

        activeEdges.forEach(e => {
            if (adjList.has(e.sourceNodeId)) adjList.get(e.sourceNodeId)!.push(e.targetNodeId);
            if (revAdjList.has(e.targetNodeId)) revAdjList.get(e.targetNodeId)!.push(e.sourceNodeId);
        });

        const currentSelf = activeNodes.find(n => n.type === MapNodeType.CURRENT_SELF);
        const futureSelf = activeNodes.find(n => n.type === MapNodeType.FUTURE_SELF);

        let pathExists = false;
        if (currentSelf && futureSelf) {
            pathExists = bfs(currentSelf.id, futureSelf.id, adjList);
            if (!pathExists) {
                issues.push({
                    ruleId: AnalysisRuleId.VISION_GAP,
                    severity: 'CRITICAL',
                    message: "Разрыв стратегии: Нет пути к Я 2.0.",
                    recommendation: "Свяжите свои текущие действия с главной целью через цепочку шагов."
                });
            }
        }

        activeNodes.forEach(n => {
            if (n.type === MapNodeType.CURRENT_SELF) return;
            const incoming = revAdjList.get(n.id) || [];
            if (incoming.length === 0) {
                issues.push({
                    ruleId: AnalysisRuleId.ORPHAN_NODE,
                    severity: 'WARNING',
                    targetNodeId: n.id,
                    message: `Изолированный узел: "${n.content.label}"`,
                    recommendation: "Что ведет к этому результату? Установите связь."
                });
            }
        });

        const goals = activeNodes.filter(n => n.type === MapNodeType.GOAL);
        goals.forEach(g => {
            const children = adjList.get(g.id) || [];
            if (children.length === 0) {
                issues.push({
                    ruleId: AnalysisRuleId.HOLLOW_GOAL,
                    severity: 'WARNING',
                    targetNodeId: g.id,
                    message: `Абстрактная цель: "${g.content.label}"`,
                    recommendation: "Цель без конкретных шагов. Добавьте задачи."
                });
            }
        });

        const barriers = activeNodes.filter(n => n.type === MapNodeType.LIMITATION);
        barriers.forEach(b => {
             if (!b.content.description || b.content.description.length < 10) {
                 issues.push({
                    ruleId: AnalysisRuleId.ORPHAN_NODE,
                    severity: 'INFO',
                    targetNodeId: b.id,
                    message: `Барьер без описания: "${b.content.label}"`,
                    recommendation: "Распишите подробнее, как именно это мешает вам."
                });
             }
        });

        let score = 100;
        if (!pathExists) score -= 40;
        score -= issues.filter(i => i.severity === 'WARNING').length * 5;
        score -= barriers.length > 5 ? 10 : 0;
        score = Math.max(0, score);

        return {
            score,
            criticalPathExists: pathExists,
            issues,
            stats: {
                orphanCount: issues.filter(i => i.ruleId === AnalysisRuleId.ORPHAN_NODE).length,
                goalCount: goals.length,
                activeNodes: activeNodes.length
            },
            lastAnalyzed: Date.now()
        };
    }
};

function bfs(start: string, end: string, adj: Map<string, string[]>): boolean {
    const queue = [start];
    const visited = new Set<string>();
    visited.add(start);
    while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === end) return true;
        const neighbors = adj.get(curr) || [];
        for (const next of neighbors) {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }
    return false;
}

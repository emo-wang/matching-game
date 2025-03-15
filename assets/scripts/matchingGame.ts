import { _decorator, Component, UITransform, instantiate, Vec3, Label, Node } from 'cc';
import { initiateMatchingData, MatchingData, MatchingCell } from './utils/initiateMatchingData';
const { ccclass, property } = _decorator;

@ccclass('MatchingGame')
export class MatchingGame extends Component {
    matchingData: MatchingData // 页面显示数据
    matchingArray = null // 用于处理逻辑
    lastClickedCell: MatchingCell | null = null

    onLoad() {
        console.log("场景加载成功", this.node);
    }

    start() {
        this.initGameLogic();
    }

    initGameLogic() {
        // TODO: 后续换成从接口获取数据
        this.matchingData = initiateMatchingData(20, 15, 20);
        this.initGameTable();
        this.initMatchingArray();
    }

    // 不考虑别的更新方式，这里暂时只用于连接后
    updateMatchingData(keys: number[]) {
        keys.forEach((key,) => {
            this.matchingData.mapData.get(key).isMatched = true
        })
        console.log(this.matchingData)
    }

    initMatchingArray() {
        const { rows, cols } = this.matchingData
        this.matchingArray = [];
        let id: number = 0
        for (let i = 0; i < rows + 2; i++) {
            this.matchingArray[i] = [];
            for (let j = 0; j < cols + 2; j++) {
                if (i === 0 || i === rows + 1 || j === 0 || j === cols + 1) {
                    this.matchingArray[i][j] = -1
                }
                else {
                    const { typeId, isEmpty, isMatched } = this.matchingData.mapData.get(id)
                    if (isEmpty || isMatched) {
                        this.matchingArray[i][j] = -1
                    }
                    else {
                        this.matchingArray[i][j] = typeId
                        id++
                    }
                }
            }
        }
        console.log(this.matchingArray)
    }

    updateMatchingArray(keys: number[], values: number[]) {
        const { cols } = this.matchingData;
        keys.forEach((key, index) => {
            const x = Math.floor(key / cols) + 1
            const y = (key % cols) + 1
            this.matchingArray[x][y] = values[index]
        })
        console.log(this.matchingArray)
    }

    // 用于UI显示
    initGameTable() {
        let table = this.node.getChildByName('table')
        const { cols, rows, mapData } = this.matchingData
        const { width: tableWidth, height: tableHeight } = table.getComponent(UITransform);
        const cellSize = Math.min(tableWidth / cols, tableHeight / rows);

        // for testing purposes
        // mapData.get(30).isEmpty = true
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const cellData = mapData.get(i * cols + j)
                if (cellData.isEmpty) continue;
                const cell = instantiate(table.getChildByName('matchingCell'));
                cell.getComponent(UITransform).width = cell.getComponent(UITransform).height = cellSize;
                cell.parent = table;
                cell.name = cellData.id.toString();
                cell.getChildByName('icon').getComponent(Label).string = cellData.typeId.toString();
                cell.position = new Vec3(-tableWidth / 2 + cellSize / 2 + j * cellSize, tableHeight / 2 - cellSize / 2 - i * cellSize)
                cell.on(Node.EventType.TOUCH_END, (e: any) => this.clickCell(e, i * cols + j), this)
            }
        }
        
        table.getChildByName('matchingCell').destroy();
    }

    updateMatchingTable(keys: number[]) {
        const matchingNodes = this.node.getChildByName('table').children
        keys.forEach((key,) => {
            matchingNodes[key].active = false
        })
    }

    clickCell(e: any, mapId: number) {
        const clickCell: MatchingCell = this.matchingData.mapData.get(mapId)
        if (clickCell.isMatched || clickCell.id === this.lastClickedCell?.id) return

        if (clickCell.typeId !== this.lastClickedCell?.typeId) {
            this.lastClickedCell = clickCell
            return
        }

        if (this.checkCanMatch(this.lastClickedCell.id, clickCell.id)) {
            console.log(clickCell.typeId, '连接成功')
            // 更新MatchingData、MatchingArray、UI
            this.updateMatchingArray([this.lastClickedCell.id, clickCell.id], [-1, -1])
            this.updateMatchingData([this.lastClickedCell.id, clickCell.id])
            this.updateMatchingTable([this.lastClickedCell.id, clickCell.id])
            // TODO: 发送更新后台数据请求

            this.lastClickedCell = null
        } else {
            console.log(clickCell.typeId, '连接失败')
            this.lastClickedCell = clickCell
        }
    }

    checkCanMatch(id1: number, id2: number): boolean {
        const { cols } = this.matchingData;
        const rows = this.matchingArray.length - 2;

        const p1 = [Math.floor(id1 / cols) + 1, (id1 % cols) + 1];
        const p2 = [Math.floor(id2 / cols) + 1, (id2 % cols) + 1];

        interface Node {
            x: number;
            y: number;
            turns: number;
            direction: number; // -1: 初始，0:右，1:下，2:左，3:上
        }

        const directions = [
            [0, 1],  // 右
            [1, 0],  // 下
            [0, -1], // 左
            [-1, 0], // 上
        ];

        const queue: Node[] = [];
        const visited = Array.from({ length: rows + 2 }, () =>
            Array.from({ length: cols + 2 }, () => Array(4).fill(Infinity))
        );

        queue.push({ x: p1[0], y: p1[1], turns: -1, direction: -1 });

        while (queue.length) {
            const curr = queue.shift();
            if (!curr) continue;

            if (curr.turns >= 2) continue;

            if (curr.x === p2[0] && curr.y === p2[1] && curr.turns < 2) {
                return true;
            }

            for (let d = 0; d < 4; d++) {
                const nx = curr.x + directions[d][0];
                const ny = curr.y + directions[d][1];

                if (nx < 0 || nx >= rows + 2 || ny < 0 || ny >= cols + 2) continue;

                // 可以走的位置: 要么是目标位置，要么必须为 -1（空格）
                const cellValue = this.matchingArray[nx][ny];
                const isTarget = (nx === p2[0] && ny === p2[1]);
                if (!(cellValue === -1 || isTarget)) continue;

                const newTurns = (curr.direction === -1 || curr.direction === d) ? curr.turns : curr.turns + 1;
                if (visited[nx][ny][d] <= newTurns) continue;

                visited[nx][ny][d] = newTurns;
                queue.push({ x: nx, y: ny, turns: newTurns, direction: d });
            }
        }

        return false;
    }

    checkTableMatch() {

    }

}

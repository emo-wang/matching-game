import { _decorator, Component, UITransform, instantiate, Vec3, Label, Node } from 'cc';
import { initiateMatchingData, MatchingData, MatchingCell } from './utils/initiateMatchingData';
const { ccclass, property } = _decorator;

@ccclass('MatchingGame')
export class MatchingGame extends Component {
    matchingData: MatchingData // 页面显示数据
    matchingArray = null // 用于处理逻辑
    lastClickedCell: MatchingCell | null = null

    onLoad() {
    }

    start() {
        this.initGameLogic();
    }

    initGameLogic() {
        // TODO: 后续换成从接口获取数据
        this.matchingData = initiateMatchingData(10, 15, 75);
        console.log('matchingData', this.matchingData)
        this.initGameTable();
        this.initMatchingArray();
        this.checkTableStatus()
    }

    // 不考虑别的更新方式，这里暂时只用于连接后
    updateMatchingData(keys: number[]) {
        keys.forEach((key,) => {
            this.matchingData.mapData.get(key).isMatched = true
        })
        // console.log(this.matchingData)
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
        // console.log(this.matchingArray)
    }

    updateMatchingArray(keys: number[], values: number[]) {
        const { cols } = this.matchingData;
        keys.forEach((key, index) => {
            const [x, y] = this.convertIdtoPos(key)
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
        console.log(table)
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
            // console.log(clickCell.typeId, '连接成功')
            // 更新MatchingData、MatchingArray、UI
            this.updateMatchingArray([this.lastClickedCell.id, clickCell.id], [-1, -1])
            this.updateMatchingData([this.lastClickedCell.id, clickCell.id])
            this.updateMatchingTable([this.lastClickedCell.id, clickCell.id])
            // 检查是否成死局
            this.checkTableStatus()

            // TODO: 发送更新后台数据请求

            this.lastClickedCell = null
        } else {
            // console.log(clickCell.typeId, '连接失败')
            this.lastClickedCell = clickCell
        }
    }

    // 检查连连看是否死局
    checkTableStatus() {
        if (!this.checkTableCanMatch()) {
            console.log('成死局')
            // TODO: 洗牌
            // TODO: 发送更新后台数据请求

        }
    }



    //————————————————————————以下为一些功能性函数————————————————————————————

    checkTableCanMatch() {
        const { cols, rows, mapData } = this.matchingData
        // key:typeId, value:id[]
        let transformedMap = new Map<number, number[]>();

        for (let [, value] of mapData) {
            let ids = transformedMap.get(value.typeId) || [];
            if (value.isEmpty || value.isMatched) continue;
            ids.push(value.id);
            transformedMap.set(value.typeId, ids);
        }

        for (let [key, value] of transformedMap) {
            const unblockedCellIds = []
            value.forEach((id) => { if (!this.checkCellBlocked(id)) unblockedCellIds.push(id) })
            // console.log(key, value, unblockedCellIds)

            for (let i = 0; i < unblockedCellIds.length; i++) {
                for (let j = i + 1; j < unblockedCellIds.length; j++) {
                    if (this.checkCanMatch(unblockedCellIds[i], unblockedCellIds[j])) return true
                }
            }
        }

        return false;
    }

    // 把id转换成matchingArray中的坐标
    convertIdtoPos(id: number): [number, number] {
        return [Math.floor(id / this.matchingData.cols) + 1, (id % this.matchingData.cols) + 1];
    }

    // 检查四周是否被挡住
    checkCellBlocked(id: number) {
        const [x, y] = this.convertIdtoPos(id);
        const value = this.matchingArray[x][y]
        if (this.matchingArray[x + 1] && (this.matchingArray[x + 1][y] === -1 || this.matchingArray[x + 1][y] === value)) return false;
        if (this.matchingArray[x - 1] && (this.matchingArray[x - 1][y] === -1 || this.matchingArray[x - 1][y] === value)) return false;
        if (this.matchingArray[x][y + 1] === -1 || this.matchingArray[x][y + 1] === value) return false;
        if (this.matchingArray[x][y - 1] === -1 || this.matchingArray[x][y - 1] === value) return false;
        return true;
    }

    checkCanMatch(id1: number, id2: number): boolean {
        const { cols } = this.matchingData;
        const rows = this.matchingArray.length - 2;

        const p1 = this.convertIdtoPos(id1);
        const p2 = this.convertIdtoPos(id2);

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

}

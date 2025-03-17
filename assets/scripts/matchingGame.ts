import { _decorator, Component, UITransform, instantiate, Vec3, Label, Node, Graphics, UIOpacity, tween, easing } from 'cc';
import { initiateMatchingData, MatchingData, MatchingCell, shuffleArray } from './utils/initiateMatchingData';
const { ccclass, property } = _decorator;

@ccclass('MatchingGame')
export class MatchingGame extends Component {
    matchingData: MatchingData // 页面显示数据
    matchingArray = null // 用于处理逻辑
    matchingLink = [] // 提示线
    lastClickedCell: MatchingCell | null = null // 上一次点击的格子

    onLoad() {
        console.log(this.node, '场景加载成功，SceneLoader 执行！');
    }

    start() {
        this.initGameLogic();
    }

    addEventListeners() {
        this.node.getChildByName('hint').on(Node.EventType.TOUCH_END, this.showLink, this) // 点击连线提示
    }


    initGameLogic() {
        // TODO: 后续换成从接口获取数据
        this.matchingData = initiateMatchingData(15, 20, 75);
        console.log('matchingData', this.matchingData)
        this.initGameTable();
        this.initMatchingArray();
        this.checkTableStatus();
        this.addEventListeners();
    }

    // 不考虑别的更新方式，这里暂时只用于连接后
    updateMatchingData(keys: number[]) {
        keys.forEach((key,) => {
            this.matchingData.mapData.get(key).isMatched = true
        })
        console.log(this.matchingData)
    }

    initMatchingArray() {
        const { rows, cols, mapData } = this.matchingData
        this.matchingArray = [];
        let id: number = 0
        for (let i = 0; i < rows + 2; i++) {
            this.matchingArray[i] = [];
            for (let j = 0; j < cols + 2; j++) {
                if (i === 0 || i === rows + 1 || j === 0 || j === cols + 1) {
                    this.matchingArray[i][j] = -1
                }
                else {
                    const { typeId, isEmpty, isMatched } = mapData.get(id)
                    if (isEmpty || isMatched) {
                        this.matchingArray[i][j] = -1
                    }
                    else {
                        this.matchingArray[i][j] = typeId
                    }
                    id++
                }
            }
        }
        console.log(this.matchingArray)
    }

    updateMatchingArray(keys: number[], values: number[]) {
        keys.forEach((key, index) => {
            const [x, y] = this.convertIdtoPos(key)
            this.matchingArray[x][y] = values[index]
        })
        console.log(this.matchingArray)
    }

    // 用于UI显示
    initGameTable() {
        const { cols, rows, mapData } = this.matchingData
        this.generateUIbyData(cols, rows, mapData)

    }

    generateUIbyData(cols: number, rows: number, mapData: Map<number, MatchingCell>) {
        let table = this.node.getChildByName('table')
        let sample = this.node.getChildByName('matchingCell')
        const { width: tableWidth, height: tableHeight } = table.getComponent(UITransform);
        const cellSize = Math.min(tableWidth / cols, tableHeight / rows);
        table.children.forEach(child => child.destroy())

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const cellData = mapData.get(i * cols + j)
                if (cellData.isEmpty || cellData.isMatched) continue;
                const cell = instantiate(sample);
                cell.getComponent(UITransform).width = cellSize;
                cell.getComponent(UITransform).height = cellSize;
                cell.parent = table;
                cell.name = cellData.id.toString();
                cell.getChildByName('icon').getComponent(Label).string = cellData.typeId.toString();
                cell.position = new Vec3(-tableWidth / 2 + cellSize / 2 + j * cellSize, tableHeight / 2 - cellSize / 2 - i * cellSize)
                cell.on(Node.EventType.TOUCH_END, (e: any) => this.clickCell(e, cellData.id), this)
            }
        }
    }

    updateMatchingTable(keys: number[]) {
        const matchingNodes = this.node.getChildByName('table').children
        keys.forEach((key,) => {
            if (matchingNodes[key]) { matchingNodes[key].active = false }
        })
    }

    clickCell(e: any, mapId: number) {
        const clickCell: MatchingCell = this.matchingData.mapData.get(mapId)
        if (clickCell.isMatched || clickCell.id === this.lastClickedCell?.id) return

        if (clickCell.typeId !== this.lastClickedCell?.typeId) {
            this.lastClickedCell = clickCell
            return
        }

        const result = this.checkCanMatchWithRoute(this.lastClickedCell.id, clickCell.id)
        if (result.matched) {
            // 更新MatchingData、MatchingArray、UI，检查是否成死局
            this.updateMatchingArray([this.lastClickedCell.id, clickCell.id], [-1, -1])
            this.updateMatchingData([this.lastClickedCell.id, clickCell.id])
            this.updateMatchingTable([this.lastClickedCell.id, clickCell.id])
            this.checkTableStatus()

            // TODO: 发送更新后台数据请求

            this.lastClickedCell = null
        } else {
            this.lastClickedCell = clickCell
        }
    }

    // 检查连连看是否死局
    checkTableStatus() {
        // this.shuffleTable() //测试用
        if (!this.checkTableCanMatch()) {
            console.log('成死局')
            this.shuffleTable()
            // TODO: 发送更新后台数据请求
        }
    }

    // 随机打乱桌面 并获取新的提示线
    shuffleTable() {
        const { cols, rows, mapData } = this.matchingData
        let keys = Array.from(mapData.keys());
        let values = Array.from(mapData.values()).filter(value => !value.isEmpty && !value.isMatched)
        shuffleArray(values)

        let valueIndex = 0
        for (let i = 0; i < keys.length; i++) {
            if (mapData.get(keys[i]).isEmpty || mapData.get(keys[i]).isMatched) continue;
            mapData.get(keys[i]).typeId = values[valueIndex].typeId
            mapData.get(keys[i]).type = values[valueIndex].type
            valueIndex++
        }

        this.initMatchingArray()
        this.generateUIbyData(cols, rows, mapData)

        if (!this.checkTableCanMatch()) {
            this.shuffleTable()
        }
    }

    // 提示线
    showLink() {
        let table = this.node.getChildByName('table');
        const { cols, rows } = this.matchingData;
        const { width: tableWidth, height: tableHeight } = table.getComponent(UITransform);
        const cellSize = Math.min(tableWidth / cols, tableHeight / rows);

        let graphicsNode = this.node.getChildByName('graphicsLink');
        let graphics = graphicsNode.getComponent(Graphics);
        graphics.clear();

        if (this.matchingLink.length > 0) {
            let firstPoint = this.convertPointToPosition(this.matchingLink[0], cellSize, tableWidth, tableHeight);
            graphics.moveTo(firstPoint.x, firstPoint.y);

            this.matchingLink.slice(1).forEach(point => {
                let worldPos = this.convertPointToPosition(point, cellSize, tableWidth, tableHeight);
                graphics.lineTo(worldPos.x, worldPos.y);
            });
            graphics.stroke();
        }

        this.startFadeOut(graphicsNode, 1, () => { graphics.clear() })
    }

    checkTableCanMatch() {
        const { mapData } = this.matchingData
        // key:typeId, value:id[]
        let transformedMap = new Map<number, number[]>();

        for (let [, value] of mapData) {
            let ids = transformedMap.get(value.typeId) || [];
            if (value.isEmpty || value.isMatched) continue;
            ids.push(value.id);
            transformedMap.set(value.typeId, ids);
        }

        for (let [, value] of transformedMap) {
            const unblockedCellIds = []
            value.forEach((id) => { if (!this.checkCellBlocked(id)) unblockedCellIds.push(id) })

            for (let i = 0; i < unblockedCellIds.length; i++) {
                for (let j = i + 1; j < unblockedCellIds.length; j++) {
                    const result = this.checkCanMatchWithRoute(unblockedCellIds[i], unblockedCellIds[j])
                    if (result.matched) {
                        // 将新的提示线储存起来
                        this.matchingLink = result.route;
                        return true
                    }
                }
            }
        }

        return false;
    }


    //————————————————————————以下为一些功能性函数————————————————————————————


    // TODO: 这个功能有问题，需要fix
    // TODO: 封装到其他地方
    startFadeOut(node: Node, fadeDuration: number = 3, callback: any) {
        let uiOpacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);

        tween(uiOpacity)
            .to(fadeDuration, { opacity: 0 }, { easing: 'smooth' })
            .call(() => {
                callback()
                uiOpacity.opacity = 255
            })
            .start();
    }

    convertPointToPosition(point: { x: number, y: number }, cellSize: number, tableWidth: number, tableHeight: number) {
        return new Vec3(-tableWidth / 2 + cellSize / 2 + (point.y - 1) * cellSize, tableHeight / 2 - cellSize / 2 - (point.x - 1) * cellSize)
    }

    // 把id转换成matchingArray中的坐标
    convertIdtoPos(id: number): [number, number] {
        return [Math.floor(id / this.matchingData.cols) + 1, (id % this.matchingData.cols) + 1];
    }

    checkCellBlocked(id: number) {
        const [x, y] = this.convertIdtoPos(id);
        const value = this.matchingArray[x][y]
        if (this.matchingArray[x + 1] && (this.matchingArray[x + 1][y] === -1 || this.matchingArray[x + 1][y] === value)) return false;
        if (this.matchingArray[x - 1] && (this.matchingArray[x - 1][y] === -1 || this.matchingArray[x - 1][y] === value)) return false;
        if (this.matchingArray[x][y + 1] === -1 || this.matchingArray[x][y + 1] === value) return false;
        if (this.matchingArray[x][y - 1] === -1 || this.matchingArray[x][y - 1] === value) return false;
        return true;
    }

    checkCanMatchWithRoute(id1: number, id2: number): { matched: boolean, route: { x: number, y: number }[] } {
        const { cols } = this.matchingData;
        const rows = this.matchingArray.length - 2;

        const p1 = this.convertIdtoPos(id1);
        const p2 = this.convertIdtoPos(id2);

        interface Node {
            x: number;
            y: number;
            turns: number;
            direction: number; // -1: 初始，0:右，1:下，2:左，3:上
            path: { x: number, y: number }[];
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

        queue.push({ x: p1[0], y: p1[1], turns: -1, direction: -1, path: [{ x: p1[0], y: p1[1] }] });

        while (queue.length) {
            const curr = queue.shift();
            if (!curr) continue;

            if (curr.turns >= 2) continue;

            if (curr.x === p2[0] && curr.y === p2[1] && curr.turns < 2) {
                return { matched: true, route: curr.path };
            }

            for (let d = 0; d < 4; d++) {
                const nx = curr.x + directions[d][0];
                const ny = curr.y + directions[d][1];

                if (nx < 0 || nx >= rows + 2 || ny < 0 || ny >= cols + 2) continue;

                const cellValue = this.matchingArray[nx][ny];
                const isTarget = (nx === p2[0] && ny === p2[1]);
                if (!(cellValue === -1 || isTarget)) continue;

                const newTurns = (curr.direction === -1 || curr.direction === d) ? curr.turns : curr.turns + 1;
                if (visited[nx][ny][d] <= newTurns) continue;

                visited[nx][ny][d] = newTurns;
                const newPath = curr.path.concat([{ x: nx, y: ny }]);
                queue.push({ x: nx, y: ny, turns: newTurns, direction: d, path: newPath });
            }
        }

        return { matched: false, route: [] };
    }

}

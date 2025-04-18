import { _decorator, director, resources, Component, UITransform, instantiate, Vec3, Node, Graphics, UIOpacity, tween, Sprite, SpriteFrame, ProgressBar, Label, game } from 'cc';
import { initMatchingData, MatchingData, MatchingCell, shuffleArray } from './utils/data/initMatchingData';
import { drawHighlightBlock, drawBackgroundBlock } from './BackgroundBlock';
import { ConfirmDialog } from './utils/prefab/confirmDialog';
import { DataManager } from './utils/func/dataManager';
const { ccclass, property } = _decorator;

const GAMESTATUS = {
    PENDING: 'pending', // 初始状态、等待刷新状态
    PLAYING: 'playing',
    WIN: 'win',
    LOSE: 'lose'
}


const TIMELIMIT = 60

@ccclass('MatchingGame')
export class MatchingGame extends Component {
    matchingData: MatchingData = null // 页面显示数据
    matchingDatabyOthers: MatchingData[] = new Array<MatchingData>(5);
    matchingArray = null // 用于处理逻辑，除了数据周围还有一圈-1的格子
    matchingLink = [] // 提示线
    lastClickedCell: MatchingCell | null = null // 上一次点击的格子
    spriteFrames: Map<number, SpriteFrame> = new Map();
    gameStatus: String = GAMESTATUS.PENDING // 'pending', 'playing', 'win', 'lose'
    cellHeight: number = 0; // 目前是正方形
    cellWidth: number = 0; // 目前是正方形
    timeLeft: number = TIMELIMIT; // 剩余时间
    combos: number = 0; // 连续消除

    update(dt: number): void {
        if (this.gameStatus === GAMESTATUS.PLAYING) {
            this.timeLeft -= dt;
            this.node.getChildByName('timebar').getComponent(ProgressBar).progress = this.timeLeft / TIMELIMIT;
            if (this.timeLeft <= 0) {
                this.setGameStatus(GAMESTATUS.LOSE);
            }
        }
    }

    onLoad() {
        const roomInfo = DataManager.instance.get('roomInfo');
        console.log('进入房间：', roomInfo, this.node);
    }

    start() {
        this.loadGameResources(() => {
            this.initGameLogic();
            this.initOtherPlayersTable();
            this.addEventListeners();
        });
    }

    loadGameResources(callback: Function) {
        const spriteFrames = globalThis?.assets?.matchingCellSpriteFrames

        if (spriteFrames) {
            this.spriteFrames = spriteFrames;
            if (callback) callback();
            return
        }

        resources.loadDir('sprites/matchingicons', SpriteFrame, (err, assets) => {
            if (err) {
                console.error('文件夹加载出错', err);
            }

            assets.sort((a, b) => parseInt(a.name) - parseInt(b.name)); // 排序
            assets.forEach((asset, index) => {
                this.spriteFrames.set(index, asset as SpriteFrame);
            });

            if (callback) callback();
        });

    }

    addEventListeners() {
        const btns = this.node.getChildByName('buttons')

        btns.getChildByName('hint').on(Node.EventType.TOUCH_END, this.onClickHint, this)
        btns.getChildByName('shuffle').on(Node.EventType.TOUCH_END, this.shuffleTable, this)
        btns.getChildByName('restart').on(Node.EventType.TOUCH_END, this.restartGame, this)
        btns.getChildByName('exit').on(Node.EventType.TOUCH_END, this.onClickExit, this)
    }

    initOtherPlayersTable() {
        // TODO: 根据后台数据生成
        const playerCount = 5
        const tables = this.node.getChildByName('MatchingGamebyOthers').children.map(children => children.getChildByName('table'))
        const players = this.node.getChildByName('MatchingGamebyOthers').children.map(children => children.getChildByName('player'))
        for (let i = 0; i < playerCount; i++) {
            // WARNING: 这里没有深拷贝的，考虑到也就是用于生成UI，更新UI也只是根据节点顺序，不会有后续牵连
            this.matchingDatabyOthers[i] = this.matchingData
            const { cols, rows, mapData } = this.matchingDatabyOthers[i]
            this.generateUIbyData('otherplayers', tables[i], cols, rows, mapData)
            players[i].getComponent(Label).string = `Player${i + 1}`
        }
    }

    initGameLogic() {
        this.matchingData = initMatchingData(1);
        console.log('matchingData', this.matchingData)
        this.initGameTable();
        this.initMatchingArray();
        this.timeLeft = TIMELIMIT
        this.setGameStatus(GAMESTATUS.PLAYING)
        this.checkTableStatus();
    }

    onClickExit() {
        ConfirmDialog.show(undefined, '确认要退出房间吗？', undefined, undefined, () => { director.loadScene('LobbyScene') })
    }

    restartGame() {
        if (this.gameStatus === GAMESTATUS.PLAYING || this.gameStatus === GAMESTATUS.PENDING) return
        this.setGameStatus(GAMESTATUS.PENDING)
        this.matchingLink = []
        this.lastClickedCell = null
        this.initGameLogic()
    }

    // 不考虑别的更新方式，这里暂时只用于连接后
    updateMatchingData(keys: number[]) {
        keys.forEach((key,) => {
            this.matchingData.mapData.get(key).isMatched = true
        })
        // console.log('更新matchingData', this.matchingData)
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
        console.log('生成matchingArray', this.matchingArray)
    }

    updateMatchingArray(keys: number[], values: number[]) {
        keys.forEach((key, index) => {
            const [x, y] = this.convertIdtoPos(key)
            this.matchingArray[x][y] = values[index]
        })
        // console.log('更新matchingArray', this.matchingArray)
    }

    initGameTable() {
        const { cols, rows, mapData } = this.matchingData
        this.generateUIbyData('self', this.node.getChildByName('table'), cols, rows, mapData)
    }

    // TODO: 优化
    generateUIbyData(type: 'self' | 'otherplayers', table: Node, cols: number, rows: number, mapData: Map<number, MatchingCell>) {
        // let table = this.node.getChildByName('table')
        let sample = type === 'self' ? this.node.getChildByName('matchingCell') : this.node.getChildByName('matchingCellbyOthers')
        const { width: tableWidth, height: tableHeight } = table.getComponent(UITransform);
        const cellSize = Math.min(tableWidth / cols, tableHeight / rows);
        if (type === 'self') {
            this.cellHeight = cellSize;
            this.cellWidth = cellSize;
        }
        table.children.forEach(child => child.destroy())

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const id = i * cols + j;
                const cellData = mapData.get(id)
                const cell = instantiate(sample);
                if (cellData.isMatched || cellData.isEmpty) cell.active = false;
                cell.getComponent(UITransform).width = cellSize;
                cell.getComponent(UITransform).height = cellSize;
                cell.parent = table;
                cell.name = cellData.id.toString();

                cell.getChildByName('icon').getComponent(Sprite).spriteFrame = this.spriteFrames.get(cellData.typeId);
                // cell.getChildByName('label').getComponent(Label).string = cellData.typeId.toString();// id用于测试 注意label被删掉了
                cell.position = new Vec3(-tableWidth / 2 + cellSize / 2 + j * cellSize, tableHeight / 2 - cellSize / 2 - i * cellSize)
                if (type === 'self') {
                    cell.on(Node.EventType.TOUCH_END, (e: any) => this.onClickCell(e, cellData.id), this)
                }
            }
        }
    }

    // TODO: 其他用户数据发生变化后更新UI
    updateOthersTable() {

    }

    updateMatchingTable(keys: number[]) {
        const matchingNodes = this.node.getChildByName('table').children
        keys.forEach((key,) => {
            if (matchingNodes[key]) { matchingNodes[key].active = false }
        })
    }

    onClickHint() {
        if (this.gameStatus !== GAMESTATUS.PLAYING) return
        this.showLink(this.matchingLink, 1)
    }


    onClickCell(e: any, mapId: number) {
        if (this.gameStatus !== GAMESTATUS.PLAYING) return

        const clickCell: MatchingCell = this.matchingData.mapData.get(mapId)

        if (clickCell.isMatched || clickCell.isEmpty) return

        if (clickCell.id === this.lastClickedCell?.id) {
            this.setLastClickedCell(null)
            return
        }

        if (clickCell.typeId !== this.lastClickedCell?.typeId) {
            this.setLastClickedCell(clickCell)
            return
        }

        const result = this.checkCanMatchWithRoute(this.lastClickedCell.id, clickCell.id)
        if (result.matched) {
            this.timeLeft = TIMELIMIT
            // 更新MatchingData、MatchingArray、UI，检查是否成死局
            this.showLink(result.route, 0.3)
            // console.log('已连接id', this.lastClickedCell.id, clickCell.id)
            this.updateMatchingArray([this.lastClickedCell.id, clickCell.id], [-1, -1])
            this.updateMatchingData([this.lastClickedCell.id, clickCell.id])
            this.updateMatchingTable([this.lastClickedCell.id, clickCell.id])

            if (this.isGameEnd()) {
                this.setGameStatus(GAMESTATUS.WIN)
                console.log('游戏结束')
            } else {
                this.checkTableStatus()
            }
            // TODO: 发送更新后台数据请求
            this.setLastClickedCell(null)
        } else {
            this.setLastClickedCell(clickCell)
        }
    }

    shuffleTable() {
        if (this.gameStatus !== GAMESTATUS.PLAYING && this.gameStatus !== GAMESTATUS.PENDING) return
        const { cols, rows, mapData } = this.matchingData
        let keys = Array.from(mapData.keys());
        let values = Array.from(mapData.values()).map(item => JSON.parse(JSON.stringify(item))).filter(value => !value.isEmpty && !value.isMatched)
        shuffleArray(values)

        let valueIndex = 0
        for (let i = 0; i < keys.length; i++) {
            if (mapData.get(keys[i]).isEmpty || mapData.get(keys[i]).isMatched) continue;
            mapData.get(keys[i]).typeId = values[valueIndex].typeId
            mapData.get(keys[i]).type = values[valueIndex].type
            valueIndex++
        }


        // 重置状态！
        this.setGameStatus(GAMESTATUS.PLAYING)
        this.lastClickedCell = null
        this.matchingLink = []
        this.initMatchingArray()
        this.generateUIbyData('self', this.node.getChildByName('table'), cols, rows, mapData)
        // console.log('重置状态！', mapData, this.matchingArray)

        if (!this.checkTableCanMatch()) {
            this.shuffleTable()
        }
    }

    // 提示线
    showLink(route: { x: number, y: number }[], timeout: number = 1) {
        let table = this.node.getChildByName('table');
        const { cols, rows } = this.matchingData;
        const { width: tableWidth, height: tableHeight } = table.getComponent(UITransform);
        const cellSize = Math.min(tableWidth / cols, tableHeight / rows);

        let graphicsNode = this.node.getChildByName('graphicsLink');
        let graphics = graphicsNode.getComponent(Graphics);
        graphics.clear();

        if (route.length > 0) {
            let firstPoint = this.convertPointToPosition(route[0], cellSize, tableWidth, tableHeight);
            graphics.moveTo(firstPoint.x, firstPoint.y);

            route.slice(1).forEach(point => {
                let worldPos = this.convertPointToPosition(point, cellSize, tableWidth, tableHeight);
                graphics.lineTo(worldPos.x, worldPos.y);
            });
            graphics.stroke();
        }

        this.startFadeOut(graphicsNode, timeout, () => { graphics.clear() })
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

    // 检查连连看是否死局
    checkTableStatus() {
        if (!this.checkTableCanMatch()) {
            this.setGameStatus(GAMESTATUS.PENDING)
            console.log('成死局')
            this.shuffleTable()
            // TODO: 发送更新后台数据请求
        }
    }

    setLastClickedCell(clickedCell: MatchingCell | null) {
        // 取消之前的高亮 无论有没有新的
        if (this.lastClickedCell !== null) {
            let graphics = this.node.getChildByName('table')?.children[this.lastClickedCell.id]?.getChildByName('bg')?.getComponent(Graphics)
            drawBackgroundBlock(graphics, -this.cellHeight / 2, -this.cellWidth / 2, this.cellHeight, this.cellWidth)
        }
        // 设置新的高亮
        if (clickedCell !== null) {
            let graphics = this.node.getChildByName('table')?.children[clickedCell.id]?.getChildByName('bg')?.getComponent(Graphics)
            drawHighlightBlock(graphics, -this.cellHeight / 2, -this.cellWidth / 2, this.cellHeight, this.cellWidth)
        }
        this.lastClickedCell = clickedCell
    }

    setGameStatus(status: String) {
        this.gameStatus = status;
        this.node.getChildByName('status').getComponent(Label).string = status.toString();
        switch (status) {
            case GAMESTATUS.PLAYING:

                break;
            case GAMESTATUS.PENDING:

                break;
            case GAMESTATUS.LOSE:

                break;
            case GAMESTATUS.WIN:

                break;
            default:
                break;
        }
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

    isGameEnd() {
        for (let i = 0; i < this.matchingArray.length; i++) {
            for (let j = 0; j < this.matchingArray[i].length; j++) {
                if (this.matchingArray[i][j] !== -1) {
                    return false
                }
            }
        }
        return true
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

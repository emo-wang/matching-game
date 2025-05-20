import { _decorator, director, resources, Component, UITransform, instantiate, Vec3, Node, Graphics, UIOpacity, tween, Sprite, SpriteFrame, ProgressBar, Label, game, Color } from 'cc';
import { MatchingData, MatchingCell, shuffleArray, convertDataForClient } from './utils/data/initMatchingData';
import { ConfirmDialog } from './utils/prefabScirpts/confirmDialog';
import { Toast } from './utils/prefabScirpts/ToastPop';
import { DataManager } from './utils/functions/dataManager';
import AuthManager from './utils/data/AuthManager';
import fetchAPI from './utils/functions/fetch';
const { ccclass, property } = _decorator;

const GAMESTATUS = {
    WAITING: 'waiting',
    PAUSE: 'pause',
    PLAYING: 'playing',
    ENDED: 'ended',
}

const TIMELIMIT = 60

@ccclass('MatchingGame')
export class MatchingGame extends Component {
    private ws: WebSocket | null = null;
    gameData: any = null; // 用于发给服务端的
    matchingData: MatchingData = null; // 页面显示数据
    matchingArray = null // 用于处理逻辑，除了数据周围还有一圈-1的格子
    matchingLink = [] // 提示线
    lastClickedCell: MatchingCell | null = null // 上一次点击的格子
    spriteFrames: Map<number, SpriteFrame> = new Map();
    gameStatus: String = GAMESTATUS.WAITING
    cellHeight: number = 0; // 目前是正方形
    cellWidth: number = 0; // 目前是正方形
    timeLeft: number = TIMELIMIT; // 剩余时间
    combos: number = 0; // 连续消除
    room_id: string = '' // room uuid
    isReadyToPlay: boolean = false; //当前玩家是否已准备开始游戏

    @property(Graphics) private graphicsLink: Graphics = null!

    @property(Label) private playerInfoLabel: Label = null!
    @property(Label) private roomInfoLabel: Label = null!
    @property(Node) private OthersTable: Node = null!
    @property(Node) private Table: Node = null!
    @property(Node) private MatchingCellSample: Node = null!
    @property(Node) private OthersMatchingCellSample: Node = null!
    @property(Node) private GameStatusNode: Node = null!
    @property(Node) private GameTimeBarNode: Node = null!
    @property(Label) private Username: Label = null!
    @property(Node) private Info: Node = null!
    @property(Label) private ReadyButtonLabel: Label = null!

    // global msg
    @property(Node) private ToastPopNode: Node = null!

    update(dt: number): void {
        switch (this.gameStatus) {
            case GAMESTATUS.PLAYING:
                // TODO: set time limit
                // this.timeLeft -= dt;
                this.GameTimeBarNode.getComponent(ProgressBar).progress = this.timeLeft / TIMELIMIT;
                if (this.timeLeft <= 0) {
                    this.setGameStatus(GAMESTATUS.ENDED);
                }
                break;
            case GAMESTATUS.WAITING:

            default:
                break;
        }
    }

    onLoad() {
        const roomInfo = DataManager.instance.get('roomInfo');
        this.room_id = roomInfo.room_id
        console.log('Enter Room', roomInfo);
    }

    start() {
        this.loadGameResources(() => {
            this.initWebSocket();
            this.initGameLogic();
            this.initPlayerInfo();
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

    initPlayerInfo() {
        this.Username.string = AuthManager.getUser()?.username
    }

    initGameTable() {
        const { cols, rows, mapData } = this.matchingData
        this.generateUIbyData('self', this.Table, cols, rows, mapData)
    }

    updateGameTable(keys: number[]) {
        const matchingNodes = this.Table.children
        keys.forEach((key,) => {
            if (matchingNodes[key]) { matchingNodes[key].active = false }
        })
    }

    updateOtherPlayersTable(pArr: [number, number][], userId: string) {
        const otherPlayers: any[] = this.gameData.players.filter((player: any) => player.userId !== AuthManager.getUser()._id)

        otherPlayers.forEach((player: any, i: number) => {
            if (player.userId === userId) {
                let keys: number[] = []
                for (let i = 0; i < pArr.length; i++) {
                    keys.push(this.convertXYtoId(pArr[i]))
                }
                const matchingNodes = this.OthersTable.children[i].getChildByName('table').children
                keys.forEach((key,) => {
                    if (matchingNodes[key]) { matchingNodes[key].active = false }
                })
            }
        })
    }

    initOtherPlayersTable() {
        const otherPlayers: any[] = this.gameData.players.filter((player: any) => player.userId !== AuthManager.getUser()._id)

        otherPlayers.forEach((player: any, i: number) => {
            // WARNING: 这里没有深拷贝的，考虑到也就是用于生成UI，更新UI也只是根据节点顺序，不会有后续牵连
            const { cols, rows, mapData } = convertDataForClient(player.gameBoard)
            let table = this.OthersTable.children[i].getChildByName('table')
            // table.name = player.userId
            this.generateUIbyData('otherplayers', table, cols, rows, mapData)
            // 设置用户信息
            this.OthersTable.children[i].getChildByName('PlayerInfo').getChildByName('Text_Name').getComponent(Label).string = player.username
        })
    }

    initGameLogic() {
        this.setGameStatus(GAMESTATUS.WAITING)
    }

    initWebSocket() {
        // TODO: 把地址添加到config中
        this.ws = new WebSocket('ws://localhost:4001');

        this.ws.onopen = () => {
            console.log('game WebSocket 连接成功');
        };

        this.ws.onmessage = (event) => {
            const wsdata = JSON.parse(event.data)
            console.log('gamews:', wsdata);
            // 当前玩家的gameBoard
            // let gameBoard = []

            switch (wsdata.type) {
                // 连接上ws之后发送enter-room
                case 'welcome':
                    this.ws.send(JSON.stringify({
                        type: 'enter-room',
                        message: 'request to enter room',
                        data: {
                            roomId: this.room_id,
                            userId: AuthManager.getUser()._id
                        }
                    }));
                    break;

                case 'player-exit':
                    // 有玩家退出，自己退出会关闭ws所以不会触发
                    this.updateRoomDisplay(wsdata.data)
                    break;

                case 'player-ready':
                    wsdata.data.players.forEach((player: any) => {
                        if (player.userId === AuthManager.getUser()._id) {
                            this.isReadyToPlay = player.isReady
                        }
                    })
                    this.updateRoomDisplay(wsdata.data)
                    break;

                case 'enter-room':
                    // 有任何玩家进入房间都会触发enter-room，自己进入也会触发
                    this.updateRoomDisplay(wsdata.data)

                    break;

                case 'start-game':
                    this.gameData = wsdata.data
                    let gameBoard = wsdata.data.players.find((player: any) => player.userId === AuthManager.getUser()._id).gameBoard
                    this.matchingData = convertDataForClient(gameBoard)
                    this.initGameTable();
                    this.initMatchingArray();
                    this.timeLeft = TIMELIMIT
                    this.setGameStatus(GAMESTATUS.PLAYING)
                    this.checkTableStatus();
                    this.initOtherPlayersTable();
                    break;

                case 'update-game':
                    // 更新逻辑，自己的操作是本地完成（包括消除和结束游戏），然后将操作发送到ws，让其他玩家更新状态。
                    const { pArr, userId, isEnded } = wsdata.data

                    // update gameData(others)
                    this.gameData.players.forEach((player: any) => {
                        if (player.userId === userId) {
                            for (let i = 0; i < pArr.length; i++) {
                                const [x, y] = pArr[i]
                                player.gameBoard[x][y] = -1
                            }
                        }
                    })
                    this.updateOtherPlayersTable(pArr, userId)
                    if (isEnded) {
                        this.setGameStatus(GAMESTATUS.ENDED)
                    }
                    break;

                case 'pause-game':
                    this.setGameStatus(GAMESTATUS.PAUSE)
                    // TODO:暂停游戏
                    break;

                case 'end-game':
                    this.setGameStatus(GAMESTATUS.ENDED)
                    // TODO:结束游戏
                    break;

                default:
                    break;
            }
        };

        this.ws.onclose = () => {
            director.loadScene('LobbyScene')
            console.log('WebSocket 连接关闭');
        };

        this.ws.onerror = (event) => {
            console.error('WebSocket 错误:', event);
        };
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
        // console.log('生成matchingArray', this.matchingArray)
    }

    updateMatchingArray(keys: number[], values: number[]) {
        keys.forEach((key, index) => {
            const [x, y] = this.convertIdtoPos(key)
            this.matchingArray[x][y] = values[index]
        })
        // console.log('更新matchingArray', this.matchingArray)
    }

    // TODO: 优化
    generateUIbyData(type: 'self' | 'otherplayers', table: Node, cols: number, rows: number, mapData: Map<number, MatchingCell>) {
        // let table = this.Table
        let sample = type === 'self' ? this.MatchingCellSample : this.OthersMatchingCellSample
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

    updateRoomDisplay(roomData: any) {
        const { roomId, status, config, players } = roomData;
        this.setGameStatus(status)

        // for (let i = 0; i < this.OthersTable.children.length; i++) {
        //     this.OthersTable.children[i].active = false
        // }

        let index = 0
        players.forEach((player: any) => {
            if (player.userId !== AuthManager.getUser()._id) {
                // this.OthersTable.children[index].active = true
                const playerInfoNode: Node = this.OthersTable.children[index].getChildByName('PlayerInfo')
                const status: Node = this.OthersTable.children[index].getChildByName('Status')
                playerInfoNode.getChildByName('Text_Name').getComponent(Label).string = player.username
                // avatar
                status.getChildByName('Ready').active = player.isReady
                status.getChildByName('NotReady').active = !player.isReady
                index++
            } else {
                const status: Node = this.Info.getChildByName('Status')
                status.getChildByName('Ready').active = player.isReady
                status.getChildByName('NotReady').active = !player.isReady
            }
        });
    }

    onClickHint() {
        if (this.gameStatus !== GAMESTATUS.PLAYING) return
        this.showLink(this.matchingLink, 1)
    }

    async onClickExit() {
        if (!this.room_id) {
            this.ToastPopNode.getComponent(Toast)?.show("RoomId is null", 2);
            return;
        }
        ConfirmDialog.show(undefined, 'Are you sure you want to exit the room.', undefined, undefined,
            async () => {
                await this.exitRoom({ roomId: this.room_id })
                this.ws.close()
                this.room_id = null
                DataManager.instance.set('roomInfo', {
                    room_id: null
                });
                director.loadScene('LobbyScene')
            })
    }

    onClickReady() {
        if (this.gameStatus === 'playing') {
            this.ToastPopNode.getComponent(Toast)?.show("Game is playing.", 2);
            return;
        }
        this.sendPlayerReady(!this.isReadyToPlay)
        this.isReadyToPlay = !this.isReadyToPlay
        this.ReadyButtonLabel.string = this.isReadyToPlay ? 'CANCEL READY' : 'READY'
    }

    onClickPauseGame() {
        this.sendGamePause()
    }

    onClickEndGame() {
        this.sendGameEnd()
    }

    onClickStartGame() {
        this.sendGameStart()
    }

    onClickRestartGame() {
        if (this.gameStatus === GAMESTATUS.PLAYING || this.gameStatus === GAMESTATUS.PAUSE) return
        this.setGameStatus(GAMESTATUS.PAUSE)
        this.matchingLink = []
        this.lastClickedCell = null
        this.initGameLogic()
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
            this.updateGameTable([this.lastClickedCell.id, clickCell.id])

            const p1: [number, number] = this.convertIdtoXY(this.lastClickedCell.id)
            const p2: [number, number] = this.convertIdtoXY(clickCell.id)

            if (this.isGameEnd()) {
                this.sendGameUpdate([p1, p2], true)
                this.setGameStatus(GAMESTATUS.ENDED)
                console.log('Game is ended')
            } else {
                this.sendGameUpdate([p1, p2], false)
                this.checkTableStatus()
            }

            this.setLastClickedCell(null)
        } else {
            this.setLastClickedCell(clickCell)
        }
    }

    shuffleTable() {
        if (this.gameStatus !== GAMESTATUS.PLAYING && this.gameStatus !== GAMESTATUS.PAUSE) return
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
        this.generateUIbyData('self', this.Table, cols, rows, mapData)
        // console.log('重置状态！', mapData, this.matchingArray)

        if (!this.checkTableCanMatch()) {
            this.shuffleTable()
        }
    }

    showLink(route: { x: number, y: number }[], timeout: number = 1) {
        let table = this.Table;
        const { cols, rows } = this.matchingData;
        const { width: tableWidth, height: tableHeight } = table.getComponent(UITransform);
        const cellSize = Math.min(tableWidth / cols, tableHeight / rows);

        // let graphicsNode = this.node.getChildByName('graphicsLink');
        let graphics = this.graphicsLink
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

        this.startFadeOut(this.graphicsLink.node, timeout, () => { graphics.clear() })
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

    checkTableStatus() {
        if (!this.checkTableCanMatch()) {
            this.setGameStatus(GAMESTATUS.PAUSE)
            console.log('成死局')
            this.shuffleTable()
            // TODO: 发送更新后台数据请求
        }
    }

    setLastClickedCell(clickedCell: MatchingCell | null) {
        // 取消之前的高亮 无论有没有新的
        if (this.lastClickedCell !== null) {
            let sprite = this.Table?.children[this.lastClickedCell.id]?.getChildByName('bg')?.getComponent(Sprite)
            sprite.color = new Color('FFFFFF')
        }
        // 设置新的高亮
        if (clickedCell !== null) {
            let sprite = this.Table?.children[clickedCell.id]?.getChildByName('bg')?.getComponent(Sprite)
            sprite.color = new Color('DC81FF')
        }
        this.lastClickedCell = clickedCell
    }

    setGameStatus(status: String) {
        this.gameStatus = status;
        this.GameStatusNode.getComponent(Label).string = status.toString();
        switch (status) {
            case GAMESTATUS.PLAYING:
                this.OthersTable.children.forEach(el => {
                    // reset
                    el.getChildByName('Status').getChildByName('Ready').active = false
                    el.getChildByName('Status').getChildByName('NotReady').active = true
                    el.getChildByName('Status').active = false
                });
                this.Info.getChildByName('Status').getChildByName('Ready').active = false
                this.Info.getChildByName('Status').getChildByName('NotReady').active = true
                this.Info.getChildByName('Status').active = false

                break;
            case GAMESTATUS.PAUSE:

                break;
            case GAMESTATUS.ENDED:
                this.OthersTable.children.forEach(el => {
                    el.getChildByName('Status').active = true
                });
                this.Info.getChildByName('Status').active = true
                break;
            case GAMESTATUS.WAITING:

                break;
            default:
                break;
        }
    }

    //————————————————————————请求接口———————————————————————————————————————

    async exitRoom(body: any): Promise<any> {
        return await fetchAPI('/game/exit', { method: 'POST', body });
    }

    sendGamePause() {
        if (!this.room_id) {
            console.log('room_id is null')
            return
        }
        this.ws.send(JSON.stringify({
            type: 'pause-game',
            message: 'request to pause game',
            data: {
                roomId: this.room_id
            }
        }));
    }

    sendGameEnd() {
        if (!this.room_id) {
            console.log('room_id is null')
            return
        }
        this.ws.send(JSON.stringify({
            type: 'end-game',
            message: 'request to end game',
            data: {
                roomId: this.room_id
            }
        }));
    }

    sendGameStart() {
        if (!this.room_id) {
            console.log('room_id is null')
            return
        }
        this.ws.send(JSON.stringify({
            type: 'start-game',
            message: 'request to start game',
            data: {
                roomId: this.room_id
            }
        }));
    }

    sendGameUpdate(pArr: [number, number][], isEnded: boolean) {
        this.ws.send(JSON.stringify({
            type: 'update-game',
            message: 'request to update game',
            data: {
                roomId: this.room_id,
                isEnded,
                userId: AuthManager.getUser()._id,
                // [x, y]
                eliminatedNode: pArr
            }
        }));
    }

    sendPlayerReady(isReady: boolean) {
        if (!this.room_id || !AuthManager.getUser()._id) {
            console.log('room_id or user_id is null')
            return
        }
        this.ws.send(JSON.stringify({
            type: 'player-ready',
            message: 'player ready or cancel ready',
            data: {
                isReady,
                roomId: this.room_id,
                userId: AuthManager.getUser()._id,
            }
        }));
    }

    //——————————————————————————————————————————————————————————————————————


    //————————————————————————以下为一些功能性函数————————————————————————————


    // TODO: 这个功能有问题，需要封装一下，逐渐消失
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

    // 把id转换成服务器数组中的坐标
    convertIdtoXY(id: number): [number, number] {
        return [Math.floor(id / this.matchingData.cols), (id % this.matchingData.cols)];
    }

    // 把坐标转换成服务器数组中的id
    convertXYtoId([x, y]: [number, number]): number {
        return x * this.matchingData.cols + y;
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

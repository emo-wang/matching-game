import { _decorator, resources, SpriteFrame, director, Component, instantiate, Label, Color, Node, Sprite, Toggle, EditBox } from 'cc';
import { ConfirmDialog } from './utils/prefab/confirmDialog';
import fetchAPI from './utils/func/fetch';
import { DataManager } from './utils/func/dataManager';
const { ccclass, property } = _decorator;

// TODO: 从配置中获取
const FONTSIZE = 18

interface CreateRoomSchema {
    roomName: string; // 房间名
    roomOwnerId: string; // 创建者id
    maxPlayerCount?: number; // 最大玩家数量
    playerList?: string[]; // 玩家id列表
    isPlaying?: boolean; // 是否为开始游戏
    isPrivate: boolean; // 是否为私密房间
    password?: string; // 房间密码
    mapType: number; // 地图类型
}

@ccclass('GameLobby')
export class GameLobby extends Component {
    roomList = []
    curRoomId: number = null // 这个是index，不是指房间id
    room_id: string = '' // 房间uuid
    createRoomForm: CreateRoomSchema

    // createroom form nodes(绑定的是input(editbox)， toggle)
    @property(Node) private roomFormNode: Node = null!;
    @property(Node) private roomNameNode: Node = null!;
    @property(Node) private maxPlayerCountNode: Node = null!;
    @property(Node) private isPrivateNode: Node = null!;
    @property(Node) private mapTypeNode: Node = null!;
    @property(Node) private passwordNode: Node = null!;
    @property(Node) private errorMsgNode: Node = null!;

    onLoad() {
        console.log(this.node, 'GameLobby 场景加载成功')
    }

    start() {
        this.loadGameResources(() => {
            this.initUserInfo();
            this.initGameLobby();
            this.genCreateRoomForm()
        });
    }

    // TODO: 迁移到进入游戏
    loadGameResources(callback: Function) {
        const spriteFrames = globalThis?.assets?.matchingCellSpriteFrames

        if (spriteFrames) {
            if (callback) callback();
            return
        }

        resources.loadDir('sprites/matchingicons', SpriteFrame, (err, assets) => {
            if (err) {
                console.error('文件夹加载出错', err);
            }

            assets.sort((a, b) => parseInt(a.name) - parseInt(b.name)); // 排序

            assets.forEach((asset, index) => {
                globalThis.assets = globalThis.assets || {}
                globalThis.assets.matchingCellSpriteFrames = globalThis.assets.matchingCellSpriteFrames || new Map<number, SpriteFrame>;
                globalThis.assets.matchingCellSpriteFrames.set(index, asset as SpriteFrame);
            });
            // console.log('首次加载游戏资源成功', globalThis.assets)

            if (callback) callback();
        });
    }

    async getLobby(): Promise<any> {
        return await fetchAPI('/lobbies');
    }

    async postLobby(body: any): Promise<any> {
        return await fetchAPI('/lobbies', { method: 'POST', body });
    }

    async initGameLobby() {
        const res = await this.getLobby()
        this.roomList = res
        this.addEventListener()
        this.genUIbyLobbyData()
    }

    addEventListener() {
    }

    onClickCreateRoom(e: Event) {
        this.node.getChildByName('CreateRoom').active = true
    }

    onClickJoinRoom(e: Event) {
        if (!this.room_id) return
        ConfirmDialog.show(`确认要加入这个房间吗？`, `房间id: ${this.curRoomId}`, undefined, undefined, () => this.joinRoom(this.room_id), undefined)
    }

    async onClickConfirmCreateRoom() {

        const roomName = this.roomNameNode.getComponent(EditBox).string
        const maxPlayerCount = Number(this.maxPlayerCountNode.getComponent(EditBox).string)
        const isPrivate = this.isPrivateNode.getChildByName('Toggle1')!.getComponent(Toggle)!.isChecked
        let mapType = 1
        this.mapTypeNode.children.forEach((item, index) => {
            if (item.getComponent(Toggle).isChecked) {
                mapType = index + 1
            }
        })
        const password = this.passwordNode.getComponent(EditBox).string

        // validate
        if (!roomName) {
            this.errorMsgNode.getComponent(Label).string = '房间名不能为空'
            return
        }

        if (isPrivate && !password) {
            this.errorMsgNode.getComponent(Label).string = '私密房间需要设置房间密码'
            return
        }
        
        this.errorMsgNode.getComponent(Label).string = ''

        let roomInfo: CreateRoomSchema = {
            roomName,
            roomOwnerId: 'Nora',
            maxPlayerCount,
            isPrivate,
            mapType,
            password
        }

        const res = await this.postLobby(roomInfo)
        this.node.getChildByName('CreateRoom').active = false

        if (!res._id) return
        this.room_id = res._id
        this.joinRoom(this.room_id)
    }

    onIsPrivateToggleChanged(toggle: Toggle, customEventData: string) {
        if (customEventData === 'yes') {
            // console.log("yes, 私密房间");
            this.passwordNode.parent.active = true
        } else {
            // console.log("no, 非私密房间");
            this.passwordNode.parent.active = false
        }
    }

    onClickCancelCreateRoom() {
        this.node.getChildByName('CreateRoom').active = false
    }

    onClickRefresh() { }

    onClickLogIn() {
        // TODO: 跳转到登录界面
    }

    onClickLogOut() {
        // TODO: 跳转到登出界面
        // TODO: 移除本地数据
        // TODO: 跳转到首页
    }

    joinRoom(room_id: string) {
        DataManager.instance.set('roomInfo', {
            room_id
        });
        director.loadScene('RoomScene')
    }

    genUIbyLobbyData(type: string = 'init') {
        if (this.roomList.length === 0) return;

        // display column
        const displayedTitle = ['Room Name', 'PlayerCount', 'MaxPlayerCount', 'Game Status', 'Is Private Room']
        const displayedData = this.roomList.map((room: any) => ({
            name: room.roomName,
            curPlayerCount: room.playerList.length,
            maxPlayerCount: room.maxPlayerCount,
            isPlaying: room.isPlaying,
            isPrivate: room.isPrivate,
        }))

        const sv = this.node.getChildByName('roomScrollView');

        if (type === 'init') {
            // add titles
            Object.keys(displayedData[0]).forEach((columnName: string, index) => {
                let titleNode = new Node(columnName);
                titleNode.name = columnName
                titleNode.addComponent(Label).string = displayedTitle[index]
                titleNode.getComponent(Label).fontSize = FONTSIZE
                sv.getChildByName('titles').addChild(titleNode)
            });
            // add RoomList
            let roomSample = sv.getChildByName('view').getChildByName('content').getChildByName('roomSample')
            displayedData.forEach((item: any, index) => {
                let roomNode = instantiate(roomSample)
                roomNode.name = index.toString() // index
                // roomNode.name = room.id.toString() // mongoBD id
                Object.keys(item).forEach((key: string) => {
                    let detailNode = new Node(item + key)
                    detailNode.addComponent(Label).string = item[key]
                    detailNode.getComponent(Label).fontSize = FONTSIZE
                    roomNode.addChild(detailNode)
                })
                sv.getChildByName('view').getChildByName('content').addChild(roomNode)
                roomNode.on(Node.EventType.TOUCH_END, (e: any) => this.clickRoom(e, index, this.roomList[index]._id), this)
            });
            roomSample.active = false
        }
    }

    initUserInfo() {

    }

    genCreateRoomForm() {

    }

    /**
     * 
     * @param e 
     * @param roomIndex 房间index
     * @param roomId 房间id
     * @returns 
     */
    clickRoom(e: Event, roomIndex: number, roomId: string) {
        const selColor = new Color(255, 182, 193, 140);
        const unselColor = new Color(140, 140, 140, 140);
        let svContent = this.node.getChildByName('roomScrollView').getChildByName('view').getChildByName('content')

        if (this.curRoomId === roomIndex) {
            svContent.getChildByName(this.curRoomId.toString()).getComponent(Sprite).color = unselColor;
            this.curRoomId = null;
            return;
        }

        if (this.curRoomId !== null) {
            svContent.getChildByName(this.curRoomId.toString()).getComponent(Sprite).color = unselColor;
        }
        this.room_id = roomId
        this.curRoomId = roomIndex;
        svContent.getChildByName(this.curRoomId.toString()).getComponent(Sprite).color = selColor;
    }

}
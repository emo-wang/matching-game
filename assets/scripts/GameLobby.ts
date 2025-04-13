import { _decorator, resources, SpriteFrame, director, Component, instantiate, Label, Color, Node, Sprite, EventTouch } from 'cc';
import { ConfirmDialog } from './utils/prefab/confirmDialog';
import fetchAPI from './utils/fetch';
import { FormGenerator, FormSchemaItem } from './utils/prefab/formGenerator';
const { ccclass, property } = _decorator;

// TODO: 从配置中获取
const FONTSIZE = 18

// TODO: 根据数据自动生成
// WARN: 目前表单不是根据schema自动生成的，需要手动修改
const formSchema: FormSchemaItem[] = [
    { label: '房间名', key: 'name', type: 'text', required: true },
    { label: '最大玩家数量', key: 'maxPlayerCount', type: 'number', required: false, defaultValue: 6 },
    { label: '是否为私密房间', key: 'isPrivate', type: 'toggle', required: true },
    { label: '地图类型', key: 'mapType', type: 'number', required: true, defaultValue: 1 },
];

@ccclass('GameLobby')
export class GameLobby extends Component {
    roomList = []
    curRoomId: number = null // 这个是index，不是指房间id
    formGenerator: FormGenerator = null!;

    onLoad() {
        console.log(this.node, 'GameLobby 场景加载成功')
    }

    start() {
        this.loadGameResources(() => {
            this.initGameLobby();
            this.initFormGenerator()
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

    async getLobby() {
        const res = await fetchAPI('/lobbies');
        this.roomList = res;
    }

    async postLobby(body: any) {
        const res = await fetchAPI('/lobbies', {
            method: 'POST',
            body
        });
        console.log(res)
    }

    async initGameLobby() {
        await this.getLobby()
        this.addEventListener()
        this.generateUIbyLobbyData()
    }

    addEventListener() {
        const btns = this.node.getChildByName('btns')
        btns.getChildByName('createRoom').on(Node.EventType.TOUCH_END, this.onClickCreateRoom, this)
        btns.getChildByName('joinRoom').on(Node.EventType.TOUCH_END, this.onClickJoinRoom, this)
        btns.getChildByName('refresh').on(Node.EventType.TOUCH_END, this.onClickRefresh, this)

        const formBtns = this.node.getChildByName('CreateRoom').getChildByName('btns')
        formBtns.getChildByName('confirm').on(Node.EventType.TOUCH_END, this.onClickConfirmCreateRoom, this)
        formBtns.getChildByName('cancel').on(Node.EventType.TOUCH_END, this.onClickCancelCreateRoom, this)
    }

    onClickCreateRoom(e: Event) {
        this.node.getChildByName('CreateRoom').active = true
    }

    onClickJoinRoom(e: Event) {
        if (this.curRoomId === null) return
        ConfirmDialog.show(`确认要加入这个房间吗？`, `房间id: ${this.curRoomId}`, undefined, undefined, this.joinRoom, undefined)
    }

    async onClickConfirmCreateRoom() {
        // const formGen = this.node.getChildByName('CreateRoom').getChildByName('CreateRoomForm').getComponent(FormGenerator);
        // if (formGen.validateForm().length > 0) {
        //     console.log(formGen.validateForm())
        //     return;
        // }
        // const collectedFormData = formGen.collectFormData()
        // console.log(collectedFormData)
        let roomInfo = {
            name: 'test room',
            maxPlayerCount: 6,
            isPrivate: true,
            mapType: 1,
            isPlaying: false,
            playerList: [],
        }

        await this.postLobby(roomInfo)
        this.node.getChildByName('CreateRoom').active = false
        await this.getLobby()
    }

    onClickCancelCreateRoom() {
        this.node.getChildByName('CreateRoom').active = false
    }

    joinRoom() {
        director.loadScene('RoomScene')
    }

    onClickRefresh() { }

    generateUIbyLobbyData(type: string = 'init') {
        if (this.roomList.length === 0) return;

        // display column
        const displayedTitle = ['room name', 'playerCount', 'maxPlayerCount', 'status', 'isPrivate']
        const displayedData = this.roomList.map((room: any) => ({
            name: room.name,
            playerCount: room.playerList.length,
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
                roomNode.on(Node.EventType.TOUCH_END, (e: any) => this.clickRoom(e, index), this)
            });
            roomSample.active = false
        }



    }

    initFormGenerator() {
        this.formGenerator = this.node.getChildByName('CreateRoom').getChildByName('CreateRoomForm').getComponent(FormGenerator);
        this.formGenerator.setSchema(formSchema)
        this.formGenerator.generateForm(formSchema);
    }

    clickRoom(e: Event, roomIndex: number) {
        // 这里的roomId实际上是index
        // console.log('点击了房间:', roomId)
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

        this.curRoomId = roomIndex;
        svContent.getChildByName(this.curRoomId.toString()).getComponent(Sprite).color = selColor;

    }

}
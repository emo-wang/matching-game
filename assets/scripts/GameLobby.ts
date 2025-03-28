import { _decorator, Component, instantiate, Label, Color, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;

// TODO: 从配置中获取
const FONTSIZE = 18

// TODO: 从接口获取数据
const lobbyData = {
    roomList: [
        {
            id: 1,
            name: 'Room 1',
            playerCount: 2,
            maxPlayerCount: 6,
            status: 'playing',
            isPrivate: false,
        },
        {
            id: 2,
            name: 'Room 2',
            playerCount: 1,
            maxPlayerCount: 6,
            status: 'waiting',
            isPrivate: true,
        },
        {
            id: 3,
            name: 'Room 2',
            playerCount: 5,
            maxPlayerCount: 6,
            status: 'playing',
            isPrivate: false,
        },
    ],
}

@ccclass('GameLobby')
export class GameLobby extends Component {
    roomList = []
    curRoomId: number = null

    onLoad() {
        console.log(this.node, 'GameLobby 场景加载成功')
    }

    start() {
        this.initGameLobby();
    }

    initGameLobby() {
        this.roomList = lobbyData.roomList;
        this.initLobbyTableUI()
    }

    initLobbyTableUI() {
        if (this.roomList.length === 0) return;

        // add titles
        const sv = this.node.getChildByName('roomScrollView');
        Object.keys(this.roomList[0]).forEach((columnName: string) => {
            let titleNode = new Node(columnName);
            titleNode.name = columnName
            titleNode.addComponent(Label).string = columnName
            titleNode.getComponent(Label).fontSize = FONTSIZE
            sv.getChildByName('titles').addChild(titleNode)
        });

        // TODO: add button

        // add RoomList
        let roomSample = sv.getChildByName('view').getChildByName('content').getChildByName('roomSample')
        this.roomList.forEach((room: any) => {
            let roomNode = instantiate(roomSample)
            roomNode.name = room.id.toString()
            Object.keys(room).forEach((columnName: string) => {
                let detailNode = new Node(room + columnName)
                detailNode.addComponent(Label).string = room[columnName]
                detailNode.getComponent(Label).fontSize = FONTSIZE
                roomNode.addChild(detailNode)
            })
            sv.getChildByName('view').getChildByName('content').addChild(roomNode)
            roomNode.on(Node.EventType.TOUCH_END, (e: any) => this.clickRoom(e, room.id), this)
        });
        roomSample.active = false
    }

    clickRoom(e: any, roomId: number) {
        console.log('点击了房间:', roomId)
        const selColor = new Color(255, 182, 193, 140);
        const unselColor = new Color(140, 140, 140, 140);
        let svContent = this.node.getChildByName('roomScrollView').getChildByName('view').getChildByName('content')

        if (this.curRoomId === roomId) return

        if (this.curRoomId !== null) {
            svContent.getChildByName(this.curRoomId.toString()).getComponent(Sprite).color = unselColor;
        }
        this.curRoomId = roomId;
        svContent.getChildByName(this.curRoomId.toString()).getComponent(Sprite).color = selColor;
        // TODO: 跳转到 RoomScene

    }

}
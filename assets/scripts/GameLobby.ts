import { _decorator, Component, instantiate, Label, Layout, Node, UITransform, Widget } from 'cc';
const { ccclass, property } = _decorator;

// TODO: 从配置中获取
const FONTSIZE = 18
const ROOMHEIGHT = 40

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

        const sv = this.node.getChildByName('roomScrollView');
        // add titles
        Object.keys(this.roomList[0]).forEach((columnName: string) => {
            let titleNode = new Node(columnName);
            titleNode.addComponent(Label).string = columnName
            titleNode.getComponent(Label).fontSize = FONTSIZE
            sv.getChildByName('titles').addChild(titleNode)
        });

        // TODO: add button

        // add RoomList
        this.roomList.forEach((room: any) => {
            let roomNode = instantiate(sv.getChildByName('view').getChildByName('roomSample'))
            Object.keys(room).forEach((columnName: string) => {
                let detailNode = new Node(room + columnName)
                detailNode.addComponent(Label).string = room[columnName]
                detailNode.getComponent(Label).fontSize = FONTSIZE
                roomNode.addChild(detailNode)
            })
            sv.getChildByName('view').getChildByName('content').addChild(roomNode)
        });
    }

}
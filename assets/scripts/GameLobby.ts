import { _decorator, native, resources, SpriteFrame, director, Component, instantiate, Label, Color, Node, Sprite, Toggle, EditBox } from 'cc';
import { ConfirmDialog } from './utils/prefabScirpts/confirmDialog';
import fetchAPI from './utils/functions/fetch';
import { DataManager } from './utils/functions/dataManager';
import AuthManager from './utils/data/AuthManager';
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
    user_id: string = '' // 用户uuid


    // createroom form nodes
    createRoomForm: CreateRoomSchema
    @property(EditBox) private roomNameInput: EditBox = null!;
    @property(EditBox) private maxPlayerCountInput: EditBox = null!;
    @property(Toggle) private isPrivateToggle: Toggle = null!;
    @property(Node) private mapTypeNode: Node = null!;
    @property(EditBox) private passwordInput: EditBox = null!;
    @property(Label) private CreateRoomErrorMsgInput: Label = null!;

    // login/ logout
    loginMode: string = 'login' // create/login
    @property(Node) private createNewAccountNode: Node = null!;
    @property(Node) private BackToLoginNode: Node = null!;
    @property(Label) private title: Label = null!;
    @property(EditBox) private userNameInput: EditBox = null!;
    @property(EditBox) private userPasswordInput: EditBox = null!;
    @property(EditBox) private userEmailInput: EditBox = null!;
    @property(Label) private loginErrorMsgInput: Label = null!;

    // user info
    @property(Label) private username: Label = null!;
    @property(Sprite) private avater: Sprite = null!;
    @property(Node) private loginBtn: Node = null!;
    @property(Node) private logoutBtn: Node = null!;

    // global msg
    // TODO: 可以封装到基础类中
    @property(Label) private gErrorMsgLabel: Label = null!;
    @property(Label) private gSuccessMsgLabel: Label = null!;


    onLoad() {
        // console.log(this.node, 'GameLobby 场景加载成功')
    }

    start() {
        this.loadGameResources(() => {
            this.initGameLobby();
            this.initUserInfo();
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


    async initGameLobby() {
        const res = await this.getLobby()
        this.roomList = res
        this.genUIbyLobbyData()
    }

    initUserInfo() {
        console.log(AuthManager.getUser())
        if (!AuthManager.isLoggedIn()) {
            // TODO: 提醒用户登录
            this.setLogoutStatus()
            return
        }
        this.setLoginStatus()
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

    // ————————————onclick事件函数———————————

    onClickCreateRoom(e: Event) {
        this.node.getChildByName('CreateRoom').active = true
    }

    onClickJoinRoom(e: Event) {
        if (!this.room_id) return
        ConfirmDialog.show(`确认要加入这个房间吗？`, `房间id: ${this.curRoomId}`, undefined, undefined, () => this.joinRoom(this.room_id), undefined)
    }

    async onClickConfirmCreateRoom() {

        // get form data
        const roomName = this.roomNameInput.string
        const maxPlayerCount = Number(this.maxPlayerCountInput.string)
        const isPrivate = this.isPrivateToggle.isChecked
        let mapType = 1
        this.mapTypeNode.children.forEach((item, index) => {
            if (item.getComponent(Toggle).isChecked) {
                mapType = index + 1
            }
        })
        const password = this.passwordInput.string

        // validate form
        if (!roomName) {
            this.CreateRoomErrorMsgInput.string = '房间名不能为空'
            return
        }

        if (isPrivate && !password) {
            this.CreateRoomErrorMsgInput.string = '私密房间需要设置房间密码'
            return
        }

        this.CreateRoomErrorMsgInput.string = ''

        // send to server
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

    onClickCancelCreateRoom() {
        this.node.getChildByName('CreateRoom').active = false
    }

    onIsPrivateToggleChanged(toggle: Toggle, customEventData: string) {
        if (customEventData === 'yes') {
            this.passwordInput.node.parent.active = true
        } else {
            this.passwordInput.node.parent.active = false
        }
    }

    onClickRefresh() { }


    // ———————————————用户相关———————————————

    onClickLogIn() {
        this.node.getChildByName('LogInForm').active = true
    }

    // TODO: 错误处理
    // TODO: 成功处理
    async onClickConfirmLogIn() {
        console.log('确认登录/或者创建新账户', this.userNameInput.string, this.userPasswordInput.string, this.userEmailInput.string)
        // TODO： 前端做正则校验
        if (!this.userNameInput.string || !this.userPasswordInput.string) {
            this.loginErrorMsgInput.string = '用户名和密码不能为空'
            return
        }

        // 创建新用户
        if (this.loginMode === 'create') {
            if (!this.userEmailInput.string) {
                this.loginErrorMsgInput.string = '邮箱不能为空'
                return
            }
            else {
                const res = await this.createUser({
                    userName: this.userNameInput.string,
                    password: this.userPasswordInput.string,
                    email: this.userEmailInput.string
                })
                this.setGSuccessMsg("创建新用户成功 > o <! 请登录")
                this.resetLoginForm()
            }
        }

        // 登录用户
        else {
            const res = await this.login({
                userName: this.userNameInput.string,
                password: this.userPasswordInput.string
            })
            if (!res.user || !res.expiresIn || !res.token) {
                this.setGErrorMsg("返回用户数据错误！请检查网络或者重新登录")
                return
            }
            AuthManager.login(res)
            this.setLoginStatus()
            this.setGSuccessMsg("登录成功")
            this.onClickCancelLogIn()
        }
    }

    onClickCancelLogIn() {
        this.node.getChildByName('LogInForm').active = false
        this.resetLoginForm()
    }

    onClickLogOut() {
        // if (!this.user_id) return
        const callback = () => {
            AuthManager.logout()
            this.setLogoutStatus()
        }
        ConfirmDialog.show(`确定退出这个账号吗？`, `用户: ${this.username.string}`, undefined, undefined, callback, undefined)
    }

    onClickCreateNewAccount() {
        this.title.string = 'Create New Account'
        this.userEmailInput.node.parent.active = true
        this.loginMode = 'create'
        this.createNewAccountNode.active = false
        this.BackToLoginNode.active = true
        this.resetLoginInput()
    }

    onClickBackToLogin() {
        this.resetLoginForm()
    }

    resetLoginInput() {
        this.loginErrorMsgInput.string = ''
        this.userEmailInput.string = ''
        this.userNameInput.string = ''
        this.userPasswordInput.string = ''
    }

    resetLoginForm() {
        this.title.string = 'Login'
        this.userEmailInput.node.parent.active = false
        this.loginMode = 'login'
        this.createNewAccountNode.active = true
        this.BackToLoginNode.active = false
        this.resetLoginInput()
    }

    setLoginStatus() {
        const user = AuthManager.getUser()
        this.user_id = user._id
        this.username.string = user.userName
        this.loginBtn.active = false
        this.logoutBtn.active = true
    }

    setLogoutStatus() {
        AuthManager.logout()
        this.user_id = ""
        this.username.string = "游客"
        this.loginBtn.active = true
        this.logoutBtn.active = false
    }

    // —————————————————————————————————————


    // ————————————获取接口数据——————————————
    async getLobby(): Promise<any> {
        return await fetchAPI('/lobbies');
    }

    async postLobby(body: any): Promise<any> {
        return await fetchAPI('/lobbies', { method: 'POST', body });
    }

    async createUser(body: any): Promise<any> {
        return await fetchAPI('/users', { method: 'POST', body })
    }

    async login(body: any): Promise<any> {
        return await fetchAPI('/auth/login', { method: 'POST', body })
    }

    // —————————————————————————————————————


    // ————————————Global Msg ——————————————

    setGErrorMsg(text: string) {
        this.gErrorMsgLabel.string = text
        setTimeout(() => {
            this.gErrorMsgLabel.string = ""
        }, 5000);
    }

    setGSuccessMsg(text: string) {
        this.gSuccessMsgLabel.string = text
        setTimeout(() => {
            this.gSuccessMsgLabel.string = ""
        }, 5000);
    }

    // —————————————————————————————————————
}
import { _decorator, native, resources, SpriteFrame, director, Component, instantiate, Label, Color, Node, Sprite, Toggle, EditBox } from 'cc';
import { ConfirmDialog } from './utils/prefabScirpts/confirmDialog';
import { ErrorOverlay } from './utils/prefabScirpts/ErrorOverlay';
import fetchAPI from './utils/functions/fetch';
import { DataManager } from './utils/functions/dataManager';
import AuthManager from './utils/data/AuthManager';
const { ccclass, property } = _decorator;

// TODO: 从配置中获取
const FONTSIZE = 18

@ccclass('GameLobby')
export class GameLobby extends Component {
    private ws: WebSocket | null = null;
    roomList = [];
    room_id: string = '' // 房间uuid
    roomId: string = '' //房间id

    // roomList
    @property(Node) private RoomListContainer: Node = null!
    @property(Node) private RoomListItem: Node = null!
    @property(Node) private RoomListTitle: Node = null!

    // createroom form nodes
    @property(EditBox) private roomIdInput: EditBox = null!;
    @property(EditBox) private maxPlayersInput: EditBox = null!;
    // @property(Toggle) private isPrivateToggle: Toggle = null!;
    // @property(Node) private mapTypeNode: Node = null!;
    // @property(EditBox) private passwordInput: EditBox = null!;
    @property(Label) private CreateRoomErrorMsgInput: Label = null!;

    // login/ logout
    loginMode: string = 'login' // create/login
    @property(Node) private createNewAccountNode: Node = null!;
    @property(Node) private BackToLoginNode: Node = null!;
    @property(Label) private title: Label = null!;
    @property(EditBox) private usernameInput: EditBox = null!;
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
        ErrorOverlay.initErrorHandler()
        this.loadGameResources(() => {
            this.initGameLobby();
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

    initWebSocket() {
        this.ws = new WebSocket('ws://localhost:3001');

        this.ws.onopen = () => {
            console.log('lobby WebSocket 连接成功');
        };

        this.ws.onmessage = (event) => {
            const wsdata = JSON.parse(event.data)
            console.log('lobbyws', wsdata);
            if (wsdata.type === 'update-lobbies') {
                this.roomList = wsdata.data
                this.initRoomList(wsdata.data)
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket 连接关闭');
        };

        this.ws.onerror = (event) => {
            console.error('WebSocket 错误:', event);
        };
    }

    async initGameLobby() {
        const res = await this.getLobby()
        this.roomList = res
        this.initRoomList(res)
        this.initWebSocket();
        this.initUserInfo();
    }

    initUserInfo() {
        console.log(`当前用户：`, AuthManager.getUser())
        if (!AuthManager.isLoggedIn()) {
            // TODO: 提醒用户登录
            AuthManager.logout()
            this.setLogoutStatus()
            return
        }
        this.setLoginStatus()
    }

    // ——————————roomList CRUD——————————————————

    // RoomListColumnName = ['房间名', '房主' ,'当前房间玩家', '游戏状态', '是否为私密房间']

    initRoomList(roomList: []) {
        // TODO: 优化，现在是直接覆盖
        // console.log('initRoomList')
        if (!this.RoomListContainer) return
        this.RoomListContainer.destroyAllChildren();

        roomList.forEach((item: any) => {
            let newNode = instantiate(this.RoomListItem)
            newNode.active = true
            newNode.getChildByName('Info').getChildByName('RoomId').getComponent(Label).string = item.roomId
            newNode.getChildByName('Info').getChildByName('Player').getComponent(Label).string = `${item.players.length}/${item.maxPlayers}`
            newNode.getChildByName('Info').getChildByName('Status').getComponent(Label).string = item.status
            newNode.getChildByName('Info').getChildByName('Owner').getComponent(Label).string = item.owner.username
            newNode.getChildByName('Info').getChildByName('IsPrivate').getComponent(Label).string = item.isPrivate
            // TODO: 优化，name一般是用来给节点命名的
            newNode.name = item._id
            newNode.on(Node.EventType.TOUCH_END, () => this.clickRoom(item._id), this)
            this.RoomListContainer.addChild(newNode)
        })
    }

    // —————————————————————————————————————————

    clickRoom(id: string) {
        const unselColor = new Color(29, 177, 255, 50)
        const selColor = new Color(29, 177, 255, 150)
        if (this.room_id === id) {
            this.RoomListContainer.getChildByName(this.room_id).getChildByName('bg').getComponent(Sprite).color = unselColor;
            // this.RoomListContainer.getChildByName(this.room_id).getChildByName('highlight').active = false;
            this.room_id = null;
            return;
        }

        if (this.room_id) {
            this.RoomListContainer.getChildByName(this.room_id).getChildByName('bg').getComponent(Sprite).color = unselColor;
            // this.RoomListContainer.getChildByName(this.room_id).getChildByName('highlight').active = false;
        }
        this.room_id = id
        this.RoomListContainer.getChildByName(this.room_id).getChildByName('bg').getComponent(Sprite).color = selColor;
        // this.RoomListContainer.getChildByName(this.room_id).getChildByName('highlight').active = true;
    }

    // ————————————onclick事件函数———————————

    onClickDeleteRoom() {
        if (!this.room_id) {
            this.setGErrorMsg("请先选择房间")
            return
        }
        if (!AuthManager.isLoggedIn()) {
            this.setGErrorMsg("请先登录")
            return
        }
        ConfirmDialog.show(`确认要删除这个房间吗？`, `房间id: ${this.room_id}`, undefined, undefined,
            async () => {
                await this.deleteLobby(this.room_id)
                this.room_id = ""
            },
            undefined)
    }

    async onClickJoinRoom(e: Event) {
        if (!this.room_id) {
            this.setGErrorMsg("请先选择房间")
            return
        }
        if (!AuthManager.isLoggedIn()) {
            this.setGErrorMsg("请先登录")
            return
        }

        ConfirmDialog.show(undefined, `Are you sure you want to join this room?`, undefined, undefined,
            async () => {
                await this.enterRoom({ roomId: this.room_id })
                DataManager.instance.set('roomInfo', {
                    room_id: this.room_id
                });
                this.room_id = null
                director.loadScene('RoomScene')
            },
            undefined)
    }

    onClickCreateRoom(e: Event) {
        if (!AuthManager.isLoggedIn()) {
            this.setGErrorMsg("Please login.")
            return
        }
        this.node.getChildByName('CreateRoom').active = true
    }

    async onClickConfirmCreateRoom() {

        // get form data
        const roomId = Number(this.roomIdInput.string)
        const maxPlayers = Number(this.maxPlayersInput.string)

        // validate form
        if (!roomId) {
            this.CreateRoomErrorMsgInput.string = 'Room ID empty'
            return
        }

        const user = AuthManager.getUser()
        if (!user._id || !user.username) {
            this.CreateRoomErrorMsgInput.string = 'Userinfo Error'
            return
        }

        this.CreateRoomErrorMsgInput.string = ''

        const res = await this.postLobby({
            roomId,
            maxPlayers,
        })
        this.node.getChildByName('CreateRoom').active = false

        if (!res._id) return

        // 进入房间
        DataManager.instance.set('roomInfo', {
            room_id: res._id
        });
        director.loadScene('RoomScene')
    }

    onClickCancelCreateRoom() {
        this.node.getChildByName('CreateRoom').active = false
    }

    // TODO: 防抖
    onClickRefresh() {
        this.initGameLobby()
    }


    // ———————————————用户相关———————————————

    onClickLogIn() {
        this.node.getChildByName('LoginForm').active = true
    }

    // TODO: 错误处理
    // TODO: 成功处理
    async onClickConfirmLogIn() {
        console.log('确认登录/或者创建新账户', this.usernameInput.string, this.userPasswordInput.string,)
        // TODO： 前端做正则校验
        if (!this.usernameInput.string || !this.userPasswordInput.string) {
            this.loginErrorMsgInput.string = 'Username or password empty.'
            return
        }

        // 创建新用户
        if (this.loginMode === 'create') {
            const res = await this.createUser({
                username: this.usernameInput.string,
                password: this.userPasswordInput.string,
            })
            this.setGSuccessMsg("Create new user successfully, please login.")
            this.resetLoginForm()

        }

        // 登录用户
        else {
            const res = await this.login({
                username: this.usernameInput.string,
                password: this.userPasswordInput.string
            })
            if (!res.user || !res.expiresIn || !res.token) {
                this.setGErrorMsg("Failed to retrieve user data! Please check your network or log in again.")
                return
            }
            AuthManager.login(res)
            this.setLoginStatus()
            this.setGSuccessMsg("Login successful.")
            this.onClickCancelLogIn()
        }
    }

    onClickCancelLogIn() {
        this.node.getChildByName('LoginForm').active = false
        this.resetLoginForm()
    }

    onClickLogOut() {
        const callback = () => {
            AuthManager.logout()
            this.setLogoutStatus()
        }
        ConfirmDialog.show(undefined, `Are you sure you want to log out of this account?`, undefined, undefined, callback, undefined)
    }

    onClickCreateNewAccount() {
        this.title.string = 'Create New Account'
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
        this.usernameInput.string = ''
        this.userPasswordInput.string = ''
    }

    resetLoginForm() {
        this.title.string = 'Login'
        this.loginMode = 'login'
        this.createNewAccountNode.active = true
        this.BackToLoginNode.active = false
        this.resetLoginInput()
    }

    setLoginStatus() {
        const user = AuthManager.getUser()
        this.username.string = user.username
        this.loginBtn.active = false
        this.logoutBtn.active = true
    }

    setLogoutStatus() {
        this.username.string = "Guest"
        this.loginBtn.active = true
        this.logoutBtn.active = false
    }

    // —————————————————————————————————————


    // ————————————获取接口数据——————————————

    // TODO: 这里要连接上websocket，获取实时的room数据
    // 进入房间之后，就是拿到room数据对其进行修改

    async enterRoom(body: any): Promise<any> {
        return await fetchAPI('/game/enter', { method: 'POST', body });
    }

    async getLobby(): Promise<any> {
        return await fetchAPI('/lobbies');
    }

    async postLobby(body: any): Promise<any> {
        return await fetchAPI('/lobbies', { method: 'POST', body });
    }

    async deleteLobby(room_id: string): Promise<any> {
        return await fetchAPI(`/lobbies/${room_id}`, { method: 'DELETE' });
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
            if (!this.gErrorMsgLabel) return
            this.gErrorMsgLabel.string = ""
        }, 5000);
    }

    setGSuccessMsg(text: string) {
        this.gSuccessMsgLabel.string = text
        setTimeout(() => {
            if (!this.gSuccessMsgLabel) return
            this.gSuccessMsgLabel.string = ""
        }, 5000);
    }

    // —————————————————————————————————————
}
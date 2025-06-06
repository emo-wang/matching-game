import { _decorator, resources, SpriteFrame, director, Component, instantiate, Label, Color, Node, Sprite, EditBox } from 'cc';
import { ConfirmDialog } from './utils/prefabScirpts/confirmDialog';
import { Toast } from './utils/prefabScirpts/ToastPop';
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
    room_id: string = '' // 当前被选中的room_id

    // roomList
    @property(Node) private RoomListContainer: Node = null!
    @property(Node) private RoomListItem: Node = null!
    // @property(Node) private RoomListTitle: Node = null!

    // createroom form nodes
    // @property(EditBox) private roomIdInput: EditBox = null!;
    // @property(EditBox) private maxPlayersInput: EditBox = null!;

    // login/ logout
    loginMode: string = 'login' // create/login
    @property(Node) private createNewAccountNode: Node = null!;
    @property(Node) private BackToLoginNode: Node = null!;
    @property(Label) private title: Label = null!;
    @property(EditBox) private usernameInput: EditBox = null!;
    @property(EditBox) private userPasswordInput: EditBox = null!;
    // @property(Label) private loginErrorMsgInput: Label = null!;

    // user info
    @property(Label) private username: Label = null!;
    @property(Sprite) private avater: Sprite = null!;
    @property(Node) private loginBtn: Node = null!;
    @property(Node) private logoutBtn: Node = null!;

    // global msg
    @property(Node) private ToastPopNode: Node = null!


    onLoad() {
        // console.log(this.node, 'GameLobby 场景加载成功')
    }

    start() {
        this.initErrorHandler();
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

    closeWebSocket() {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
        this.ws = null;
    }

    initErrorHandler() {
        let node: any = document.getElementById('error');
        if (node) {
            node.remove();
            node = null;
        }
        const popup = document.querySelector('div[style*="z-index: 9999"]');
        if (popup) popup.remove();
        window.addEventListener('unhandledrejection', (event) => {
            this.ToastPopNode.getComponent(Toast)?.show((event.reason?.message || String(event.reason)), 2);
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

            switch (wsdata.type) {
                case 'update-lobbies':
                    this.roomList = wsdata.data;
                    this.initRoomList(wsdata.data);
                    break;

                case 'update-room':
                    // console.log(this)
                    for (let i = 0; i < this.roomList.length; i++) {
                        if (this.roomList[i]._id === wsdata.data._id) {
                            this.roomList[i] = wsdata.data
                        }
                    }
                    this.initRoomList(this.roomList)
                    break;
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


    initRoomList(roomList: any[]) {
        // TODO: 优化，现在是直接覆盖
        // console.log('initRoomList')
        if (!this.RoomListContainer) return
        this.RoomListContainer.destroyAllChildren();

        roomList.forEach((item: any) => {
            let newNode = instantiate(this.RoomListItem)
            newNode.active = true
            newNode.getChildByName('Info').getChildByName('RoomId').getComponent(Label).string = item.roomId
            newNode.getChildByName('Info').getChildByName('Player').getComponent(Label).string = `${item.players.length}/${item.config.maxPlayers}`
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
            this.ToastPopNode.getComponent(Toast)?.show("Please select a room.", 2);
            return
        }
        if (!AuthManager.isLoggedIn()) {
            this.ToastPopNode.getComponent(Toast)?.show("Please sign in first.", 2);
            return
        }
        ConfirmDialog.show(undefined, 'Are you sure you want to delete this room?', undefined, undefined,
            async () => {
                await this.deleteLobby(this.room_id)
                this.room_id = ""
            },
            undefined)
    }

    async onClickJoinRoom(e: Event) {

        const room = this.roomList.find((room) => room._id === this.room_id)
        if (!this.room_id || !room) {
            this.ToastPopNode.getComponent(Toast)?.show("Please select a room.", 2);
            return
        }

        if (!AuthManager.isLoggedIn()) {
            this.ToastPopNode.getComponent(Toast)?.show("Please sign in first.", 2);
            return
        }

        if (room.players.length >= room.config.maxPlayers) {
            this.ToastPopNode.getComponent(Toast)?.show("This room is full.", 2);
            return
        }

        ConfirmDialog.show(undefined, `Are you sure you want to join this room?`, undefined, undefined,
            async () => {
                await this.enterRoom({ roomId: this.room_id })
                DataManager.instance.set('roomInfo',
                    this.roomList.find(room => room._id === this.room_id)
                );
                this.room_id = null
                this.closeWebSocket()
                director.loadScene('RoomScene')
            },
            undefined)
    }

    onClickCreateRoom(e: Event) {
        if (!AuthManager.isLoggedIn()) {
            this.ToastPopNode.getComponent(Toast)?.show("Please sign in first.", 2);
            return
        }
        this.node.getChildByName('CreateRoom').active = true
    }

    async onClickConfirmCreateRoom() {

        const user = AuthManager.getUser()
        if (!user) {
            this.ToastPopNode.getComponent(Toast)?.show("Please sign in first.", 2);
        }


        const res = await this.postLobby({})
        this.node.getChildByName('CreateRoom').active = false

        if (!res._id) return

        // 进入房间
        DataManager.instance.set('roomInfo', res);
        this.closeWebSocket()
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

    async onClickConfirmLogIn() {
        console.log('确认登录/或者创建新账户', this.usernameInput.string, this.userPasswordInput.string,)

        if (!this.usernameInput.string || !this.userPasswordInput.string) {
            this.ToastPopNode.getComponent(Toast)?.show('Username or password empty.', 2);
            return
        }

        if (this.loginMode === 'create') {
            const res = await this.createUser({
                username: this.usernameInput.string,
                password: this.userPasswordInput.string,
            })
            this.ToastPopNode.getComponent(Toast)?.show("Create new user successfully, please login.", 2);
            this.resetLoginForm()

        }

        else {
            const res = await this.login({
                username: this.usernameInput.string,
                password: this.userPasswordInput.string
            })
            if (!res.user || !res.expiresIn || !res.token) {
                this.ToastPopNode.getComponent(Toast)?.show("Failed to retrieve user data! Please check your network or log in again.", 2);
                return
            }
            AuthManager.login(res)
            this.setLoginStatus()
            this.ToastPopNode.getComponent(Toast)?.show("Log in successful.", 2);
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
            this.ToastPopNode.getComponent(Toast)?.show("Log out successful", 2);
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
        // this.loginErrorMsgInput.string = ''
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

    setToastPopMsg(msg: string) {

    }

    // —————————————————————————————————————
}
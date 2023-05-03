import { SandboxPlayer } from "ZEPETO.Multiplay";
import { IModule } from "../IModule";
import {sVector3, sQuaternion, SyncTransform, PlayerAdditionalValue, ZepetoAnimationParam, EquipData} from "ZEPETO.Multiplay.Schema";
import { DataStorage } from "ZEPETO.Multiplay.DataStorage";

export default class SyncComponentModule extends IModule {
    private sessionIdQueue: string[] = [];
    private instantiateObjCaches : InstantiateObj[] = [];
    private masterClient: Function = (): SandboxPlayer | undefined => this.server.loadPlayer(this.sessionIdQueue[0]);

    async OnCreate() {
        /**Zepeto Player Sync**/
        this.server.onMessage(MESSAGE.SyncPlayer, (client, message) => {
            const player = this.server.state.players.get(client.sessionId);
            if (player) {
                const animationParam = new ZepetoAnimationParam();
                player.animationParam = Object.assign(animationParam, message.animationParam);
                player.gestureName = message.gestureName ?? null;

                if (message.playerAdditionalValue) {
                    const pAdditionalValue = new PlayerAdditionalValue();
                    player.playerAdditionalValue = Object.assign(pAdditionalValue, message.playerAdditionalValue);
                }
            }
        });

        /**Transform Sync**/
        this.server.onMessage(MESSAGE.SyncTransform, (client, message) => {
            const { Id, position, localPosition, rotation, scale, sendTime } = message;
            let syncTransform = this.server.state.SyncTransforms.get(Id.toString());

            if (!syncTransform) {
                syncTransform = new SyncTransform();
                this.server.state.SyncTransforms.set(Id.toString(), syncTransform);
            }

            Object.assign(syncTransform.position, position);
            Object.assign(syncTransform.localPosition, localPosition);
            Object.assign(syncTransform.rotation, rotation);
            Object.assign(syncTransform.scale, scale);
            syncTransform.sendTime = sendTime;
        });

        this.server.onMessage(MESSAGE.SyncTransformStatus, (client, message) => {
            const syncTransform = this.server.state.SyncTransforms.get(message.Id);
            if(syncTransform !== undefined) {
                syncTransform.status = message.Status;
            }
        });

        /** Sync Animaotr **/
        this.server.onMessage(MESSAGE.SyncAnimator, (client, message) => {
            const animator: SyncAnimator = {
                Id: message.Id,
                clipNameHash: message.clipNameHash,
                clipNormalizedTime: message.clipNormalizedTime,
            };
            const masterClient = this.masterClient();
            if (masterClient !== null && masterClient !== undefined) {
                this.server.broadcast(MESSAGE.ResponseAnimator + message.Id, animator, {except: masterClient});
            }
        });

        /** SyncTransform Util **/
        this.server.onMessage(MESSAGE.ChangeOwner, (client,message:string) => {
            this.server.broadcast(MESSAGE.ChangeOwner+message, client.sessionId);
        });
        this.server.onMessage(MESSAGE.Instantiate, (client,message:InstantiateObj) => {
            const InstantiateObj: InstantiateObj = {
                Id: message.Id,
                prefabName: message.prefabName,
                ownerSessionId: message.ownerSessionId,
                spawnPosition: message.spawnPosition,
                spawnRotation: message.spawnRotation,
            };
            this.instantiateObjCaches.push(InstantiateObj);
            this.server.broadcast(MESSAGE.Instantiate, InstantiateObj);
        });

        this.server.onMessage(MESSAGE.RequestInstantiateCache, (client) => {
            for (const obj of this.instantiateObjCaches) {
                client.send(MESSAGE.Instantiate, obj);
            }
        });

        /**SyncDOTween**/
        this.server.onMessage(MESSAGE.SyncDOTween, (client, message: syncTween) => {
            const tween: syncTween = {
                Id: message.Id,
                position: message.position,
                nextIndex: message.nextIndex,
                loopCount: message.loopCount,
                sendTime: message.sendTime,
            };
            const masterClient = this.masterClient();
            if (masterClient !== null && masterClient !== undefined) {
                this.server.broadcast(MESSAGE.ResponsePosition + message.Id, tween, {except: masterClient});
            }
        });

        /**Common**/
        this.server.onMessage(MESSAGE.CheckServerTimeRequest, (client, message) => {
            let Timestamp = +new Date();
            client.send(MESSAGE.CheckServerTimeResponse, Timestamp);
        });
        this.server.onMessage(MESSAGE.CheckMaster, (client, message) => {
            console.log(`master->, ${this.sessionIdQueue[0]}`);
            this.server.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
        });
        this.server.onMessage(MESSAGE.PauseUser, (client) => {
            if(this.sessionIdQueue.includes(client.sessionId)) {
                const pausePlayerIndex = this.sessionIdQueue.indexOf(client.sessionId);
                this.sessionIdQueue.splice(pausePlayerIndex, 1);

                if (pausePlayerIndex == 0) {
                    console.log(`master->, ${this.sessionIdQueue[0]}`);
                    this.server.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
                }
            }
        });
        this.server.onMessage(MESSAGE.UnPauseUser, (client) => {
            if(!this.sessionIdQueue.includes(client.sessionId)) {
                this.sessionIdQueue.push(client.sessionId);
                this.server.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
            }
        });

        /** Sample Code **/
        this.server.onMessage(MESSAGE.BlockEnter, (client,transformId:string) => {
            this.server.broadcast(MESSAGE.BlockEnter+transformId, client.sessionId);
        });
        this.server.onMessage(MESSAGE.BlockExit, (client,transformId:string) => {
            this.server.broadcast(MESSAGE.BlockExit+transformId, client.sessionId);
        });
        this.server.onMessage(MESSAGE.SendBlockEnterCache, (client,blockCache) => {
            this.server.loadPlayer(blockCache.newJoinSessionId)?.send(MESSAGE.BlockEnter+blockCache.transformId, client.sessionId);
        });

        this.server.onMessage(MESSAGE.CoinAcquired, (client,transformId:string) => {
            this.masterClient()?.send(MESSAGE.CoinAcquired+transformId, client.sessionId);
        });
        
        this.server.onMessage(MESSAGE.ChairSit, (client: SandboxPlayer, message) => {
            const chairMsg :syncChair = {
                chairId : message.chairId,
                OwnerSessionId : client.sessionId,
                onOff: !message.isSit,
            };
            const msg = message.isSit ? MESSAGE.ChairSitDown : MESSAGE.ChairSitUp;
            this.server.broadcast(msg, chairMsg);
            // this.broadcast(msg, chairMsg, {except: client});
            // client.send(msg, chairMsg);
        });
        
        this.server.onMessage(MESSAGE.Equip, (client: SandboxPlayer, message) => {
            let msg = MESSAGE.Equip;
            const equipData:EquipData = new EquipData();
            equipData.sessionId = client.sessionId;
            equipData.itemName = message.name;
            equipData.bone = message.attach;
            equipData.key = client.sessionId +"_"+ message.attach;
            if(this.server.state.equipDatas.has(equipData.key)) {
                const prevData = this.server.state.equipDatas.get(equipData.key);
                if(prevData.sessionId == client.sessionId) {
                    equipData.prevItemName = prevData.itemName;
                    msg = MESSAGE.EquipChange;
                }
            }
            this.server.state.equipDatas.set(equipData.key, equipData);
            client.send(msg, equipData);
        });
        
        this.server.onMessage(MESSAGE.Unequip, (client: SandboxPlayer, message) => {
            const equipData:EquipData = new EquipData();
            equipData.sessionId = client.sessionId;
            equipData.itemName = null;
            equipData.bone = message.attach;
            equipData.key = client.sessionId +"_"+ message.attach;
            if(this.server.state.equipDatas.has(equipData.key)) {
                const prevData = this.server.state.equipDatas.get(equipData.key);
                if(prevData.sessionId == client.sessionId) {
                    equipData.prevItemName = prevData.itemName;
                }
            }
            this.server.state.equipDatas.delete(equipData.key);
            client.send(MESSAGE.Unequip, equipData);
        });

        /** Racing Game **/
        let isStartGame:boolean = false;
        let startServerTime:number;
        this.server.onMessage(MESSAGE.StartRunningRequest, (client) => {
            if(!isStartGame) {
                isStartGame = true;
                startServerTime = +new Date();

                this.server.broadcast(MESSAGE.CountDownStart, startServerTime);
            }
        });
        this.server.onMessage(MESSAGE.FinishPlayer, (client,finishTime:number) => {
            let playerLapTime = (finishTime-startServerTime)/1000;
            console.log(`${client.sessionId}is enter! ${playerLapTime}`);
            const gameReport: GameReport = {
                playerUserId: client.userId,
                playerLapTime: playerLapTime,
            };
            this.server.broadcast(MESSAGE.ResponseGameReport, gameReport);
            if(isStartGame) {
                isStartGame = false;
                let gameEndTime:number = +new Date();
                this.server.broadcast(MESSAGE.FirstPlayerGetIn, gameEndTime);
            }
        });
    }

    async OnJoin(client: SandboxPlayer) {
        if(!this.sessionIdQueue.includes(client.sessionId)) {
            this.sessionIdQueue.push(client.sessionId.toString());
        }
    }
    
    async OnJoined(client: SandboxPlayer) {
        /* get player */
        const players = this.server.state.players;
        const player = players.get(client.sessionId);

        /* load storage */
        const storage: DataStorage = client.loadDataStorage();

        /* Visit Count */
        let visit_cnt = await storage.get("VisitCount") as number;
        if (visit_cnt == null) visit_cnt = 0;
        player.visit = visit_cnt;
        await storage.set("VisitCount", ++visit_cnt);
        console.log(`[OnJoin] ${client.sessionId}'s visiting count : ${visit_cnt}`)

        /* onJoined End */
        this.server.state.players.set(client.sessionId, player);
    }

    async OnLeave(client: SandboxPlayer) {
        const player = this.server.state.players.get(client.sessionId);

        /* Visit Count */ 
        if(player) { // Sample code : Not worked
            console.log(`[onLeave] ${client.sessionId}'s visiting count : ${player.visit}`)
            await client.loadDataStorage().set("VisitCount", player.visit);
        }
        
        if(this.sessionIdQueue.includes(client.sessionId)) {
            const leavePlayerIndex = this.sessionIdQueue.indexOf(client.sessionId);
            this.sessionIdQueue.splice(leavePlayerIndex, 1);
            if (leavePlayerIndex == 0) {
                console.log(`master->, ${this.sessionIdQueue[0]}`);
                this.server.broadcast(MESSAGE.MasterResponse, this.sessionIdQueue[0]);
            }
        }
    }

    OnTick(deltaTime: number) {
    }
}
interface syncTween {
    Id: string,
    position: sVector3,
    nextIndex: number,
    loopCount: number,
    sendTime: number,
}

interface SyncAnimator {
    Id: string,
    clipNameHash: number,
    clipNormalizedTime: number,
}

interface InstantiateObj{
    Id:string;
    prefabName:string;
    ownerSessionId?:string;
    spawnPosition?:sVector3;
    spawnRotation?:sQuaternion;
}

/* Chair */
interface syncChair {
    chairId: string,
    OwnerSessionId: string,
    onOff: boolean,
}

/** racing game **/
interface GameReport{
    playerUserId : string;
    playerLapTime : number;
}

enum MESSAGE {
    SyncPlayer = "SyncPlayer",
    SyncTransform = "SyncTransform",
    SyncTransformStatus = "SyncTransformStatus",
    SyncAnimator = "SyncAnimator",
    ResponseAnimator = "ResponseAnimator",
    ChangeOwner = "ChangeOwner",
    Instantiate = "Instantiate",
    RequestInstantiateCache = "RequestInstantiateCache",
    ResponsePosition = "ResponsePosition",
    SyncDOTween = "SyncDOTween",
    CheckServerTimeRequest = "CheckServerTimeRequest",
    CheckServerTimeResponse = "CheckServerTimeResponse",
    CheckMaster = "CheckMaster",
    MasterResponse = "MasterResponse",
    PauseUser = "PauseUser",
    UnPauseUser = "UnPauseUser",

    /** Sample Code **/
    BlockEnter = "BlockEnter",
    BlockExit = "BlockExit",
    SendBlockEnterCache = "SendBlockEnterCache",
    CoinAcquired = "CoinAcquired",

    ChairSit = "ChairSit",
    ChairSitDown = "ChairSitDown",
    ChairSitUp = "ChairSitUp",

    Equip = "Equip",
    EquipChange = "EquipChange",
    Unequip = "Unequip",

    /** Racing Game **/
    StartRunningRequest = "StartRunningRequest",
    FinishPlayer = "FinishPlayer",
    FirstPlayerGetIn = "FirstPlayerGetIn",
    CountDownStart = "CountDownStart",
    ResponseGameReport = "ResponseGameReport",
}

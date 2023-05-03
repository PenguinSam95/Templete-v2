import { BoxCollider, Camera, GameObject, HumanBodyBones, MeshRenderer, Quaternion, Transform, WaitForSeconds } from 'UnityEngine';
import { Button } from 'UnityEngine.UI';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { Player } from 'ZEPETO.Multiplay.Schema';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import SyncIndexManager from '../Common/SyncIndexManager';
import DOTWeenSyncHelper from '../DOTween/DOTWeenSyncHelper';
import PlayerSync from '../Player/PlayerSync';
import ChairSit from '../Sample Code/ChairSit';
import LookAt from '../Sample Code/LookAt';
import AnimatorSyncHelper from '../Transform/AnimatorSyncHelper';
import TransformSyncHelper from '../Transform/TransformSyncHelper';
import UIManager, { LoadingType } from './UIManager';

export default class GameManager extends ZepetoScriptBehaviour {

    /* Singleton */
    private static _instance: GameManager = null;
    public static get instance(): GameManager {
        if (this._instance === null) {
            this._instance = GameObject.FindObjectOfType<GameManager>();
            if (this._instance === null) {
                this._instance = new GameObject(GameManager.name).AddComponent<GameManager>();
            }
        }
        return this._instance;
    }

    /* GameManagers Default Properties */
    public multiplay: ZepetoWorldMultiplay;
    public room: Room;
    private animatorSyncHelpers: AnimatorSyncHelper[] = [];
    private transformSyncs: TransformSyncHelper[] = [];
    private doTWeenSyncs: DOTWeenSyncHelper[] = [];
    private player: Player;

    private Awake() {
        if (GameManager._instance !== null && GameManager._instance !== this) {
            GameObject.Destroy(this.gameObject);
        } else {
            GameManager._instance = this;
            GameObject.DontDestroyOnLoad(this.gameObject);
        }
    }

    Start() {
        if(!this.multiplay)
            this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
        }
        this.StartCoroutine(this.StartLoading());

        // this.animatorSyncHelpers = GameObject.FindObjectsOfType<AnimatorSyncHelper>();
        // this.animatorSyncHelpers.sort();
        // for(const anim of this.animatorSyncHelpers) {
        //     SyncIndexManager.SyncIndex++;
        //     anim.RemoteStart(SyncIndexManager.SyncIndex.toString());
        // }
        this.transformSyncs = GameObject.FindObjectsOfType<TransformSyncHelper>();
        this.transformSyncs.sort();
        for(const trans of this.transformSyncs) {
            SyncIndexManager.SyncIndex++;
            trans.RemoteStart(SyncIndexManager.SyncIndex.toString());
        }
        this.doTWeenSyncs = GameObject.FindObjectsOfType<DOTWeenSyncHelper>();
        this.doTWeenSyncs.sort();
        for(const dot of this.doTWeenSyncs) {
            SyncIndexManager.SyncIndex++;
            dot.RemoteStart(SyncIndexManager.SyncIndex.toString());
        }
    }

    /* Start Loading */
    private * StartLoading()
    {
        const loadingUI = UIManager.instance.FindLoadingImage(LoadingType.Start);
        if(!loadingUI) return;
        let isLoading = true;
        loadingUI.SetActive(true);
        ZepetoPlayers.instance.controllerData.inputAsset.Disable();
        const wait = new WaitForSeconds(2);
        while (isLoading) {
            yield wait;
            if (this.room != null && this.room.IsConnected) {
                if (ZepetoPlayers.instance.HasPlayer(this.room.SessionId)) {
                    isLoading = false;
                    loadingUI.SetActive(false);
                    ZepetoPlayers.instance.controllerData.inputAsset.Enable();
                    this.StopCoroutine(this.StartLoading());
                }
            }
        }
    }

    /* Raycast Button Start */
    SwitchButtonScript(btn : Transform) {
        let serverSender = "Log";
        let lookAt = btn.GetComponentInChildren<LookAt>();
        if(!lookAt) {
            lookAt = btn.GetComponentInParent<LookAt>();
            console.log(lookAt, lookAt==null);
            if(!lookAt) return;
        }
        const buttonType = lookAt.buttonType;
        const target = lookAt.scriptTarget;
        const data = new RoomData();
        switch (+buttonType){
            case ButtonType.Chair:
                const chairSit = target.GetComponent<ChairSit>();
                if(!chairSit) return;
                data.Add("isSit", true);
                data.Add("chairId", chairSit.Id);
                serverSender = MESSAGE.ChairSit;
                this.room.Send(serverSender, data.GetObject());
                break;

            default :
                console.error(`타입이 설정되지 않은 버튼이 있습니다. ${btn.name}`)
                break;
        }
        // this.room.Send(serverSender, data.GetObject());
    }

    PlayerSitOut(chair : Transform, player : PlayerSync) {
        const chairSit = chair.GetComponent<ChairSit>();
        if(!chairSit) return;
        const data = new RoomData();
        data.Add("isSit", false);
        data.Add("chairId", chairSit.Id);
        this.room.Send("ChairSit", data.GetObject());
    }
    
    /* Get Local Player */
    public SetLocalPlayer(player:Player) {
        this.player = player;
    }
}

export enum ButtonType {
    NULL = -1,
    Chair,
    EquipHead, EquipRightHand, EquipLeftHand, EquipBody,
}

export enum MESSAGE {
    ChairSit = "ChairSit",
}
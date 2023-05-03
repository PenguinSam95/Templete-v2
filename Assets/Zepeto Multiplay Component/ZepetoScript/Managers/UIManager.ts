import { GameObject, Transform } from 'UnityEngine';
import { Button, Image, Text } from 'UnityEngine.UI';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import SyncIndexManager from '../Common/SyncIndexManager';
import GameManager from './GameManager';

export default class UIManager extends ZepetoScriptBehaviour {

    /* UIManagers Default Properties */
    @Header("UI Manager Field")
    @SerializeField() public canvas: GameObject;
    private loadingUIs: GameObject[];
    private openUI: GameObject;
    private isPlaying: boolean;
    private isLoading: boolean;
    public multiplay: ZepetoWorldMultiplay;
    public room: Room;

    /* Singleton */
    private static _instance: UIManager = null;
    public static get instance(): UIManager {
        if (this._instance === null) {
            this._instance = GameObject.FindObjectOfType<UIManager>();
            if (this._instance === null) {
                this._instance = new GameObject(UIManager.name).AddComponent<UIManager>();
            }
        }
        return this._instance;
    }

    private Awake() {
        if (UIManager._instance !== null && UIManager._instance !== this) {
            GameObject.Destroy(this.gameObject);
        } else {
            UIManager._instance = this;
            GameObject.DontDestroyOnLoad(this.gameObject);
        }

        const images = this.canvas.GetComponentsInChildren<Image>();
        this.loadingUIs = new Array<GameObject>();
        
        for(const img of images) {
            switch(img.tag) {
                case "Loading": 
                    this.loadingUIs.push(img.gameObject);
                    img.gameObject.SetActive(false);
                    break;
            }
        }
    }

    Start() {
        if(!this.multiplay)
            this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
        }
    }

    /* Find GameObject */ 
    FindLoadingImage(type:LoadingType) : GameObject {
        const tName :string = type.toString();
        for (const item of this.loadingUIs) {
            if(item.name == tName)
                return item;
        }
        return null;
    }
}

export enum LoadingType {
    Start = "UI_Loarding_Start",
    Teleport = "UI_Loarding_Teleport",
    NONE = "",
}
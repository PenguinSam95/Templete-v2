import { GameObject } from 'UnityEngine';
import { Image } from 'UnityEngine.UI';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export enum LoadingType {
    Start = "UI_Loarding_Start",
    Teleport = "UI_Loarding_Teleport",
    NONE = "",
}
export default class UIManager extends ZepetoScriptBehaviour {

    /* Property */
    @SerializeField() public canvas : GameObject;
    private loadingUIs : GameObject[];
    private openUI:GameObject;
    private isPlaying : boolean;
    private isLoading : boolean;

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
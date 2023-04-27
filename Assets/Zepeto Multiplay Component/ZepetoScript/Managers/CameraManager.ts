import { Camera, GameObject, Input, LayerMask, Mathf, Physics, RaycastHit } from 'UnityEngine';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import GameManager from './GameManager';

export default class CameraManager extends ZepetoScriptBehaviour {

    /* Property */
    private layer_btn : number;
    public multiplay : ZepetoWorldMultiplay;

    Start() {
        if(!this.multiplay)
            this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();

        this.layer_btn = 1 << LayerMask.NameToLayer("Button");
    }

    /* Raycasting */
    Update() {
        if (this.multiplay.Room != null && this.multiplay.Room.IsConnected) {
            const hasPlayer = ZepetoPlayers.instance.HasPlayer(this.multiplay.Room.SessionId);
            if (hasPlayer) {
                this.Raycasting();
            }
        }
    }

    Raycasting() {
        if(Input.GetMouseButtonUp(0)) {
            const ray = ZepetoPlayers.instance.ZepetoCamera.camera.ScreenPointToRay(Input.mousePosition);
            const hitInfo = $ref<RaycastHit>();
            // if(Physics.Raycast(ray, hitInfo, Mathf.Infinity, this.layer_btn)) {
            //     console.log(`${hitInfo.value.transform.name} ${hitInfo.value.transform.gameObject.layer} ${this.layer_btn}`);
            //     GameManager.instance.SwitchButtonScript(hitInfo.value.transform);
            // }
            if(Physics.SphereCast(ray, 0.5, hitInfo, Mathf.Infinity, this.layer_btn)) {
                console.log(`${hitInfo.value.transform.name} ${hitInfo.value.transform.gameObject.layer} ${this.layer_btn}`);
                GameManager.instance.SwitchButtonScript(hitInfo.value.transform);
            }
        }
    }
}